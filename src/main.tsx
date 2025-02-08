// App.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Button, TouchableOpacity, SafeAreaView } from "react-native";
import {
  Viro3DSceneNavigator,
  ViroCamera,
  ViroMaterials,
  ViroScene,
  ViroText,
} from "@reactvision/react-viro";
import { DiceScene, DiceSceneMethods } from "./diceScene";
import Icon from 'react-native-vector-icons/AntDesign';
import { SettingsUI } from "./settings";
import { Profile, readCurrentProfile } from "./profile";


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
    diffuseTexture: require("../assets/colors.png"),
    diffuseColor: '#FFFFFF',
  },
  back: {
    diffuseTexture: require("../assets/colors.png"),
    diffuseColor: '#FFFFFF',
  },
  left: {
    diffuseTexture: require("../assets/numbers.png"),
    diffuseColor: '#FFFFFF',
  },
  right: {
    diffuseTexture: require("../assets/numbers.png"),
    diffuseColor: '#FFFFFF',
  },
  top: {
    diffuseColor: '#FFFFFF',
    diffuseTexture: require("../assets/numbers.png"),
  },
  bottom: {
    diffuseTexture: require("../assets/numbers.png"),
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

const initialImpulse = [0, -.2, -.2];

const initialTorque = [.01, .05, -.05];

export default function App() {
  const [windowSize, setWindowSize] = useState({ width: 500, height: 500 });
  const [openSettings, setOpenSettings] = useState<boolean>(false);
  const [revision, setRevision] = useState<number>(0);
  const [profile, setProfile] = useState<Profile>(readCurrentProfile());

  useEffect(() => {
    console.log("App reloading profile")
    const p = readCurrentProfile();
    setProfile(p);
    updateDiceScene(p);
  }, [revision]);


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

  const updateDiceScene = (profile: Profile) => {

    sceneRef.current?.update(profile.dice);
  };


  return (
    <SafeAreaView style={styles.container} onLayout={(e) => {
      let wz = e.nativeEvent.layout;
      setWindowSize(wz);
    }}>

      <TouchableOpacity style={styles.settingsButton}
        onPress={() => setOpenSettings(prev => !prev)}
      >
        <Icon name={openSettings ? "close" : "setting"} color={openSettings ? "black" : "white"} size={35} />
      </TouchableOpacity>

      {openSettings && <SettingsUI windowSize={windowSize} onChange={() => setRevision(prev => prev + 1)} />}
      <>
        {!openSettings && <TouchableOpacity style={styles.overlay}
          onPress={handleThrowDice}
          activeOpacity={1}
        />}
        <Viro3DSceneNavigator
          style={styles.viroContainer}
          onTouchEnd={handleThrowDice}
          debug={true}
          onExitViro={() => {
            console.log("Exiting Viro...");
          }}
          initialScene={{
            scene: DiceScene,
            passProps: {
              ref: sceneRef,
              initialImpulse,
              initialTorque,
              dice: revision >= 0 ? profile.dice : [],
            }
          }}

          // optional rendering settings
          hdrEnabled={true}
          pbrEnabled={true}
          bloomEnabled={false}
          shadowsEnabled={true}
          multisamplingEnabled={true}
        />
      </>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  overlay: {
    flex: 1,
    position: "absolute",
    top: 0, left: 0, width: "100%", height: "100%",
    backgroundColor: "transparent",
    zIndex: 500
  },
  viroContainer: {
    backgroundColor: "red",
  },
  settingsButton: { position: "absolute", top: 25, right: 10, zIndex: 1000 }
});