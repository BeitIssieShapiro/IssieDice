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
import { Axes } from "./axes";
import { Viro3DPoint, ViroForce, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import DiceObject from "./dice";
import { Dice, Profile } from "./profile";
import { Dimensions, ScaledSize } from "react-native";
import { WinSize } from "./utils";

interface DiceSceneProps {
    initialImpulse: Viro3DPoint;
    initialTorque: Viro3DPoint;
    profile: Profile;
    windowSize: WinSize;
}
export interface DiceSceneMethods {
    rollDice: (impolse: Viro3DPoint, torque: Viro3DPoint) => void;
    update: (profile: Profile) => void;
    updateWindowSize: (winSize: WinSize) => void;
    updateCamera: (tilt: number) => void;
}

export const cameraPos: { p: Viro3DPoint, r: Viro3DPoint }[] = [
    { p: [0, 6, 2], r: [-60, 0, 0] },
    { p: [0, 6, 1], r: [-75, 0, 0] },
    { p: [0, 6, 0], r: [-90, 0, 0] },
]

export const DiceScene = forwardRef(({ initialImpulse, initialTorque, profile, windowSize }: DiceSceneProps, ref: any) => {
    const [sceneKey, setSceneKey] = useState<number>(0);
    const [cubeInfoKey, setCubeInfoKey] = useState<number>(0);
    const [impulse, setImpulse] = useState<Viro3DPoint>(initialImpulse);
    const [torque, setTorque] = useState<Viro3DPoint>(initialTorque);
    const [diceInfo, setDiceInfo] = useState<Dice[]>(profile.dice);
    const [diceSize, setDiceSize] = useState<number>(profile.size);
    const [sceneRevision, setSceneRevision] = useState<number>(0);
    const [currWindowSize, setCurrWindowSize] = useState<WinSize>(windowSize);
    const [cameraTilt, setCameraTilt] = useState<number>(0);
    const tableRef = useRef<any>(undefined);

    useEffect(() => ViroMaterials.createMaterials({
        ["tableSurface_" + profile.tableColor]: {
            diffuseColor: profile.tableColor,
            lightingModel: "Lambert"
        },
    }), []);


    useImperativeHandle(ref, (): DiceSceneMethods => ({
        rollDice: (i, t) => {
            setImpulse(i);
            setTorque(t);
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
    const w = w0 > h0 ? 10 : 6;
    const h = w0 > h0 ? 12 : 20;
    const wallH = 2;
    const scaledDiceSize = diceSize * .3 / 2;
    console.log("render scene", sceneRevision, currWindowSize)
    return (
        <ViroScene physicsWorld={{ gravity: [0, -9.8, 0], drawBounds: false }}>
            <ViroAmbientLight color="#FFFFFF" intensity={500} />
            <ViroSpotLight color="#FFFFFF" direction={[0, -1, 0]} castsShadow={true} />
            {/* <ViroText text={"w" + w + ",h:" + h} /> */}
            <ViroCamera active position={[0, 6, 2 - (cameraTilt * 2)]} rotation={[-60 - (cameraTilt * 30), 0, 0]} />


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
                    materials={[sceneRevision == 0 ? "tableSurface_0" : "tableSurface_" + profile.tableColor]}
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
                    materials={["wallMaterial"]}
                    physicsBody={{ type: "Static" }}
                />


                <ViroBox
                    position={[-w / 2, wallH / 2, 0]}
                    scale={[0.1, wallH, h]}
                    materials={["wallMaterial"]}
                    physicsBody={{ type: "Static" }}
                />
                <ViroBox
                    position={[w / 2, wallH / 2, 0]}
                    scale={[0.1, wallH, h]}
                    materials={["wallMaterial"]}
                    physicsBody={{ type: "Static" }}
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
                                (i + 1) * .1, 3, 2]}
                            template={d.template}
                            scale={[scaledDiceSize, scaledDiceSize, scaledDiceSize]}
                            initialImpulse={impulse}
                            initialTourqe={torque}

                        />
                    )
                    )}


            </ViroNode>
        </ViroScene>
    );
});