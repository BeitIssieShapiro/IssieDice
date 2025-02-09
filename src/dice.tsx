// DiceScene.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    ViroScene,
    ViroBox,
    ViroAmbientLight,
    ViroNode,
    Viro3DObject,
    ViroQuad,
    ViroCamera,
    ViroMaterials,
} from "@reactvision/react-viro";
import { Viro3DPoint } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import { Templates } from "./profile";

interface DiceProps {
    cubeKey: string;
    index: number;
    initialPosition: Viro3DPoint;
    scale: Viro3DPoint;
    initialImpulse: Viro3DPoint;
    initialTourqe: Viro3DPoint;
    template: Templates;
}

export default function DiceObject({ cubeKey, index, template, initialPosition, scale, initialImpulse, initialTourqe }: DiceProps) {
    const cube = useRef<Viro3DObject | null>(undefined);
    const [hideDice, setHideDice] = useState<boolean>(false);

    useEffect(() => {
        console.log("reset cube", cubeKey, cube.current)

        const texture = template == Templates.Numbers ? require("../assets/numbers.png") :
            require("../assets/colors.png");

        const suffix = `_${index}`;
        // Define the Material
        ViroMaterials.createMaterials({
            ["front" + suffix]: {
                diffuseTexture: texture,
                diffuseColor: '#FFFFFF',
            },
            ["back" + suffix]: {
                diffuseTexture: texture,
                diffuseColor: '#FFFFFF',
            },
            ["left" + suffix]: {
                diffuseTexture: texture,
                diffuseColor: '#FFFFFF',
            },
            ["right" + suffix]: {
                diffuseTexture: texture,
                diffuseColor: '#FFFFFF',
            },
            ["top" + suffix]: {
                diffuseTexture: texture,
                diffuseColor: '#FFFFFF',
            },
            ["bottom" + suffix]: {
                diffuseTexture: texture,
                diffuseColor: '#FFFFFF',
            },
        });

        setHideDice(true);
        setTimeout(() => {
            setHideDice(false)
            setTimeout(() => shootDice(), 50);
        }, 100)

    }, [cubeKey])


    const shootDice = () => {
        // Apply a one-time impulse to "kick" the dice into motion.

        cube.current?.applyImpulse(initialImpulse, [0, 0, 0]);
        cube.current?.applyTorqueImpulse(initialTourqe);
    }

    const onDiceLoadEnd = () => {
        if (cube.current) {
            shootDice()
        }
    };

    return (<Viro3DObject
        key={cubeKey}
        ref={r => cube.current = r}
        onLoadEnd={!hideDice ? onDiceLoadEnd : undefined}
        source={require("../assets/cube3.obj")}
        position={initialPosition}
        rotation={[0, 0, 0]}
        scale={scale}
        materials={[
            `front_${index}`,  // Front face
            `back_${index}`,   // Back face
            `left_${index}`,   // Left face
            `right_${index}`,  // Right face
            `top_${index}`,    // Top face
            `bottom_${index}`, // Bottom face
        ]}
        type="OBJ"
        onError={(error) => console.error("Viro3DObject error:", error.nativeEvent.error)}
        physicsBody={hideDice ? undefined :
            {
                type: "Dynamic",
                mass: 0.1,
                friction: 0.3,
                restitution: 0.6,
                useGravity: true,
            }}
    />);
}