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
import { isStaticDie, Profile, SpinnerShape, Templates, templatesList } from "./models";
import { computeFloorBounds, hexToSrgb, safeColor, WinSize } from "./utils";
import { playAudio, playBundledAudio, playMusic, stopMusic } from "./audio";
import { getAssetLocalPath, Sounds } from "./assets";
import { cameraHeight, computeDiceScale, DiceSceneMethods, focalLength, fov, quaternionToAngleAxis } from "./diceScene";
import { computeVisibleFloorBounds, SpinnerSim } from "./spinner-sim";

export const SpinnerModels: Record<SpinnerShape, { uri: string }> = {
    classic: { uri: getAssetLocalPath("spinner.glb", true) },
    rounded: { uri: getAssetLocalPath("spinner-rounded.glb", true) },
};
// a grid on the floor, so the camera's move is seen (see design-resources/generate-floor-lines-glb.js)
const FloorLinesModel = { uri: getAssetLocalPath("floor-lines.glb", true) };

// While spinning, the camera looks at the spinner from south-south-west (south is the bottom of the screen,
// west is left). Once it falls, the camera slowly moves up to look at it from the top.
const SpinElevation = 55 * Math.PI / 180;  // above the floor
const TopElevation = 90 * Math.PI / 180;   // straight from the top
const CameraAzimuth = 22.5 * Math.PI / 180;  // from south towards west
const ToTopDuration = 1.5;      // sec
const ToSpinDuration = 1.2;     // sec
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

/** the floor lines' color (linear, as glTF expects): a bit darker than the table, or lighter on a dark table */
function floorLinesColor(tableColor: string): [number, number, number, number] {
    const srgb = hexToSrgb(tableColor).slice(0, 3);
    const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    const mixed = srgb.map(c => luminance < 0.25 ? c + (1 - c) * 0.12 : c * 0.85);
    const linear = mixed.map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return [linear[0], linear[1], linear[2], 1];
}

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
 * The spinner's shape is taken from the initial profile - remount (key) to change it.
 */
export const SpinnerScene = forwardRef(({ profile, windowSize, freeze, setInRecovery }: SpinnerSceneProps, ref: any) => {
    const [currWindowSize, setCurrWindowSize] = useState<WinSize>(windowSize);
    const [currProfile, setCurrProfile] = useState<Profile>(profile);
    // true while something moves (or briefly after a change), to keep the render callback active
    const [active, setActive] = useState<boolean>(true);
    const { renderableManager, transformManager, view, camera } = useFilamentContext();

    const simRef = useRef<SpinnerSim>(undefined);
    if (!simRef.current) {
        simRef.current = new SpinnerSim(Math.random, profile.spinnerShape);
    }
    const sim = simRef.current;

    const model = useModel(SpinnerModels[profile.spinnerShape] ?? SpinnerModels.classic);
    const entity = getAssetFromModel(model)?.getRenderableEntities()[0];
    if (entity) {
        renderableManager.setCastShadow(entity, true);
        renderableManager.setReceiveShadow(entity, true);
    }
    const floorLinesModel = useModel(FloorLinesModel);
    const floorLinesEntity = getAssetFromModel(floorLinesModel)?.getRenderableEntities()[0];

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

    const position = useSharedValue<Float3>([0, 0, 0]);
    const rotation = useSharedValue<SpinnerRotation>({ angle: 0, axis: [1, 0, 0] });
    const scaleShared = useSharedValue<number>(scale);
    const elevation = useSharedValue<number>(TopElevation);
    const prevAspectRatio = useSharedValue<number>(0);
    // camera move: from the elevation at start, to the target (spin / top, by the spinner's phase)
    const cameraMoveRef = useRef({ from: TopElevation, to: TopElevation, start: 0, duration: 0 });

    const freezeTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    // locked from the start of a spin until recoveryTime seconds after the spinner rests
    const lockedRef = useRef<boolean>(false);
    const inRecoveryRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const syncPose = useCallback(() => {
        const { x, y, z } = sim.body.position;
        position.value = [x, y, z];
        rotation.value = quaternionToAngleAxis(sim.body.quaternion);
    }, [sim]);

    const updateCamera = useCallback((now: number) => {
        const move = cameraMoveRef.current;
        const to = sim.phase == "spinning" ? SpinElevation : TopElevation;
        if (to != move.to) {
            move.from = elevation.value;
            move.to = to;
            move.start = now;
            move.duration = to == TopElevation ? ToTopDuration : ToSpinDuration;
        }
        const t = move.duration > 0 ? Math.min(1, (now - move.start) / 1000 / move.duration) : 1;
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        elevation.value = move.from + (move.to - move.from) * e;
        return t >= 1;
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
                playBundledAudio(Sounds.collision, Math.min(1, impactVelocity / 10));
            }
        };
    }, [sim, currProfile]);

    useEffect(() => {
        if (!floorLinesEntity) return;
        renderableManager.getMaterialInstanceAt(floorLinesEntity, 0)
            .setFloat4Parameter("baseColorFactor", floorLinesColor(safeColor(currProfile.tableColor)));
        renderBriefly();
    }, [floorLinesEntity, currProfile.tableColor]);

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
            camera.setLensProjection(focalLength, aspectRatio, 0.1, 100);
        }
        camera.lookAt(cameraPosition(elevation.value), [0, 0, 0], CameraUp);

        const s = scaleShared.value;
        if (floorLinesEntity) {
            // just above the floor (y = -1 in physics units)
            let floorTransform = transformManager.createIdentityMatrix();
            floorTransform = floorTransform.translate([0, -0.999, 0]);
            floorTransform = floorTransform.scaling([s, s, s]);
            transformManager.setTransform(floorLinesEntity, floorTransform);
        }

        if (!entity) return;
        const angle = rotation.value.angle;
        const axis = [rotation.value.axis[0], rotation.value.axis[1], rotation.value.axis[2]] as Float3;
        const pos = [position.value[0], position.value[1], position.value[2]] as Float3;

        // world = scale * (pos + R * v)
        let transform = transformManager.createIdentityMatrix();
        transform = transform.rotate(angle, axis);
        transform = transform.translate(pos);
        transform = transform.scaling([s, s, s]);
        transformManager.setTransform(entity, transform);
    }, [entity, position, rotation, scaleShared, transformManager, camera, view, elevation, prevAspectRatio, floorLinesEntity]);

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
            style={{ flex: 1, backgroundColor: currProfile.tableColor }}
            renderCallback={active && !freeze ? renderCallback : undefined}
            onTouchStart={handleViewClicked}>

            <DefaultLight />

            <ModelRenderer model={floorLinesModel} castShadow={false} receiveShadow={false} />

            <ModelRenderer model={model} castShadow={true} receiveShadow={true}>
                {texture && <EntitySelector byName="Spinner"
                    textureMap={{ materialName: "Material", textureSource: texture }} />}
            </ModelRenderer>
        </FilamentView>
    );
});
