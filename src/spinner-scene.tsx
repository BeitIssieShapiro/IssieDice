import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { GestureResponderEvent } from "react-native";
import {
    FilamentView,
    DefaultLight,
    Camera,
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
import { isStaticDie, Profile, templatesList } from "./models";
import { computeFloorBounds, WinSize } from "./utils";
import { playAudio, playBundledAudio } from "./audio";
import { getAssetLocalPath, Sounds } from "./assets";
import { cameraHeight, computeDiceScale, DiceSceneMethods, focalLength, fov, quaternionToAngleAxis } from "./diceScene";
import { computeVisibleFloorBounds, SpinnerSim } from "./spinner-sim";

export const SpinnerModel = { uri: getAssetLocalPath("spinner.glb", true) };

// The camera looks at the spinner from south-south-west (south is the bottom of the screen, west is left)
const CameraElevation = 55 * Math.PI / 180;  // above the floor (90 would be straight from the top)
const CameraAzimuth = 22.5 * Math.PI / 180;  // from south towards west
const CameraPosition: Float3 = [
    -Math.sin(CameraAzimuth) * Math.cos(CameraElevation) * cameraHeight,
    Math.sin(CameraElevation) * cameraHeight,
    -Math.cos(CameraAzimuth) * Math.cos(CameraElevation) * cameraHeight,
];
// the camera's horizontal view direction (the top of the screen) is +z rotated by this
const ViewYaw = CameraAzimuth;

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
    const { renderableManager, transformManager, view } = useFilamentContext();

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

    const scale = computeDiceScale(currWindowSize, currProfile.size);
    // the floor is at y = -1 in physics units, i.e. -scale in world units
    const bounds = computeVisibleFloorBounds(CameraPosition, fov, currWindowSize.width / currWindowSize.height, -scale,
        computeFloorBounds(currWindowSize, cameraHeight, fov, 0));

    const position = useSharedValue<Float3>([0, 0, 0]);
    const rotation = useSharedValue<SpinnerRotation>({ angle: 0, axis: [1, 0, 0] });
    const scaleShared = useSharedValue<number>(scale);

    const freezeTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const inRecoveryRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const syncPose = useCallback(() => {
        const { x, y, z } = sim.body.position;
        position.value = [x, y, z];
        rotation.value = quaternionToAngleAxis(sim.body.quaternion);
    }, [sim]);

    // render a few frames, then stop rendering until something moves again
    const renderBriefly = useCallback(() => {
        syncPose();
        setActive(true);
        if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
        freezeTimerRef.current = setTimeout(() => {
            freezeTimerRef.current = undefined;
            if (sim.phase == "idle") setActive(false);
        }, 200);
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
        sim.onSettled = () => {
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
        if (freeze || !active) return;
        let lastTime = performance.now();
        let frameId: number;

        function animate(currentTime: number) {
            const dt = Math.min((currentTime - lastTime) / 1000, 1 / 30);
            lastTime = currentTime;
            if (dt > 0) sim.step(dt);
            syncPose();
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
        if (!entity) return;
        const s = scaleShared.value;
        const angle = rotation.value.angle;
        const axis = [rotation.value.axis[0], rotation.value.axis[1], rotation.value.axis[2]] as Float3;
        const pos = [position.value[0], position.value[1], position.value[2]] as Float3;

        // world = scale * (pos + R * v)
        let transform = transformManager.createIdentityMatrix();
        transform = transform.rotate(angle, axis);
        transform = transform.translate(pos);
        transform = transform.scaling([s, s, s]);
        transformManager.setTransform(entity, transform);
    }, [entity, position, rotation, scaleShared, transformManager]);

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

        if (inRecoveryRef.current && currProfile.recoveryTime) {
            return;
        }

        if (currProfile.recoveryTime > 0) {
            inRecoveryRef.current = setTimeout(() => {
                ref.current?.resetRecovery();
            }, currProfile.recoveryTime * 1000);
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

            <ModelRenderer model={model} castShadow={true} receiveShadow={true}>
                {texture && <EntitySelector byName="Spinner"
                    textureMap={{ materialName: "Material", textureSource: texture }} />}
            </ModelRenderer>

            <Camera cameraPosition={CameraPosition} cameraTarget={[0, 0, 0]} focalLengthInMillimeters={focalLength} />
        </FilamentView>
    );
});
