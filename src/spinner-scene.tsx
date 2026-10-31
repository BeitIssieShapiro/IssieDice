import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { GestureResponderEvent } from "react-native";
import {
    FilamentView,
    DefaultLight,
    Float3,
    RenderCallback,
    useFilamentContext,
    useModel,
    ModelRenderer,
    getAssetFromModel,
    useBuffer,
    EntitySelector,
} from "react-native-filament";
import { useSharedValue } from "react-native-worklets-core";
import { DefaultSpinnerColor, isStaticDie, Profile, Templates, templatesList } from "./models";
import { computeFloorBounds, darkenHexColor, hexToSrgb, safeColor, WinSize } from "./utils";
import { playAudio, playBundledAudio, playMusic, stopMusic } from "./audio";
import { CollisionSounds, getAssetLocalPath, Sounds } from "./assets";
import { cameraHeight, computeDiceScale, DiceSceneMethods, focalLength, fov, quaternionToAngleAxis } from "./diceScene";
import { computeVisibleFloorBounds, SpinnerSim } from "./spinner-sim";
import { SpinnerHandleTop, SpinnerTipY } from "./scene-elements";
import { boxCorners, FloorModel, FloorTileSize, shadowDirection, shadowPlacement, ShadowModel, toLinear } from "./table-elements";

export const SpinnerModel = { uri: getAssetLocalPath("spinner.glb", true) };
// a photo studio's cove around the camera's target, so the side view looks like a room
// (see design-resources/generate-backdrop-glb.js) - turning with the camera, so it is always behind
const BackdropModel = { uri: getAssetLocalPath("backdrop.glb", true) };
const BackdropTopShade = 0.35;  // the wall's top color, times the table's color - also above it
// points of the spinner casting its shadow (physics units, local): the body's corners, the tip and the handle's top
const ShadowPoints: Float3[] = [...boxCorners(0.9, 1, 0.9), [0, SpinnerTipY, 0], [0, SpinnerHandleTop, 0]];

// While spinning, the camera looks at the spinner from south-south-west (south is the bottom of the screen,
// west is left). Once it falls, the camera slowly moves up to look at it from the top.
const SpinElevation = 20 * Math.PI / 180;  // above the floor
const TopElevation = 90 * Math.PI / 180;   // straight from the top
const CameraAzimuth = 22.5 * Math.PI / 180;  // from south towards west
const ToTopDuration = 1.5;      // sec
const ToSpinDuration = 0.6;     // sec - while the spinner stands up (see RiseDuration in spinner-sim.ts)
function cameraPosition(elevation: number): Float3 {
    "worklet"
    return [
        -Math.sin(CameraAzimuth) * Math.cos(elevation) * cameraHeight,
        Math.sin(elevation) * cameraHeight,
        -Math.cos(CameraAzimuth) * Math.cos(elevation) * cameraHeight,
    ];
}
// the camera's horizontal view direction (the top of the screen) is +z rotated by this
const ViewYaw = CameraAzimuth;
// the camera's up vector - the top of the screen, also when looking straight down
const CameraUp: Float3 = [Math.sin(ViewYaw), 0, Math.cos(ViewYaw)];
// the light, of the default top view - in the floor's own frame (so it turns with the floor)
const ShadowDir = shadowDirection(CameraUp);
// Once settled, the camera turns around the spinner (with the floor) to show its face upright
const TurnDuration = 1.2;      // sec

// the camera's turn (yaw) around the vertical axis through its target (tx, tz), and the floor's placement,
// all in physics units
interface ViewState {
    yaw: number;
    tx: number;
    tz: number;
    floorYaw: number;
    fx: number;
    fz: number;
}

/** (x, z) rotated by `angle` around the up axis */
function rotateY(x: number, z: number, angle: number): [number, number] {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [x * c + z * s, -x * s + z * c];
}

function easeInOut(t: number) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}



// the spinner model's primitives (see design-resources/generate-spinner-glb.js): faces, body, handle
const SpinnerBodyPrimitive = 1;
const SpinnerHandlePrimitive = 2;

interface SpinnerSceneProps {
    profile: Profile;
    windowSize: WinSize;
    freeze: boolean;
    setInRecovery: (inRecovery: boolean) => void;
}

