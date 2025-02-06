// App.tsx
import React, { useState } from "react";
import { View, StyleSheet, Button, TouchableOpacity } from "react-native";
import {
    Viro3DSceneNavigator,
    ViroCamera,
    ViroMaterials,
    ViroScene,
    ViroText,
} from "@reactvision/react-viro";
import DiceScene from "./dice";

// 1) Define a dice material up front
ViroMaterials.createMaterials({
    diceMaterial: {
        diffuseColor: "#FFA500",

    },
    redLine: { diffuseColor: '#FF0000' },
    greenLine: { diffuseColor: '#00FF00' },
    blueLine: { diffuseColor: '#0000FF' },
    front: {
        diffuseColor: '#FF0000',
      },
      back: {
        diffuseColor: '#FF0000',
      },
      left: {
        diffuseColor: '#FF0000',
      },
      right: {
        diffuseColor: '#FFFF00',
      },
      top: {
        diffuseColor: '#FF00FF',
      },
      bottom: {
        diffuseColor: '#00FFFF',
      },
      tableSurface: {
        diffuseColor: "#008000", // Green like a casino table
      },
      wallMaterial: {
        diffuseColor: "#ffffff", // Dark walls
      },
    //   dice1: { diffuseTexture: require('./res/dice_1.png') },
    //   dice2: { diffuseTexture: require('./res/dice_2.png') },
});

const TestScene = ()=><ViroScene>
{/* <ViroCamera position={[-1, 0, 0]} active={true} /> */}
<ViroText  text="Hello!" position={[-1, 0, -1]} />
</ViroScene>


export default function App() {
    const [sceneKey, setSceneKey] = useState(0);

    // State for dice velocity/spin
    const [initialVelocity, setInitialVelocity] = useState<[number, number, number]>(
        [1, 0, -2]
    );
    const [initialAngularVelocity, setInitialAngularVelocity] = useState<
        [number, number, number]
    >([5, 5, 0]);

    // 2) Handler for "Throw Dice" button
    const handleThrowDice = () => {
        // Random linear velocity
        const vx = Math.random() * 4 - 2; // between -2 and +2
        const vy = Math.random() * 2 + 2; // between 2 and 4
        const vz = -(Math.random() * 2 + 2); // negative (further away if camera looks -Z)

        // Random angular velocity
        const avx = Math.random() * 10 - 5;
        const avy = Math.random() * 10 - 5;
        const avz = Math.random() * 10 - 5;

        setInitialVelocity([vx, vy, vz]);
        setInitialAngularVelocity([avx, avy, avz]);

        // Changing the key forces a re-mount of DiceScene -> new throw
        setSceneKey(sceneKey => sceneKey + 1);
    };

    // 3) "Viro3DSceneNavigator" usage
    //    - pass in "viroAppProps" so DiceScene can read velocity/spin
    //    - required props: initialScene, onExitViro, etc.
    return (
        <TouchableOpacity style={styles.container} >
            <Button title="Throw Dice" onPress={handleThrowDice} style={styles.button} />
            <View style={styles.viroContainer}>
                <Viro3DSceneNavigator
                    debug={true}
                    onExitViro={() => {
                        console.log("Exiting Viro...");
                    }}
                    initialScene={{
                        scene: DiceScene ,
                    }}
                    viroAppProps={{
                        sceneKey,
                        initialVelocity,
                        initialAngularVelocity,
                    }}
                    // optional rendering settings
                    hdrEnabled={true}
                    pbrEnabled={true}
                    bloomEnabled={false}
                    shadowsEnabled={true}
                    multisamplingEnabled={true}
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    viroContainer: { flex: 1 },
    button: { position: "absolute", bottom: 100, width: 100, height: 50 }
});