import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LogBox, View } from "react-native";
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
    FrameInfo,
    BoxShape,
    Skybox,
    useBuffer,
    useDisposableResource,
    useWorkletCallback,
    useWorkletMemo,
    useEntityInScene
} from "react-native-filament";

import * as CANNON from "cannon-es";
import { useSharedValue } from "react-native-worklets-core"
import { Profile } from "./profile";
import { WinSize } from "./utils";


const DiceModel = require("../assets/dice-empty.glb");
const TransparentShadowMaterial = require('../assets/transparent_shadow_material.filamat');

LogBox.ignoreLogs(["has already"]);


function quaternionToAngleAxis(q: CANNON.Quaternion): { angle: number; axis: [number, number, number] } {
    const angle = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);
    let axis: [number, number, number];
    if (s < 0.001) {
        // If s is close to zero, use a default axis (here, the X axis)
        axis = [1, 0, 0];
    } else {
        axis = [q.x / s, q.y / s, q.z / s];
    }
    return { angle, axis };
}

interface DiceSceneProps {
    initialImpulse: number[];
    initialTorque: number[];
    profile: Profile;
    windowSize: WinSize;
}
export interface DiceSceneMethods {
    rollDice: () => void;
    update: (profile: Profile) => void;
    updateWindowSize: (winSize: WinSize) => void;
    updateCamera: (tilt: number) => void;
}

