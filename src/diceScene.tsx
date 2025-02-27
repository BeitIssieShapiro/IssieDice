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
    ViroSpotLight,
    ViroMaterials,
    ViroText,
} from "@reactvision/react-viro";
import { Viro3DPoint, ViroForce, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import DiceObject from "./dice";
import { Dice, Profile } from "./profile";
import { WinSize } from "./utils";

interface DiceSceneProps {
    initialImpulse: Viro3DPoint;
    initialTorque: Viro3DPoint;
    profile: Profile;
    windowSize: WinSize;
}
export interface DiceSceneMethods {
    rollDice: () => void;
    update: (profile: Profile) => void;
    updateWindowSize: (winSize: WinSize) => void;
    updateCamera: (tilt: number) => void;
}

const noRotation: Viro3DPoint = [0, 0, 0];

export const DiceScene = forwardRef(({ initialImpulse, initialTorque, profile, windowSize }: DiceSceneProps, ref: any) => {
    const [sceneKey, setSceneKey] = useState<number>(0);
    const [cubeInfoKey, setCubeInfoKey] = useState<number>(0);
    const [impulse, setImpulse] = useState<Viro3DPoint>(initialImpulse);
    const [torque, setTorque] = useState<Viro3DPoint>(initialTorque);
    const [rotation, setRotation] = useState<Viro3DPoint[]>([
        noRotation, noRotation, noRotation, noRotation,
    ]);
    const [diceInfo, setDiceInfo] = useState<Dice[]>(profile.dice);
    const [diceSize, setDiceSize] = useState<number>(profile.size);
    const [sceneRevision, setSceneRevision] = useState<number>(0);
    const [currWindowSize, setCurrWindowSize] = useState<WinSize>(windowSize);
    const [cameraTilt, setCameraTilt] = useState<number>(0);
    const [faceSettled, setFaceSettled] = useState<number[]>([-1, -1, -1, -1])
    const tableRef = useRef<any>(undefined);

    useEffect(() => ViroMaterials.createMaterials({
        ["tableSurface_" + profile.tableColor]: {
            diffuseColor: profile.tableColor,
            lightingModel: "Lambert"
        },
    }), []);

    function handleFaceSettled(index: number, faceIndex: number) {
        setFaceSettled(prev => {
            const newFaces = [...prev];
            newFaces[index] = faceIndex;
            return newFaces;
        })
    }

    useImperativeHandle(ref, (): DiceSceneMethods => ({
        rollDice: () => {

            const fz = -(Math.random() / 5 + .3);
            const fy = -(Math.random() / 5 + .2);

            // Random angular velocity for all dice
            const avx = Math.random() / 6;
            const avy = Math.random() / 6;
            const avz = Math.random() / 6;
            const imp = [0, fy, fz] as Viro3DPoint;
            const trq = [avx, avy, avz] as Viro3DPoint;
            const randomRotation = () => Math.floor(360 * Math.random()) - 180;
            // diffrect rotation for each dice:
            const rot = [0, 1, 2, 3].map(index => {
                return [randomRotation(), randomRotation(), randomRotation()] as Viro3DPoint;
            })

            setImpulse(imp);
            setTorque(trq);
            setRotation(rot);
            setSceneKey(prev => prev + 1);
        },
        update: (profile) => {
            setDiceSize(profile.size);
            ViroMaterials.createMaterials({
                tableSurface: {
                    diffuseColor: profile.tableColor,
                    lightingModel: "Lambert"
                },
            });
            setDiceInfo(profile.dice);
            ViroMaterials.createMaterials({
                ["tableSurface_" + profile.tableColor]: {
                    diffuseColor: profile.tableColor,
                    lightingModel: "Lambert"
                },
            });
            // setSceneRevision(prev => prev + 1);
            tableRef.current?.setNativeProps({ materials: ["tableSurface_" + profile.tableColor] })
            setCubeInfoKey(prev => prev + 1);
        },
        updateWindowSize: (winSize: WinSize) => {
            setCurrWindowSize(winSize);
        },
        updateCamera: (tilt) => {
            if (tilt >= 0 && tilt < cameraPos.length) {
                console.log("update camera tilt", tilt)
                setCameraTilt(tilt);
            }
        }
    }));
    const w0 = currWindowSize.width
    const h0 = currWindowSize.height;
    const baseSize = h0 / 110;
    const ratio = w0 / h0;
    const w = Math.floor(baseSize * ratio);// w0 > h0 ? 10 : 7;
    const h = baseSize;// w0 > h0 ? 12 : 8;

    const wallH = 5;
    const scaledDiceSize = diceSize * .3 / 2;
    const floorMaterial = sceneRevision == 0 ? "tableSurface_0" : "tableSurface_" + profile.tableColor;
    console.log("render scene", sceneRevision, currWindowSize)
    return (
        <ViroScene physicsWorld={{ gravity: [0, -9.8, 0], drawBounds: false }}>
            <ViroAmbientLight color="#FFFFFF" intensity={500} />
            <ViroSpotLight color="#FFFFFF" direction={[0, -1, 0]} castsShadow={true} />
            {/*  <ViroText text={faceSettled.join(",")} scale={[4,4,4]}/>  */}
            {/* <ViroText text={ratio.toFixed(2) + "|" +
                windowSize.width + "," + windowSize.height + "|" + w + "," + h} scale={[4, 4, 4]} rotation={[-90, 0, 0]} /> */}
            <ViroCamera active position={[0, 5, 0]} rotation={[-90, 0, 0]} />
            {/* <ViroCamera active position={[0, 6, 2 - (cameraTilt * 4)]} rotation={[-60 - (cameraTilt * 30), 0, 0]} /> */}


            <ViroNode position={[0, 0, 0]}>

                {/* <ViroAmbientLight color="#ffffff" intensity={100}  />  */}
                {/* <ViroSpotLight color="#ffffff" intensity={300} position={[0, 5, 2]} direction={[0, 0, 0]} castsShadow={true} /> */}
                <ViroSpotLight
                    innerAngle={5}
                    outerAngle={85}
                    direction={[-1, -1.5, -.5]}
                    position={[2, 4, 1]}
                    color="#ffffff"
                    castsShadow={true}
                    shadowMapSize={2048}
                    shadowNearZ={2}
                    shadowFarZ={5}
                    shadowOpacity={1}
                    intensity={1500}
                />
                {// <ViroNode position={[-2.5, 0, -9]}>
                    //   <Axes />
                    //</ViroNode> 
                }
                {// Walls [red, blue, green]
                }

                {// Floor (table surface) 
                }
                < ViroQuad
                    ref={tableRef}
                    position={[0, 0, 0]}
                    rotation={[-90, 0, 0]}
                    width={w}
                    height={h}
                    materials={[floorMaterial]}
                    physicsBody={{
                        type: "Static",
                        friction: 0.9,
                        restitution: 0.7,
                    }}
                    shadowCastingBitMask={1.5}
                />

                {// Back Wall 
                }
                <ViroBox
                    position={[0, wallH / 2, -h / 2]}
                    scale={[w, wallH, 0.1]}
                    materials={[floorMaterial]}
                    physicsBody={{
                        type: "Static",
                        friction: 0.9,
                        restitution: 0.7,
                    }}
                />

                <ViroBox
                    position={[0, wallH / 2, h / 2]}
                    scale={[w, wallH, 0.1]}
                    materials={[floorMaterial]}
                    physicsBody={{
                        type: "Static",
                        friction: 0.9,
                        restitution: 0.7,
                    }}
                />


                <ViroBox
                    position={[-w / 2, wallH / 2, 0]}
                    scale={[0.1, wallH, h]}
                    materials={[floorMaterial]}
                    physicsBody={{
                        type: "Static",
                        friction: 0.9,
                        restitution: 0.7,
                    }}
                />
                <ViroBox
                    position={[w / 2, wallH / 2, 0]}
                    scale={[0.1, wallH, h]}
                    materials={[floorMaterial]}
                    physicsBody={{
                        type: "Static",
                        friction: 0.9,
                        restitution: 0.7,
                    }}
                />

                {diceInfo
                    .filter(d => d.active)
                    .map((d, i) => (
                        <DiceObject
                            key={i}//`dice${i}-${sceneKey}`}
                            index={i}
                            cubeInfoKey={cubeInfoKey + ""}
                            cubeKey={`dice${i}-${sceneKey}`}
                            initialPosition={[i < profile.dice.length / 2 ?
                                -(i + 1) * .1 :
                                (i + 1) * .1, 4, 2]}
                            initialRotation={rotation[i]}
                            template={d.template}
                            scale={[scaledDiceSize, scaledDiceSize, scaledDiceSize]}
                            initialImpulse={impulse}
                            initialTourqe={torque}
                            onFaceSettled={(faceIndex: number) => handleFaceSettled(i, faceIndex)}
                        />
                    )
                    )}


            </ViroNode>
        </ViroScene>
    );
});