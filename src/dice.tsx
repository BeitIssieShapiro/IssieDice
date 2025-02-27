// DiceScene.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    Viro3DObject,
    ViroAnimations,
    ViroMaterials,
    ViroSound,
    ViroText,
} from "@reactvision/react-viro";
import { Viro3DPoint, ViroPhysicsBody, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import { getCustomTypePath, getRandomFile, Templates, templatesList } from "./profile";
import { getFaceAndQuaternionDelta, isSamePoint } from "./utils";
const dieSound = require("../assets/dice-sound.mp3");

interface DiceProps {
    cubeKey: string;
    cubeInfoKey: string;
    index: number;
    initialPosition: Viro3DPoint;
    initialRotation: Viro3DPoint;
    scale: Viro3DPoint;
    initialImpulse: Viro3DPoint;
    initialTourqe: Viro3DPoint;
    template: Templates;
    onFaceSettled: (face: number) => void;
}

const cubeDots = require("../assets/dot-dice.obj");
const cubeEmpty = require("../assets/dice-empty.obj");


export default function DiceObject({ cubeKey, cubeInfoKey, index, template, initialPosition, initialRotation, scale,
    initialImpulse, initialTourqe, onFaceSettled }: DiceProps) {
    const cube = useRef<Viro3DObject>(null);
    const soundRef = useRef<ViroSound>(null);
    const [hideDice, setHideDice] = useState<boolean>(false);
    const [rotateAnimation, setRotateAnimation] = useState<string | undefined>();
    const [playDiceSound, setPlayDiceSound] = useState<boolean>(false);
    const [collisionSoundVolume, setCollisionSoundVolume] = useState<number>(1.0);
    const currentVelocity = useRef<Viro3DPoint>([0, 0, 0])

    const onDiceCollision = (a, position, c) => {
        if (position && position[1] < .1) {
            // assume a collision with floor
            setPlayDiceSound(true);
            const volume = Math.abs(currentVelocity.current ? currentVelocity.current[1] : 1);
            setCollisionSoundVolume(volume)
            console.log("dice hit floor", index, volume, currentVelocity.current, position, c)
            //audioRecorderPlayer.startPlayer(dieSound)
            // soundRef.current?.setNativeProps({
            //     volume,
            //     paused: false
            // })
        }
        //console.log("onDiceCollision", a, position, c)
    };

    const onSoundFinished = () => {
        setPlayDiceSound(false);
        // soundRef.current?.setNativeProps({
        //     paused: true
        // })
    };

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
        delta: [number, number, number],
        duration: number = 500
    ) {
        if (duration == 0) {
            cube.current?.setNativeProps({ rotation: current.map((n,i)=>n+delta[i]) });
        }

        function easeInOutCubic(t: number): number {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        const startTime = Date.now();

        function step() {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const tEased = easeInOutCubic(t);

            // Compute the interpolated rotation using the eased time.
            const interpolated: [number, number, number] = [
                current[0] + delta[0] * tEased,
                current[1] + delta[1] * tEased,
                current[2] + delta[2] * tEased,
            ];

            cube.current?.setNativeProps({ rotation: interpolated });

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                // Final correction: set exactly to current+delta
                cube.current?.setNativeProps({
                    rotation: [
                        current[0] + delta[0],
                        current[1] + delta[1],
                        current[2] + delta[2]
                    ]
                });
            }
        }

        requestAnimationFrame(step);
    }

    useEffect(() => {
        let prevProps: any = undefined;
        let sameCount = 0;
        let interval: NodeJS.Timeout | undefined = setInterval(() => {
            if (cube.current) {
                cube.current.getTransformAsync().then((props: any) => {
                    //console.log("props", props)
                    if (prevProps) {
                        const { position: pos } = props, { position: prevPos } = prevProps;

                        currentVelocity.current = prevPos.map((pp: number, i: number) => (pp - pos[i]) / (50 / 1000))
                    }

                    if (prevProps && isSamePoint(prevProps.position, props.position, 0.1) &&
                        isSamePoint(prevProps.rotation, props.rotation, 0.1)) {
                        sameCount++;
                        if (sameCount > 10) {
                            // object at rest
                            const { face, delta } = getFaceAndQuaternionDelta(props.rotation)
                            onFaceSettled(face);

                            console.log("Dice", index, "At Rest", face, prevProps.rotation, delta);
                            animateRotation(props.rotation, delta, face == "Bottom" ? 0 : 1000);
                            setRotateAnimation("fixTop")

                            clearInterval(interval);
                            interval = undefined;
                        }
                    } else {
                        sameCount = 0;
                    }

                    prevProps = props;

                });
            }
        }, 50);
        return () => {
            if (interval != undefined) clearInterval(interval)
        }
    }, [cubeKey]);

    const isDots = template == Templates.Dots
    const physics: ViroPhysicsBody = hideDice ?
        {
            type: "Dynamic",
            velocity: [.01, .01, .01],
            mass: 0.1,
        } :
        {
            type: "Dynamic",
            mass: 0.1,
            friction: 0.3,
            restitution: 0.7,
            useGravity: true,
            enabled: true,
        }
    
    return (
        <>
            <ViroSound //ref={soundRef}
                source={dieSound}
                paused={!playDiceSound}
                onFinish={onSoundFinished}
                volume={1.0}
                loop={false} />
            {isDots ?
                <Viro3DObject
                    key={"dots"}
                    ref={r => cube.current = r}
                    onLoadEnd={!hideDice ? onDiceLoadEnd : undefined}
                    onCollision={onDiceCollision}
                    highAccuracyEvents={true}
                    source={cubeDots}
                    position={hideDice ? [5, 5, 5] : initialPosition}
                    rotation={hideDice ? [0, 0, 0] : initialRotation}
                    scale={hideDice ? [.1, .1, .1] : scale}
                    type="OBJ"
                    physicsBody={physics}
                    lightReceivingBitMask={1.5}
                /> :
                <Viro3DObject
                    key={"other"}
                    ref={r => cube.current = r}
                    onLoadEnd={!hideDice ? onDiceLoadEnd : undefined}
                    onCollision={onDiceCollision}
                    highAccuracyEvents={true}
                    source={cubeEmpty}
                    position={hideDice ? [5, 5, 5] : initialPosition}
                    rotation={hideDice ? [0, 0, 0] : initialRotation}
                    scale={hideDice ? [.1, .1, .1] : scale}
                    materials={hideDice || isDots ? undefined : [`Material_${index}`]}
                    type="OBJ"
                    physicsBody={physics}
                    lightReceivingBitMask={1.5}
                />}
        </>);
}