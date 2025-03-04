import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
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
} from "react-native-filament";

import * as CANNON from "cannon-es";
import { useSharedValue } from "react-native-worklets-core"
import { Profile } from "./profile";
import { WinSize } from "./utils";


const DiceModel = require("../assets/dice-empty.glb");
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
            { friction: 0.3, restitution: 0.0 }
        );
        worldRef.current = world;
    }
    const world = worldRef.current!;

    const [dice, setDice] = useState<{
        body: CANNON.Body,
    } | undefined>()

    const numberOfDice = 1
    useEffect(() => {
        // Create a dynamic dice body (a 1x1x1 box)
        const body = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
        });
        // Initial position above ground.
        body.position.set(0, 15, 0);

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

        return () => {
            dice?.body && world.removeBody(dice.body);
            world.removeBody(ground);
        };
    }, [numberOfDice, world]);

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
            <DefaultLight  />
            <ModelRenderer
                model={diceModel}
            />

            <Camera cameraPosition={[0, 20, 0]} cameraTarget={[0, 0, 0]} />
        </FilamentView>

    );
});