export const DiceScene = forwardRef(({ initialImpulse, initialTorque, profile, windowSize }: DiceSceneProps, ref: any) => {
    const { engine, renderableManager, scene } = useFilamentContext()

    //#region Setup shadow plane
    const shadowMaterialBuffer = useBuffer({ source: TransparentShadowMaterial })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const shadowMaterial = useDisposableResource(
        useWorkletCallback(() => {
            'worklet'
            if (shadowMaterialBuffer == null) return undefined

            const material = engine.createMaterial(shadowMaterialBuffer)
            material.setDefaultFloatParameter('strength', 0.2)
            return material
        }),
        [engine, shadowMaterialBuffer]
    )

    // Create Shadow plane
    const shadowPlane = useWorkletMemo(() => {
        'worklet'
        if (shadowMaterial == null) return undefined

        const entity = renderableManager.createPlane(shadowMaterial, 10, 0.0001, 10)
        renderableManager.setReceiveShadow(entity, true)
        return entity
    }, [renderableManager, shadowMaterial])

    useEntityInScene(scene, shadowPlane)


    const worldRef = useRef<CANNON.World | null>(null);
    if (!worldRef.current) {
        const world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
        });
        // Optional: set broadphase and solver iterations
        world.broadphase = new CANNON.NaiveBroadphase();
        world.solver.iterations = 20;
        // Create a default material/contact material for better collisions.
        const defaultMat = new CANNON.Material("default");
        world.defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMat,
            defaultMat,
            { friction: 0.9, restitution: 0.7 }
        );
        worldRef.current = world;
    }
    const world = worldRef.current!;

    const [dice, setDice] = useState<{
        body: CANNON.Body,
    } | undefined>()


    useImperativeHandle(ref, (): DiceSceneMethods => ({
        rollDice: () => {
            if (dice) {
                // Reset any existing velocities
                dice.body.velocity.setZero();
                dice.body.angularVelocity.setZero();

                // Optionally, reset position if desired.
                dice.body.position.set(0, 15, 0);


                const fz = -(Math.random() / 5 + .3);
                const fy = -(Math.random() / 5 + .3);

                // Random angular velocity for all dice
                const avx = Math.random() * 5;
                const avy = Math.random() * 5;
                const avz = Math.random() * 5;
                const imp = [0, fy, fz];
                const trq = [avx, avy, avz];
                const randomRotation = () => Math.floor(360 * Math.random()) - 180;
                // diffrect rotation for each dice:
                const rot = [0, 1, 2, 3].map(index => {
                    return [randomRotation(), randomRotation(), randomRotation()];
                })

                // Apply the linear impulse.
                // initialImpulse is a number array, e.g. [x, y, z]
                const impulse = new CANNON.Vec3(...imp);

                // Applying the impulse at the center of mass:
                dice.body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));

                // For an angular impulse, you can simply set the angularVelocity.
                // initialTorque is a number array, e.g. [x, y, z].
                dice.body.angularVelocity.set(trq[0], trq[1], trq[2]);
            }
        },
        update: (profile) => {

        },
        updateWindowSize: (winSize: WinSize) => {
            //setCurrWindowSize(winSize);
        },
        updateCamera: (tilt) => {
            // if (tilt >= 0 && tilt < cameraPos.length) {
            //     console.log("update camera tilt", tilt)
            //     setCameraTilt(tilt);
            // }
        }
    }));



    useEffect(() => {
        // Create a dynamic dice body (a 1x1x1 box)
        const body = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
        });
        // Initial position above ground.
        body.position.set(0, 1, 0);

        // Set an initial random rotation.
        const randomAngle = Math.random() * Math.PI * 2;
        const randomAxis = new CANNON.Vec3(Math.random(), Math.random(), Math.random()).unit();
        body.quaternion.setFromAxisAngle(randomAxis, randomAngle);

        // For demonstration, when a dice "sleeps" (i.e. comes to rest),
        // assign a random roll result.
        body.addEventListener("sleep", () => {
            // todo
        });
        world.addBody(body);
        setDice({ body });

        // Create a ground as a large static box.
        const ground = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(50, 1, 50)),
        });

        // Position so that the top surface is at y = 0.
        ground.position.set(0, -1, 0);
        world.addBody(ground);


        const backWall = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(50, 1, 50)),
        });

        // Position so that the top surface is at y = 0.
        backWall.position.set(0, -1, 0);
        world.addBody(backWall);

        return () => {
            dice?.body && world.removeBody(dice.body);
            world.removeBody(ground);
            world.removeBody(backWall);
        };
    }, [world]);

    const dicePosition = useSharedValue<Float3>([0, 15, 0]);
    const diceRotation = useSharedValue<{ angle: number; axis: Float3 }>({
        angle: 0,
        axis: [1, 0, 0],
    });

    useEffect(() => {
        let lastTime = performance.now();
        let frameId: number;

        function animate(currentTime: number) {
            const dt = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            const dtClamped = Math.min(dt, 1 / 30);
            world.step(1 / 60, dtClamped, 3);

            if (dice) {
                const { x, y, z } = dice.body.position;
                const { angle, axis } = quaternionToAngleAxis(dice.body.quaternion);

                //console.log("World step", [x,y,z])

                dicePosition.value = [x, y, z];
                diceRotation.value = {
                    angle,
                    axis
                };
            }

            frameId = requestAnimationFrame(animate);
        }
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [world, dice]);

    const diceModel = useModel(DiceModel);

    const { transformManager } = useFilamentContext()
    const diceAsset = getAssetFromModel(diceModel)
    const diceEntity = diceAsset?.getRenderableEntities()[0];
    const renderCallback: RenderCallback = useCallback(() => {
        "worklet"

        if (diceEntity && dicePosition.value) {
            const pos = [dicePosition.value[0], dicePosition.value[1], dicePosition.value[2]] as Float3
            const angle = diceRotation.value.angle;
            const axis = [diceRotation.value.axis[0], diceRotation.value.axis[1], diceRotation.value.axis[2]] as Float3;
            //console.log("transform", pos,  angle, axis)


            let transform = transformManager.createIdentityMatrix();
            transform = transform.rotate(angle, axis);
            transform = transform.translate(pos);

            transformManager.setTransform(diceEntity, transform)
        }
    }, [dicePosition, diceRotation, diceEntity, transformManager])

    return (

        <FilamentView style={{ flex: 1 }} renderCallback={renderCallback} >
            <DefaultLight />
            <Skybox colorInHex="#00FF00" />

            <ModelRenderer
                model={diceModel}
                castShadow={true} receiveShadow={true}
            />

            <Camera cameraPosition={[0, 20, 0]} cameraTarget={[0, 0, 0]} />
        </FilamentView>

    );
});