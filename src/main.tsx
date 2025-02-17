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
  redLine: { diffuseColor: '#FF0000' },
  greenLine: { diffuseColor: '#00FF00' },
  blueLine: { diffuseColor: '#0000FF' },
  tableSurface_0: {
    diffuseColor: 'green',
    lightingModel: "Lambert"
  },

  wallMaterial: {
    diffuseColor: "#ffffff", // Dark walls
    lightingModel: "Lambert"
  },
});

const initialImpulse = [0, -.2, -.2];

const initialTorque = [.01, .05, -.05];

export default function App() {
  const [windowSize, setWindowSize] = useState({ width: 500, height: 500 });
  const [openSettings, setOpenSettings] = useState<boolean>(false);
  const [revision, setRevision] = useState<number>(0);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [inRecovery, setInRecovery] = useState<boolean>(false);
  const inRecoveryRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      console.log("about to unmount")
    }
  }, [])


  useEffect(() => {
    console.log("App reloading profile")
    readCurrentProfile().then(p => {
      setProfile(p);
      setTimeout(() => updateDiceScene(p), 100);

    })
  }, [revision]);


  const sceneRef = useRef<DiceSceneMethods>(undefined);

  const handleThrowDice = () => {
    if (inRecoveryRef.current && profile?.recoveryTime) {
      return;
    }
    if (profile && profile.recoveryTime > 0) {
      inRecoveryRef.current = setTimeout(() => {
        if (inRecoveryRef.current != undefined) {
          clearTimeout(inRecoveryRef.current);
          inRecoveryRef.current = undefined;
          setInRecovery(false);
        }
      }, profile?.recoveryTime! * 1000);
      setInRecovery(true);
    }

    const fz = -(Math.random() / 6 + .1);
    const fx = -(Math.random() / 6 + .15);

    // Random angular velocity
    const avx = Math.random() / 8;
    const avy = Math.random() / 8;
    const avz = Math.random() / 8;

    sceneRef.current?.rollDice([0, fx, fz], [avx, avy, avz]);
  };

  const updateDiceScene = (profile: Profile) => {

    sceneRef.current?.update(profile);
  };

  console.log("current profile", profile)
  return (
    <SafeAreaView style={styles.container} onLayout={(e) => {
      let wz = e.nativeEvent.layout;
      setWindowSize(wz);
    }}>

      <TouchableOpacity style={styles.settingsButton}
        onPress={() => setOpenSettings(true)}
      >
        <Icon name={"setting"} color={"white"} size={35} />
      </TouchableOpacity>

      {openSettings && <SettingsUI windowSize={windowSize} onChange={() => setRevision(prev => prev + 1)} onClose={() => setOpenSettings(false)} />}
      <>
        {!openSettings && <TouchableOpacity style={styles.overlay}
          onPress={handleThrowDice}
          activeOpacity={1}
        >
          {/** indicator to a lock */}
          {inRecovery && <View style={styles.lockIndicator} />}
        </TouchableOpacity>}
        {profile && <Viro3DSceneNavigator
          style={styles.viroContainer}
          onTouchEnd={handleThrowDice}
          debug={true}
          // onExitViro={() => {
          //   console.log("Exiting Viro...");
          // }}

          initialScene={{
            scene: DiceScene,
            passProps: {
              ref: sceneRef,
              initialImpulse,
              initialTorque,
              profile: revision >= 0 && profile ? profile : { dice: [] },
            }
          }}

          // optional rendering settings
          hdrEnabled={false}
          pbrEnabled={false}
          bloomEnabled={false}
          // hdrEnabled={true}
          // pbrEnabled={true}
          // bloomEnabled={false}
          shadowsEnabled={true}
        // multisamplingEnabled={true}
        />}
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
  lockIndicator: {
    position: "absolute",
    left: 5, top: 4,
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: "red"
  },
  viroContainer: {
    backgroundColor: "red",
  },
  settingsButton: { position: "absolute", top: 25, right: 10, zIndex: 600 }
});