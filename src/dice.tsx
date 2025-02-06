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
    ViroOrbitCamera,
} from "@reactvision/react-viro";
import { Axes } from "./axes";
import { Viro3DPoint, ViroForce, ViroScale } from "@reactvision/react-viro/dist/components/Types/ViroUtils";

interface DiceSceneProps {
    sceneNavigator: {
        viroAppProps: {
            initialVelocity: [number, number, number];
            initialAngularVelocity: [number, number, number];
            sceneKey: string;
        };
    };
}

const x = require("../cube2.bin")
// Define positions and rotations for the floor
const floorPosition: [number, number, number] = [0, 0, -3];
const floorRotation: [number, number, number] = [90, 0, 0];
const initialPosition: Viro3DPoint = [0, 2, -3];
const initialImpulse: [number, number, number] = [0, 0, -.2];
const initialTourqe: [number, number, number] = [0, .1, 0];
const wallHeight = 2

export default function DiceScene(props: DiceSceneProps) {
    const { initialVelocity, initialAngularVelocity, sceneKey } =
        props.sceneNavigator.viroAppProps;
    const cube = useRef<Viro3DObject | null>(undefined);
    //const scene = useRef<ViroScene | null>(undefined);
    const [hideDice, setHideDice] = useState<boolean>(false);

    useEffect(() => {
        console.log("reset cube", sceneKey, cube.current)
        setHideDice(true);
        setTimeout(() => {
            console.log("show cube")
            setHideDice(false)
            setTimeout(() => shootDice(), 50);
        }, 100)

    }, [sceneKey])


    const shootDice = () => {
        // Apply a one-time impulse to "kick" the dice into motion.
        cube.current.applyImpulse(initialImpulse, [0, 0, 0]);
        cube.current?.applyTorqueImpulse(initialImpulse);
    }

    const onDiceLoadEnd = () => {
        if (cube.current) {
            shootDice()
        }
    };
    //console.log ("scene",scene.current)

    return (
        // Enable the physics world by passing a physicsWorld prop.
        // (The API here may vary slightly depending on your Viro version.)
        <ViroScene physicsWorld={{ gravity: [0, -9.8, 0], drawBounds: false }}
        //ref={r => scene.current = r}      
        //rotation={[0.1, 0, 0]}
        >
            <ViroCamera active position={[0, 4, 2]} rotation={[-25, 0, 0]}/>


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
                        restitution: 0.2,
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


                {/* Dice 3D Object */}
                <Viro3DObject
                    key={`dice-${sceneKey}`} // Changing the key will force a re-mount.
                    ref={r => cube.current = r}
                    onLoadEnd={!hideDice ? onDiceLoadEnd : undefined}
                    source={require("../cube2.obj")} 
                    position={[0, 4, -1]}
                    rotation={[0, 0, 0]}
                    scale={[0.4, 0.4, 0.4]}
                    materials={[
                        "front",  // Front face
                        "back",   // Back face
                        "left",   // Left face
                        "right",  // Right face
                        "top",    // Top face
                        "bottom", // Bottom face
                    ]}
                    //materials={[ "top"]}
                    type="OBJ"
                    onError={(error) => console.error("Viro3DObject error:", error.nativeEvent.error)}
                    physicsBody={hideDice ? undefined :
                        {
                            type: "Dynamic",
                            mass: 0.1,
                            //velocity: initialVelocity,
                            //force: { value: [-1, 0, 0] },
                            //angularVelocity: initialAngularVelocity,
                            friction: 0.3,
                            restitution: 0.2,
                            useGravity: true,
                        }}
                />
            </ViroNode>
        </ViroScene>
    );
}