// DiceScene.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
    ViroScene,
    ViroBox,
    ViroAmbientLight,
    ViroNode,
    Viro3DObject,
    ViroQuad,
    ViroCamera,
    ViroOrbitCamera,
} from "@reactvision/react-viro";
import { Axes } from "./axes";
import { Viro3DPoint, ViroForce, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import DiceObject from "./dice";
import { Dice } from "./profile";

interface DiceSceneProps {
    initialImpulse: Viro3DPoint;
    initialTorque: Viro3DPoint;
    dice: Dice[];
}
export interface DiceSceneMethods {
    rollDice: (impolse: Viro3DPoint, torque: Viro3DPoint) => void;
    update: (dice: Dice[])=>void;

}

const wallHeight = 2

export const DiceScene = forwardRef(({ initialImpulse, initialTorque, dice }: DiceSceneProps, ref: any) => {
    const [sceneKey, setSceneKey] = useState<number>(0);
    const [impulse, setImpulse] = useState<Viro3DPoint>(initialImpulse);
    const [torque, setTorque] = useState<Viro3DPoint>(initialTorque);
    const [diceInfo, setDiceInfo] = useState<Dice[]>(dice);

    useImperativeHandle(ref, (): DiceSceneMethods => ({
        rollDice: (i, t) => {
            setImpulse(i);
            setTorque(t);
            setSceneKey(prev => prev + 1);
        },
        update: (dice) => {
            setDiceInfo(dice);
        }
    }));

    console.log("render diceScene", dice)
    return (
        <ViroScene physicsWorld={{ gravity: [0, -9.8, 0], drawBounds: false }}>
            <ViroCamera active position={[0, 5, 2]} rotation={[-60, 0, 0]} />


            <ViroNode position={[0, 0, 0]} >

                <ViroAmbientLight color="#ffffff" intensity={400} />

                {/* <ViroNode position={[-2.5, 0, -9]}>
                    <Axes />
                </ViroNode> */}
                {/* Walls [red, blue, green]*/}

                {/* Floor (table surface) */}
                <ViroQuad
                    position={[0, 0, -2]}
                    rotation={[-90, 0, 0]}
                    width={6}
                    height={15}
                    materials={["tableSurface"]}
                    physicsBody={{
                        type: "Static",
                        friction: 0.9,
                        restitution: 0.7,
                    }}
                />

                {/* Back Wall */}
                <ViroBox
                    // This wall is placed behind the dice so that it acts as a barrier
                    // without breaking the line of sight from the camera.
                    position={[0, 0, -10]}
                    scale={[6, wallHeight, 0.1]}
                    materials={["wallMaterial"]}
                    physicsBody={{ type: "Static" }}
                />


                <ViroBox
                    position={[-3, 0, -3]}
                    scale={[0.1, wallHeight, 14]}
                    materials={["wallMaterial"]}
                    physicsBody={{ type: "Static" }}
                />
                <ViroBox
                    position={[3, 0, -3]}
                    scale={[0.1, wallHeight, 14]}
                    materials={["wallMaterial"]}
                    physicsBody={{ type: "Static" }}
                />

                {diceInfo.map((d, i) => (
                    <DiceObject
                        key={`dice${i}-${sceneKey}`}
                        cubeKey={`dice${i}-${sceneKey}`}
                        initialPosition={[i < dice.length / 2 ? -(i + 1) * .1 : (i + 1) * .1, 3, 2]}
                        scale={[0.4, 0.4, 0.4]}
                        initialImpulse={impulse}
                        initialTourqe={torque}
                    />
                )

                )}


            </ViroNode>
        </ViroScene>
    );
});