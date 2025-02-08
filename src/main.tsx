// App.tsx
import React, { useRef, useState } from "react";
import { View, StyleSheet, Button, TouchableOpacity } from "react-native";
import {
  Viro3DSceneNavigator,
  ViroCamera,
  ViroMaterials,
  ViroScene,
  ViroText,
} from "@reactvision/react-viro";
import { DiceScene, DiceSceneMethods } from "./diceScene";

// 1) Define a dice material up front
ViroMaterials.createMaterials({
  diceMaterial: {
    diffuseColor: "#FFA500",

  },
  redLine: { diffuseColor: '#FF0000' },
  greenLine: { diffuseColor: '#00FF00' },
  blueLine: { diffuseColor: '#0000FF' },

  front: {
    //diffuseColor: '#FF0000',
    diffuseTexture: require("../assets/1.png"),
    diffuseColor: '#FFFFFF',
  },
  back: {
    diffuseTexture: require("../assets/1.png"),
    diffuseColor: '#FFFFFF',
  },
  left: {
    diffuseTexture: require("../assets/1.png"),
    diffuseColor: '#FFFFFF',
  },
  right: {
    diffuseTexture: require("../assets/1.png"),
    diffuseColor: '#FFFFFF',
  },
  top: {
    diffuseColor: '#FFFFFF',
    diffuseTexture: require("../assets/1.png"),
  },
  bottom: {
    diffuseTexture: require("../assets/1.png"),
    diffuseColor: '#FFFFFF',
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

const TestScene = () => <ViroScene>
  {/* <ViroCamera position={[-1, 0, 0]} active={true} /> */}
  <ViroText text="Hello!" position={[-1, 0, -1]} />
</ViroScene>

const initialImpulse = [0, -.2, -.2];

const initialTorque = [.01, .05, -.05];

export default function App() {
  const sceneRef = useRef<DiceSceneMethods>(undefined); // Create a ref for the scene

  // State for dice velocity/spin
  const [initialVelocity, setInitialVelocity] = useState<[number, number, number]>(
    [1, 0, -2]
  );
  const [initialAngularVelocity, setInitialAngularVelocity] = useState<
    [number, number, number]
  >([5, 5, 0]);

  // 2) Handler for "Throw Dice" button
  const handleThrowDice = () => {
    const fz = -(Math.random() / 6 + .1);
    const fx = -(Math.random() / 6 + .15);

    // Random angular velocity
    const avx = Math.random() / 8;
    const avy = Math.random() / 8;
    const avz = Math.random() / 8;

    sceneRef.current?.rollDice([0, fx, fz], [avx, avy, avz]);
  };

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
            scene: DiceScene,
            passProps: {
              ref: sceneRef,
              initialImpulse,
              initialTorque
            }
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