interface SpinnerRotation {
    angle: number;
    axis: Float3
}

/**
 * A single spinner (sevivon) using the faces 1-4 of the profile's spinner template.
 * Exposes the same methods as DiceScene so App can use either.
 */
export const SpinnerScene = forwardRef(({ profile, windowSize, freeze, setInRecovery }: SpinnerSceneProps, ref: any) => {
    const [currWindowSize, setCurrWindowSize] = useState<WinSize>(windowSize);
    const [currProfile, setCurrProfile] = useState<Profile>(profile);
    // true while something moves (or briefly after a change), to keep the render callback active
    const [active, setActive] = useState<boolean>(true);
    const { renderableManager, transformManager, view, camera } = useFilamentContext();

    const simRef = useRef<SpinnerSim>(undefined);
    if (!simRef.current) {
        simRef.current = new SpinnerSim();
    }
    const sim = simRef.current;

    const model = useModel(SpinnerModel);
    const entity = getAssetFromModel(model)?.getRenderableEntities()[0];
    if (entity) {
        renderableManager.setCastShadow(entity, true);
        renderableManager.setReceiveShadow(entity, true);
    }
    const floorModel = useModel(FloorModel);
    const floorEntity = getAssetFromModel(floorModel)?.getRenderableEntities()[0];
    const backdropModel = useModel(BackdropModel);
    const backdropEntity = getAssetFromModel(backdropModel)?.getRenderableEntities()[0];
    const shadowModel = useModel(ShadowModel);
    const shadowEntity = getAssetFromModel(shadowModel)?.getRenderableEntities()[0];

    const scale = computeDiceScale(currWindowSize, currProfile.size);
    // the floor is at y = -1 in physics units, i.e. -scale in world units.
    // The spinner should be visible from both camera angles.
    const aspect = currWindowSize.width / currWindowSize.height;
    const baseBounds = computeFloorBounds(currWindowSize, cameraHeight, fov, 0);
    const spinBounds = computeVisibleFloorBounds(cameraPosition(SpinElevation), fov, aspect, -scale, baseBounds);
    const topBounds = computeVisibleFloorBounds(cameraPosition(TopElevation), fov, aspect, -scale, baseBounds);
    const bounds = {
        left: Math.max(spinBounds.left, topBounds.left),
        right: Math.min(spinBounds.right, topBounds.right),
        bottom: Math.max(spinBounds.bottom, topBounds.bottom),
        top: Math.min(spinBounds.top, topBounds.top),
    };

    // the spinner's pose with the camera's turn - in one value, so they always change together on screen
    const frame = useSharedValue<{ position: Float3, rotation: SpinnerRotation, view: ViewState }>({
        position: [0, 0, 0], rotation: { angle: 0, axis: [1, 0, 0] },
        view: { yaw: 0, tx: 0, tz: 0, floorYaw: 0, fx: 0, fz: 0 },
    });
    const scaleShared = useSharedValue<number>(scale);
    const elevation = useSharedValue<number>(TopElevation);
    const prevAspectRatio = useSharedValue<number>(0);
    // camera move: from the elevation at start, to the target (spin / top, by the spinner's phase)
    const cameraMoveRef = useRef({ from: TopElevation, to: TopElevation, start: 0, duration: 0 });
    const viewRef = useRef<ViewState>({ yaw: 0, tx: 0, tz: 0, floorYaw: 0, fx: 0, fz: 0 });
    // the camera's turn around the settled spinner - to (yaw, tx, tz)
    const turnRef = useRef<{ start: number, yaw: number, tx: number, tz: number } | undefined>(undefined);

    const freezeTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    // locked from the start of a spin until recoveryTime seconds after the spinner rests
    const lockedRef = useRef<boolean>(false);
    const inRecoveryRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const syncPose = useCallback(() => {
        const { x, y, z } = sim.body.position;
        frame.value = { position: [x, y, z], rotation: quaternionToAngleAxis(sim.body.quaternion), view: viewRef.current };
    }, [sim]);

    const updateCamera = useCallback((now: number) => {
        const move = cameraMoveRef.current;
        const to = sim.phase == "rising" || sim.phase == "spinning" ? SpinElevation : TopElevation;
        if (to != move.to) {
            move.from = elevation.value;
            move.to = to;
            move.start = now;
            move.duration = to == TopElevation ? ToTopDuration : ToSpinDuration;
        }
        const t = move.duration > 0 ? Math.min(1, (now - move.start) / 1000 / move.duration) : 1;
        elevation.value = move.from + (move.to - move.from) * easeInOut(t);

        if (!turnRef.current && sim.phase == "idle" && sim.viewTurn != 0) {
            const { x, z } = sim.body.position;
            turnRef.current = { start: now, yaw: sim.viewTurn, tx: x, tz: z };
        }
        const turn = turnRef.current;
        if (turn) {
            const e = easeInOut(Math.min(1, (now - turn.start) / 1000 / TurnDuration));
            viewRef.current = { ...viewRef.current, yaw: turn.yaw * e, tx: turn.tx * e, tz: turn.tz * e };
            if (e >= 1) {
                endTurn();
            } else {
                syncPose();
            }
        }
        return t >= 1 && !turnRef.current;
    }, [sim]);

    // The camera turned around the spinner (all the way, or part of it when a spin starts on the way): move the
    // spinner and the floor to where they are seen from the camera's default view, and put the camera back
    // there - nothing changes on screen
    const endTurn = useCallback(() => {
        if (!turnRef.current) return;
        turnRef.current = undefined;
        const v = viewRef.current;
        sim.applyViewTurn(v.yaw, v.tx, v.tz);

        const floorYaw = v.floorYaw - v.yaw;
        const [fx, fz] = rotateY(v.fx - v.tx, v.fz - v.tz, -v.yaw);
        // keep the floor's offset small - moving it by whole texture tiles is not seen
        const [lx, lz] = rotateY(fx, fz, -floorYaw).map(c => c - FloorTileSize * Math.round(c / FloorTileSize));
        const [wx, wz] = rotateY(lx, lz, floorYaw);
        viewRef.current = { yaw: 0, tx: 0, tz: 0, floorYaw: floorYaw % (2 * Math.PI), fx: wx, fz: wz };
        syncPose();
    }, [sim]);

    // render a few frames, then stop rendering until something moves again
    const renderBriefly = useCallback(() => {
        syncPose();
        setActive(true);
        if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
        const stopWhenStill = () => {
            freezeTimerRef.current = setTimeout(() => {
                freezeTimerRef.current = undefined;
                if (sim.phase != "idle") return;
                if (updateCamera(performance.now())) {
                    setActive(false);
                } else {
                    // the camera still moves
                    stopWhenStill();
                }
            }, 200);
        };
        stopWhenStill();
    }, [sim]);

    useEffect(() => {
        scaleShared.value = scale;
        sim.setViewYaw(ViewYaw);
        sim.setBounds({
            left: bounds.left / scale,
            right: bounds.right / scale,
            bottom: bounds.bottom / scale,
            top: bounds.top / scale,
        });
        renderBriefly();
    }, [currWindowSize, currProfile.size]);

    useEffect(() => {
        // dots and colors read the same at any angle
        const template = currProfile.spinnerDie.template;
        sim.turnToReadable = template != Templates.Dots && template != Templates.Colors;
        sim.onSettled = () => {
            if (lockedRef.current && !inRecoveryRef.current) {
                inRecoveryRef.current = setTimeout(() => {
                    ref.current?.resetRecovery();
                }, currProfile.recoveryTime * 1000);
            }
            stopMusic();
            syncPose();
            renderBriefly();
        };
        let lastTime = -1;
        sim.onCollide = (impactVelocity) => {
            if (!currProfile.soundEnabled) return;
            if (impactVelocity >= 2 && (lastTime < 0 || performance.now() - lastTime > 100)) {
                lastTime = performance.now();
                playBundledAudio(CollisionSounds[Math.floor(Math.random() * CollisionSounds.length)], Math.min(1, impactVelocity / 10));
            }
        };
    }, [sim, currProfile]);

    useEffect(() => {
        if (!floorEntity) return;
        // the floor's texture is nearly white - it takes the table's color
        renderableManager.getMaterialInstanceAt(floorEntity, 0)
            .setFloat4Parameter("baseColorFactor", toLinear(hexToSrgb(safeColor(currProfile.tableColor)).slice(0, 3)));
        renderBriefly();
    }, [floorEntity, currProfile.tableColor]);

    useEffect(() => {
        if (!backdropEntity) return;
        // darkened by its vertex colors
        const color = toLinear(hexToSrgb(safeColor(currProfile.tableColor)).slice(0, 3));
        for (let i = 0; i < 2; i++) {
            renderableManager.getMaterialInstanceAt(backdropEntity, i).setFloat4Parameter("baseColorFactor", color);
        }
        renderBriefly();
    }, [backdropEntity, currProfile.tableColor]);

    useEffect(() => {
        if (!entity) return;
        renderableManager.getMaterialInstanceAt(entity, SpinnerBodyPrimitive)
            .setFloat4Parameter("baseColorFactor", toLinear(hexToSrgb(currProfile.spinnerColor ?? DefaultSpinnerColor).slice(0, 3)));
        renderableManager.getMaterialInstanceAt(entity, SpinnerHandlePrimitive)
            .setFloat4Parameter("baseColorFactor", toLinear(hexToSrgb(currProfile.spinnerHandleColor ?? DefaultSpinnerColor).slice(0, 3)));
        renderBriefly();
    }, [entity, currProfile.spinnerColor, currProfile.spinnerHandleColor]);

    // stop the music when the settings open, the music is turned off, or the spinner goes away
    useEffect(() => {
        if (freeze || !currProfile.spinnerMusic) stopMusic(0);
    }, [freeze, currProfile.spinnerMusic]);
    useEffect(() => () => {
        stopMusic(0);
        if (inRecoveryRef.current) clearTimeout(inRecoveryRef.current);
    }, []);

    useEffect(() => {
        if (freeze || !active) return;
        let lastTime = performance.now();
        let frameId: number;

        function animate(currentTime: number) {
            const dt = Math.min((currentTime - lastTime) / 1000, 1 / 30);
            lastTime = currentTime;
            if (dt > 0) sim.step(dt);
            syncPose();
            updateCamera(currentTime);
            frameId = requestAnimationFrame(animate);
        }
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [freeze, active]);

    useImperativeHandle(ref, (): DiceSceneMethods => ({
        rollDice: () => {
            if (freezeTimerRef.current) {
                clearTimeout(freezeTimerRef.current);
                freezeTimerRef.current = undefined;
            }
            if (sim.phase == "rising") return;
            endTurn();
            // it stands up while the camera moves to the side view, then spins
            sim.spin();
            if (currProfile.spinnerMusic) playMusic(Sounds.spinnerMusic);
            setActive(true);
        },
        update: (p) => {
            setCurrProfile(p);
        },
        updateWindowSize: (winSize: WinSize) => {
            setCurrWindowSize(winSize);
        },
        updateCamera: () => {
        },
        resetRecovery: () => {
            lockedRef.current = false;
            setInRecovery(false);
            if (inRecoveryRef.current != undefined) {
                clearTimeout(inRecoveryRef.current);
                inRecoveryRef.current = undefined;
            }
        },
    }));

    const spinnerInfo = currProfile.spinnerDie;
    const textureSource = isStaticDie(spinnerInfo.template) ?
        { source: templatesList.find(t => t.key == spinnerInfo.template)?.image } :
        { source: { uri: spinnerInfo.texture } };
    const texture = useBuffer(textureSource as any);

    const renderCallback: RenderCallback = useCallback(() => {
        "worklet"
        const aspectRatio = view.getAspectRatio();
        if (prevAspectRatio.value != aspectRatio) {
            prevAspectRatio.value = aspectRatio;
            camera.setLensProjection(focalLength, aspectRatio, 0.1, 1000);
        }
        const s = scaleShared.value;
        const { position, rotation, view: v } = frame.value;
        // the camera turned by v.yaw around its target (as rotateY)
        const [px, py, pz] = cameraPosition(elevation.value);
        const c = Math.cos(v.yaw), sn = Math.sin(v.yaw);
        camera.lookAt(
            [v.tx * s + px * c + pz * sn, py, v.tz * s - px * sn + pz * c],
            [v.tx * s, 0, v.tz * s],
            [CameraUp[0] * c + CameraUp[2] * sn, 0, -CameraUp[0] * sn + CameraUp[2] * c]);

        if (floorEntity) {
            // just above the floor (y = -1 in physics units)
            let floorTransform = transformManager.createIdentityMatrix();
            floorTransform = floorTransform.rotate(v.floorYaw, [0, 1, 0]);
            floorTransform = floorTransform.translate([v.fx, -0.999, v.fz]);
            floorTransform = floorTransform.scaling([s, s, s]);
            transformManager.setTransform(floorEntity, floorTransform);
        }

        if (backdropEntity) {
            // around the camera's target, its back (+z) where the camera looks to
            let backdropTransform = transformManager.createIdentityMatrix();
            backdropTransform = backdropTransform.rotate(CameraAzimuth + v.yaw, [0, 1, 0]);
            // above the floor, below the shadow
            backdropTransform = backdropTransform.translate([v.tx, -0.995, v.tz]);
            backdropTransform = backdropTransform.scaling([s, s, s]);
            transformManager.setTransform(backdropEntity, backdropTransform);
        }

        const angle = rotation.angle;
        const axis = [rotation.axis[0], rotation.axis[1], rotation.axis[2]] as Float3;
        const pos = [position[0], position[1], position[2]] as Float3;

        if (shadowEntity) {
            const fc = Math.cos(v.floorYaw), fs = Math.sin(v.floorYaw);
            const [hx, hz, yaw, x, z] = shadowPlacement(ShadowPoints, angle, axis, pos, -1,
                ShadowDir[0] * fc + ShadowDir[1] * fs, -ShadowDir[0] * fs + ShadowDir[1] * fc);
            let shadowTransform = transformManager.createIdentityMatrix();
            shadowTransform = shadowTransform.scaling([hx, 1, hz]);
            shadowTransform = shadowTransform.rotate(yaw, [0, 1, 0]);
            // just above the floor
            shadowTransform = shadowTransform.translate([x, -0.99, z]);
            shadowTransform = shadowTransform.scaling([s, s, s]);
            transformManager.setTransform(shadowEntity, shadowTransform);
        }

        if (!entity) return;

        // world = scale * (pos + R * v)
        let transform = transformManager.createIdentityMatrix();
        transform = transform.rotate(angle, axis);
        transform = transform.translate(pos);
        transform = transform.scaling([s, s, s]);
        transformManager.setTransform(entity, transform);
    }, [entity, frame, scaleShared, transformManager, camera, view, elevation, prevAspectRatio, floorEntity, shadowEntity, backdropEntity]);

    const handleViewClicked = async (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        const picked = await view.pickEntity(locationX, locationY);
        if (picked != null && entity && picked.id == entity.id && sim.phase == "idle") {
            // spinner clicked - play the audio of the face up, if exists
            const audioUri = spinnerInfo.faces?.at(sim.face)?.audioUri;
            if (audioUri) {
                playAudio(audioUri);
            }
            return;
        }

        if (currProfile.recoveryTime > 0) {
            if (lockedRef.current) return;
            // the unlock countdown starts when the spinner rests (see onSettled)
            lockedRef.current = true;
            setInRecovery(true);
        }
        ref.current?.rollDice();
    };

    return (
        <FilamentView
            style={{ flex: 1, backgroundColor: darkenHexColor(safeColor(currProfile.tableColor), Math.pow(BackdropTopShade, 1 / 2.2)) }}
            renderCallback={active && !freeze ? renderCallback : undefined}
            onTouchStart={handleViewClicked}>

            <DefaultLight />

            <ModelRenderer model={floorModel} castShadow={false} receiveShadow={false} />
            <ModelRenderer model={backdropModel} castShadow={false} receiveShadow={false} />
            <ModelRenderer model={shadowModel} castShadow={false} receiveShadow={false} />

            <ModelRenderer model={model} castShadow={true} receiveShadow={true}>
                {texture && <EntitySelector byName="Spinner"
                    textureMap={{ materialName: "Material", textureSource: texture }} />}
            </ModelRenderer>
        </FilamentView>
    );
});
