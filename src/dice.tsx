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
} from "@reactvision/react-viro";
import { Viro3DPoint } from "@reactvision/react-viro/dist/components/Types/ViroUtils";

interface DiceProps {
    cubeKey: string;
    initialPosition: Viro3DPoint;
    scale: Viro3DPoint;
    initialImpulse: Viro3DPoint;
    initialTourqe: Viro3DPoint;
}

export default function Dice({ cubeKey, initialPosition, scale, initialImpulse, initialTourqe }: DiceProps) {
    const cube = useRef<Viro3DObject | null>(undefined);
    const [hideDice, setHideDice] = useState<boolean>(false);

    useEffect(() => {
        console.log("reset cube", cubeKey, cube.current)
        setHideDice(true);
        setTimeout(() => {
            console.log("show cube")
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
        source={require("../assets/cube2.obj")}
        position={initialPosition}
        rotation={[0, 0, 0]}
        scale={scale}
        materials={[
            "front",  // Front face
            "back",   // Back face
            "left",   // Left face
            "right",  // Right face
            "top",    // Top face
            "bottom", // Bottom face
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