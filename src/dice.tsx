// DiceScene.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    Viro3DObject,
    ViroMaterials,
    ViroText,
} from "@reactvision/react-viro";
import { Viro3DPoint, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import { getCustomTypePath, getRandomFile, Templates, templatesList } from "./profile";
import { getFaceIndex, getRotationCorrectionForTopFace, isSamePoint } from "./utils";

interface DiceProps {
    cubeKey: string;
    cubeInfoKey: string;
    index: number;
    initialPosition: Viro3DPoint;
    scale: Viro3DPoint;
    initialImpulse: Viro3DPoint;
    initialTourqe: Viro3DPoint;
    template: Templates;
    onFaceSettled: (face: number) => void;
}

const cubeDots = require("../assets/dot-dice.obj");
const cubeEmpty = require("../assets/dice-empty.obj");


export default function DiceObject({ cubeKey, cubeInfoKey, index, template, initialPosition, scale,
    initialImpulse, initialTourqe, onFaceSettled }: DiceProps) {
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
            onFaceSettled(-1)
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


    function animateRotation(
        current: [number, number, number],
        target: [number, number, number],
        duration: number = 500
      ) {
        const startTime = Date.now();
      
        function step() {
          const elapsed = Date.now() - startTime;
          const t = Math.min(elapsed / duration, 1); // t in [0, 1]
          const interpolated: [number, number, number] = [
            current[0] + (target[0] - current[0]) * t,
            current[1] + (target[1] - current[1]) * t,
            current[2] + (target[2] - current[2]) * t,
          ];
          cube.current?.setNativeProps({ rotation: interpolated });
          if (t < 1) {
            requestAnimationFrame(step);
          }
        }
        requestAnimationFrame(step);
      }

    useEffect(() => {
        let prevProps: any = undefined;
        let interval: NodeJS.Timeout | undefined = setInterval(() => {
            if (cube.current) {
                cube.current.getTransformAsync().then((props: any) => {
                    console.log(props);

                    if (prevProps && isSamePoint(prevProps.position, props.position) &&
                        isSamePoint(prevProps.rotation, props.rotation)) {
                        // object at rest
                        const faceUp = getFaceIndex(props.rotation);
                        onFaceSettled(faceUp);

                        const fixRotation = getRotationCorrectionForTopFace(faceUp, props.rotation);
                        console.log("Dice", index, "At Rest", prevProps.rotation);
                        //cube.current?.setNativeProps({rotation:fixRotation})
                        animateRotation(props.rotation, fixRotation, 1000);

                        clearInterval(interval);
                        interval = undefined;
                    }

                    prevProps = props;

                });
            }
        }, 500); // Check every second

        return () => {
            if (interval != undefined) clearInterval(interval)
        }
    }, [cubeKey]);

    const isDots = template == Templates.Dots
    return (isDots ?
        <Viro3DObject
            key={"dots"}
            ref={r => cube.current = r}
            onLoadEnd={!hideDice ? onDiceLoadEnd : undefined}

            // onTransformUpdate={pos=>{
            //     console.log("on transform", pos)
            // }}
            // onRotate={(state)=>{
            //     console.log("on rotate", state)
            // }}
            // highAccuracyEvents={true}

            source={cubeDots}
            position={hideDice ? [5, 5, 5] : initialPosition}

            rotation={[0, 0, 0]}
            scale={hideDice ? [.1, .1, .1] : scale}
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