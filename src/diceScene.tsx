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
import Dice from "./dice";

interface DiceSceneProps {
    initialImpulse: Viro3DPoint;
    initialTorque: Viro3DPoint;
}
export interface DiceSceneMethods {
    rollDice: (impolse:Viro3DPoint, torque:Viro3DPoint) => void;
}

const wallHeight = 2

export const DiceScene = forwardRef(({initialImpulse, initialTorque }: DiceSceneProps, ref: any) => {
    const [sceneKey, setSceneKey] = useState<number>(0);
    const [impulse, setImpulse] = useState<Viro3DPoint>(initialImpulse);
    const [torque, setTorque] = useState<Viro3DPoint>(initialTorque);

    useImperativeHandle(ref, (): DiceSceneMethods => ({
        rollDice: (i, t ) => {
            setImpulse(i);
            setTorque(t);
            setSceneKey(prev => prev + 1);
        }
    }));

    return (
        <ViroScene physicsWorld={{ gravity: [0, -9.8, 0], drawBounds: false }}>
            <ViroCamera active position={[0, 4, 2]} rotation={[-25, 0, 0]} />


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
                    position={[-3, 0, -5]}
                    scale={[0.1, wallHeight, 10]}
                    materials={["wallMaterial"]}
                    physicsBody={{ type: "Static" }}
                />
                <ViroBox
                    position={[3, 0, -5]}
                    scale={[0.1, wallHeight, 10]}
                    materials={["wallMaterial"]}
                    physicsBody={{ type: "Static" }}
                />

                <Dice
                    key={`dice-${sceneKey}`}
                    cubeKey={`dice-${sceneKey}`}
                    initialPosition={[0, 4, -1]}
                    scale={[0.4, 0.4, 0.4]}
                    initialImpulse={impulse}
                    initialTourqe={torque}
                />

            </ViroNode>
        </ViroScene>
    );
});