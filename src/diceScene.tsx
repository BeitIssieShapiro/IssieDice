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
} from "@reactvision/react-viro";
import { Axes } from "./axes";
import { Viro3DPoint, ViroForce, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import DiceObject from "./dice";
import { Dice, Profile } from "./profile";

interface DiceSceneProps {
    initialImpulse: Viro3DPoint;
    initialTorque: Viro3DPoint;
    profile: Profile;
}
export interface DiceSceneMethods {
    rollDice: (impolse: Viro3DPoint, torque: Viro3DPoint) => void;
    update: (profile: Profile) => void;

}

const wallHeight = 2

export const DiceScene = forwardRef(({ initialImpulse, initialTorque, profile }: DiceSceneProps, ref: any) => {
    const [sceneKey, setSceneKey] = useState<number>(0);
    const [impulse, setImpulse] = useState<Viro3DPoint>(initialImpulse);
    const [torque, setTorque] = useState<Viro3DPoint>(initialTorque);
    const [diceInfo, setDiceInfo] = useState<Dice[]>(profile.dice);
    const [sceneRevision, setSceneRevision] = useState<number>(0);

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
            tableRef.current?.setNativeProps({materials: ["tableSurface_" + profile.tableColor]})
        }
    }));


    console.log("render scene", sceneRevision)
    return (
        <ViroScene physicsWorld={{ gravity: [0, -9.8, 0], drawBounds: false }}>
            <ViroAmbientLight color="#FFFFFF" intensity={500} />
            <ViroSpotLight color="#FFFFFF" direction={[0, -1, 0]} castsShadow={true} />

            <ViroCamera active position={[0, 5, 2]} rotation={[-60, 0, 0]} />


            <ViroNode position={[0, 0, 0]} >

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
                    position={[0, 0, -2]}
                    rotation={[-90, 0, 0]}
                    width={6}
                    height={15}
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

                {diceInfo
                    .filter(d => d.active)
                    .map((d, i) => (
                        <DiceObject
                            key={`dice${i}-${sceneKey}`}
                            index={i}
                            cubeKey={`dice${i}-${sceneKey}`}
                            initialPosition={[i < profile.dice.length / 2 ? -(i + 1) * .1 : (i + 1) * .1, 3, 2]}
                            template={d.template}
                            scale={[0.3 * profile.size / 2, 0.3 * profile.size / 2, 0.3 * profile.size / 2]}
                            initialImpulse={impulse}
                            initialTourqe={torque}

                        />
                    )

                    )}


            </ViroNode>
        </ViroScene>
    );
});