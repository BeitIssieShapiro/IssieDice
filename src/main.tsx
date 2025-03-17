// App.tsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Button, TouchableOpacity, SafeAreaView, Linking, Alert, Text, Dimensions } from "react-native";

import { DiceScene, DiceSceneMethods } from "./diceScene";
import Icon from 'react-native-vector-icons/AntDesign';
import { SettingsUI } from "./settings";
import { EmptyProfile, importPackage, migrateV1, Profile, readCurrentProfile } from "./profile";
import { GlobalContext } from "./global-context";
import * as Progress from 'react-native-progress';
import { isRTL, translate } from "./lang";
import { WinSize } from "./utils";
import { FilamentScene } from "react-native-filament";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MigrateDice } from "./migrate-dice";
import { CountdownEditButton } from "./settings-btn";

const initialImpulse = [0, -.3, -.3];
const initialTorque = [.15, .08, -.08];

export default function App({migratedDice}:{migratedDice:string[]}) {
  const [windowSize, setWindowSize] = useState<WinSize>({ width: 500, height: 500 });
  const [openSettings, setOpenSettings] = useState<boolean>(false);
  const [revision, setRevision] = useState<number>(0);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [inRecovery, setInRecovery] = useState<boolean>(false);
  const [cameraTilt, setCameraTilt] = useState<number>(0);
  const [migrateDice, setMigrateDice] = useState<string[]>([]);

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

    migrateV1().then(migrateDice => {
      setMigrateDice(migrateDice)
    })

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
      .catch(err=>Alert.alert(translate("ImportError"), err))
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


    sceneRef.current?.rollDice();
  };

  const updateDiceScene = (profile: Profile) => {

    sceneRef.current?.update(profile);
  };

  const insets = useSafeAreaInsets();

  console.log("current profile", profile)
  return (
    <SafeAreaView style={styles.container} onLayout={(e) => {
      let wz = e.nativeEvent.layout;
      setWindowSize(wz);
    }}>

      {/* <TouchableOpacity style={[styles.settingsButton, { top: Math.max(35, 15 + insets.top) }]}
        onPress={() => setOpenSettings(true)}
      >
        <Icon name={"setting"} color={"white"} size={35} />
      </TouchableOpacity> */}

      <CountdownEditButton iconSize={35} onComplete={()=>setOpenSettings(true)} top={ Math.max(35, 15 + insets.top) }/>

      {migrateDice.length > 0 && <MigrateDice migrateDice={migrateDice} setMigrateDice={setMigrateDice}
        winWidth={windowSize.width} />}

      {openSettings && <SettingsUI windowSize={windowSize} onChange={() => setRevision(prev => prev + 1)} onClose={() => setOpenSettings(false)} />}
      <>
        {/** indicator to a lock */}
        {inRecovery && <View style={[styles.lockIndicator, { top: Math.max(4, insets.top), zIndex: 1000 }]} />}

        {/** Progress */}
        {importInProgress && <View style={styles.progressBarHost}>
          <Text allowFontScaling={false} style={{ fontSize: 28, marginBottom: 5 }}>{importInProgress.message}</Text>
          <Progress.Bar width={windowSize.width * .6} progress={importInProgress.percent / 100} style={[isRTL() && { transform: [{ scaleX: -1 }] }]} />
        </View>}

        {!openSettings && !inRecovery && <TouchableOpacity style={styles.overlay}
          onPress={handleThrowDice}
          activeOpacity={1}
        >


        </TouchableOpacity>}
        {profile && <FilamentScene>
          <DiceScene
            ref={sceneRef}
            freeze={openSettings}
            initialImpulse={initialImpulse}
            initialTorque={initialTorque}
            profile={revision >= 0 && profile ? profile : EmptyProfile}
            windowSize={windowSize}
          />
        </FilamentScene>
        }
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
  settingsButton: {
    position: "absolute", right: 15, zIndex: 600
  },
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
    position: "absolute",
    top: 20,
    left: 150
  }
});