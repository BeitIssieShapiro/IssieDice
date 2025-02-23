// DiceScene.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    Viro3DObject,
    ViroMaterials,
} from "@reactvision/react-viro";
import { Viro3DPoint, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import { getCustomTypePath, getRandomFile, Templates, templatesList } from "./profile";

interface DiceProps {
    cubeKey: string;
    cubeInfoKey: string;
    index: number;
    initialPosition: Viro3DPoint;
    scale: Viro3DPoint;
    initialImpulse: Viro3DPoint;
    initialTourqe: Viro3DPoint;
    template: Templates;
}

const cubeDots = require("../assets/dot-dice.obj");
const cubeEmpty = require("../assets/dice-empty.obj");

export default function DiceObject({ cubeKey, cubeInfoKey, index, template, initialPosition, scale, initialImpulse, initialTourqe }: DiceProps) {
    const cube = useRef<Viro3DObject | null>(undefined);
    const [hideDice, setHideDice] = useState<boolean>(false);

    const scaleRef = useRef<ViroScale>(scale);

    useEffect(() => {
        scaleRef.current = scale;
    }, [scale])

    useEffect(() => {
        console.log("reset cube", cubeKey, cube.current, template)

        if (template == undefined) {
            template = Templates.Dots;
        }
        setTimeout(async () => {
            let texture: string | { uri: string } = "";
            switch (template) {
                case Templates.Numbers:
                case Templates.Colors:
                case Templates.Dots:
                    texture = templatesList.find(t => t.key == template)?.image;
                    break;
                default:
                    console.log("Loading custom template's texture", template, cubeKey)
                    texture = {
                        uri:
                            await getRandomFile(getCustomTypePath(template) + "/dice.jpg", "jpg")
                    };
                    break;
            }

            // Define the Material
            ViroMaterials.createMaterials({
                [`Material_${index}`]: {
                    diffuseTexture: texture,
                    //diffuseColor: "0xFFFFFF",
                    lightingModel: "Lambert",
                },
            });
            shootDice();
        })
    }, [cubeInfoKey])

    useEffect(() => {
        shootDice();
    }, [cubeKey])


    const shootDice = () => {
        setHideDice(true);
        setTimeout(() => {
            console.log("scale", scaleRef.current)
            cube.current?.setNativeProps({ scale: scaleRef.current })
            setHideDice(false)
            setTimeout(() => {
                // Apply a one-time impulse to "kick" the dice into motion.
                //cube.current?.setNativeProps({position: initialPosition})
                cube.current?.applyImpulse(initialImpulse, [0, 0, 0]);
                //cube.current?.applyImpulse(initialImpulse ?? [0, -.5, .5], [0, 0, 0]);
                cube.current?.applyTorqueImpulse(initialTourqe);
            }, 50);
        }, 500)
    }

    const onDiceLoadEnd = () => {
        if (cube.current) {
            console.log("initial")
            shootDice()
        }
    };

    const isDots = template == Templates.Dots
    return (isDots ?
        <Viro3DObject
            key={"dots"}
            ref={r => cube.current = r}
            onLoadEnd={!hideDice ? onDiceLoadEnd : undefined}
            source={cubeDots}
            position={hideDice ? [5, 5, 5] : initialPosition}

            rotation={[0, 0, 0]}
            scale={hideDice ? [.1, .1, .1] : scale}
            materials={hideDice || isDots ? undefined : [`Material_${index}`]}
            type="OBJ"
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
        /> :
        <Viro3DObject
            key={"other"}
            ref={r => cube.current = r}
            onLoadEnd={!hideDice ? onDiceLoadEnd : undefined}
            source={cubeEmpty}
            position={hideDice ? [5, 5, 5] : initialPosition}

            rotation={[0, 0, 0]}
            scale={hideDice ? [.1, .1, .1] : scale}
            materials={hideDice || isDots ? undefined : [`Material_${index}`]}
            type="OBJ"
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