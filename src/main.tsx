// App.tsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Button, TouchableOpacity, SafeAreaView, Linking, Alert, Text, Dimensions } from "react-native";
import {
  Viro3DSceneNavigator,
  ViroCamera,
  ViroMaterials,
  ViroScene,
  ViroText,
} from "@reactvision/react-viro";
import { cameraPos, DiceScene, DiceSceneMethods } from "./diceScene";
import Icon from 'react-native-vector-icons/AntDesign';
import { SettingsUI } from "./settings";
import { importPackage, Profile, readCurrentProfile } from "./profile";
import { GlobalContext } from "./global-context";
import * as Progress from 'react-native-progress';
import { fTranslate, isRTL, translate } from "./lang";
import { WinSize } from "./utils";
import Slider from '@react-native-community/slider';


// 1) Define a dice material up front
ViroMaterials.createMaterials({
  redLine: { diffuseColor: '#FF0000' },
  greenLine: { diffuseColor: '#00FF00' },
  blueLine: { diffuseColor: '#0000FF' },
  tableSurface_0: {
    diffuseColor: 'green',
    lightingModel: "Lambert"
  },
  default: {
    diffuseColor: 'white',
    lightingModel: "Lambert"
  },

  wallMaterial: {
    diffuseColor: "lightgray", // Dark walls
    lightingModel: "Lambert"
  },
});

const initialImpulse = [0, -.3, -.3];
const initialTorque = [.01, .08, -.08];

export default function App() {
  const [windowSize, setWindowSize] = useState<WinSize>({ width: 500, height: 500 });
  const [openSettings, setOpenSettings] = useState<boolean>(false);
  const [revision, setRevision] = useState<number>(0);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [inRecovery, setInRecovery] = useState<boolean>(false);
  const [cameraTilt, setCameraTilt] = useState<number>(0);

  const [importInProgress, setImportInProgress] = useState<{
    message: string;
    precent: number;
  } | undefined>();
  const inRecoveryRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const context = useContext(GlobalContext);

  useEffect(() => {

    Linking.addEventListener("url", handleImport);

    if (context && context.url) {
      setTimeout(() => handleImport({ url: context.url }));
    }

    const winDimChange = Dimensions.addEventListener("change", (e) => setWindowSize({ width: e.window.width, height: e.window.height }))

    return () => {
      winDimChange.remove();
      console.log("about to unmount")
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.updateWindowSize(windowSize);
  }, [windowSize]);

  useEffect(() => {
    sceneRef.current?.updateCamera(cameraTilt);
  }, [cameraTilt]);

  async function handleImport(event: any) {
    console.log("handleImport event:", JSON.stringify(event));
    let url = event.url
    url = decodeURI(url);
    //url = await FileSystem.contentUriToFilePath(url);

    //Alert.alert("Import: " + url);
    setImportInProgress({
      message: translate("ImportInProgress"),
      precent: 0,
    })

    importPackage(url)
      .then(() => Alert.alert("SuccessfulImport"))
      .finally(() => setImportInProgress(undefined))

  }


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

    const fz = -(Math.random() / 6 + .2);
    const fy = -(Math.random() / 6 + .5);

    // Random angular velocity
    const avx = Math.random() / 7;
    const avy = Math.random() / 7;
    const avz = Math.random() / 7;

    sceneRef.current?.rollDice([0, fy, fz], [avx, avy, avz]);
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
          {/** Progress */}
          {importInProgress && <View style={styles.progressBarHost}>
            <Text style={{ fontSize: 28, marginBottom: 5 }}>{importInProgress.message}</Text>
            <Progress.Bar width={windowSize.width * .6} progress={importInProgress.percent / 100} style={[isRTL() && { transform: [{ scaleX: -1 }] }]} />
          </View>}

          <View style={ styles.slider }>
            <Slider
              vertical={true}
              style={{ width: 200, height: 40 }}
              minimumValue={0}
              maximumValue={1}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="#000000"
              onValueChange={(val) => setCameraTilt(val)}
              value={cameraTilt}
            />
          </View>

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
              windowSize,
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
  settingsButton: { position: "absolute", top: 35, right: 15, zIndex: 600 },
  progressBarHost: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 3.84,
    borderRadius: 10,
    padding: 10,
    top: '25%', left: '15%', width: '70%', zIndex: 1000,
    backgroundColor: 'white', alignItems: 'center'
  },
  slider: {
    position:"absolute",
    top: 20,
    left: 150
  }
});