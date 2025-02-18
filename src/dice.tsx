// DiceScene.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    Viro3DObject,
    ViroMaterials,
} from "@reactvision/react-viro";
import { Viro3DPoint, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import { getCustomTypePath, Templates } from "./profile";

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

    const scaleRef = useRef<ViroScale>(scale);

    useEffect(()=>{
        scaleRef.current = scale;
    },[scale])

    useEffect(() => {
        console.log("reset cube", cubeKey, cube.current, template)

        let texture: string | { uri: string } = "";
        switch (template) {
            case Templates.Numbers:
                texture = require("../assets/numbers.png");
                break;
            case Templates.Colors:
                texture = require("../assets/colors.png");
                break;
            case Templates.Dots:
                texture = require("../assets/dots.png");
                break;
            case undefined:
                texture = require("../assets/dots.png");
                break;
            default:
                texture = { uri: getCustomTypePath(template) + "/dice.jpg" };
                break;
        }

        const suffix = `_${index}`;
        // Define the Material
        ViroMaterials.createMaterials({
            ["front" + suffix]: {
                diffuseTexture: texture,
                //diffuseColor: "0xFFFFFF",
                lightingModel: "Lambert",
            },
            ["back" + suffix]: {
                diffuseTexture: texture,
                //diffuseColor: "0xffffff",
                lightingModel: "Lambert",
            },
            ["left" + suffix]: {
                diffuseTexture: texture,
                //diffuseColor: "0xffffff",
                lightingModel: "Lambert",
            },
            ["right" + suffix]: {
                diffuseTexture: texture,
                //diffuseColor: "0xffffff",
                lightingModel: "Lambert",
            },
            ["top" + suffix]: {
                diffuseTexture: texture,
                //diffuseColor: "0xffffff",
                lightingModel: "Lambert",

            },
            ["bottom" + suffix]: {
                diffuseTexture: texture,
                //diffuseColor: "0xffffff",
                lightingModel: "Lambert",

            },
        });

        setHideDice(true);
        setTimeout(() => {
            // cube.current?.setNativeProps({
            //     scale: scale as ViroScale,
            // });
            //     materials: [
            //         `front_${index}`,  // Front face
            //         `back_${index}`,   // Back face
            //         `left_${index}`,   // Left face
            //         `right_${index}`,  // Right face
            //         `top_${index}`,    // Top face
            //         `bottom_${index}`, // Bottom face
            //     ]
            // })
            console.log("scale", scaleRef.current)
            cube.current?.setNativeProps({scale: scaleRef.current})
            setHideDice(false)
            setTimeout(() => shootDice(), 50);
        }, 500)

    }, [cubeKey])


    const shootDice = () => {
        // Apply a one-time impulse to "kick" the dice into motion.
        //cube.current?.setNativeProps({position: initialPosition})
        cube.current?.applyImpulse(initialImpulse, [0, 0, 0]);
        //cube.current?.applyImpulse(initialImpulse ?? [0, -.5, .5], [0, 0, 0]);
        cube.current?.applyTorqueImpulse(initialTourqe);
    }

    const onDiceLoadEnd = () => {
        if (cube.current) {
            console.log("initial")
            shootDice()
        }
    };

    console.log("Initial Position", initialPosition)

    return (<Viro3DObject
        //key={cubeKey}
        ref={r => cube.current = r}
        onLoadEnd={!hideDice ? onDiceLoadEnd : undefined}
        source={require("../assets/cube3.obj")}
        position={hideDice ? [5, 5, 5] : initialPosition}//.map(p => p * Math.random() * .2) as Viro3DPoint}

        rotation={[0, 0, 0]}
        scale={hideDice ? [.1, .1, .1] : scale}
        //scale={scale}
        materials={hideDice ?
            [
                "default",
                "default",
                "default",
                "default",
                "default",
                "default",
            ] :
            [
                `front_${index}`,  // Front face
                `back_${index}`,   // Back face
                `left_${index}`,   // Left face
                `right_${index}`,  // Right face
                `top_${index}`,    // Top face
                `bottom_${index}`, // Bottom face
            ]}
        type="OBJ"
        onError={(error) => console.error("Viro3DObject error:", error.nativeEvent.error)}
        physicsBody={hideDice ?
            {
                type: "Dynamic",
                velocity: [.01, .01, .01],
                mass: 0.1,
            } :
            {
                type: "Dynamic",
                mass: 0.1,
                friction: 0.3,
                restitution: 0.6,
                useGravity: true,
                enabled: true,

            }}
        lightReceivingBitMask={1.5}
    />);
}