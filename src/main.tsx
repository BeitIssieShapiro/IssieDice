// App.tsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Button, TouchableOpacity, SafeAreaView, Linking, Alert, Text, Dimensions } from "react-native";

import { DiceScene, DiceSceneMethods } from "./diceScene";
import { SettingsUI } from "./settings";
import { getCurrentProfile, migrateV1 } from "./profile";
import { GlobalContext } from "./global-context";
import * as Progress from 'react-native-progress';
import { isRTL, translate } from "./lang";
import { WinSize } from "./utils";
import { FilamentScene } from "react-native-filament";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MigrateDice } from "./migrate-dice";
import { CountdownButton } from "./settings-btn";
import { EmptyProfile, Profile } from "./models";
import { EmptyImportInfo, ImportInfo, importPackage } from "./import-export";
import { ImportInfoDialog } from "./import-info-dialog";

const initialImpulse = [0, -.3, -.3];
const initialTorque = [.15, .08, -.08];

export default function App({ migratedDice }: { migratedDice: string[] }) {
  const [windowSize, setWindowSize] = useState<WinSize>({ width: 500, height: 500 });
  const [openSettings, setOpenSettings] = useState<number>(0);
  const [revision, setRevision] = useState<number>(1);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [cameraTilt, setCameraTilt] = useState<number>(0);
  const [migrateDice, setMigrateDice] = useState<string[]>([]);
  const [inRecovery, setInRecovery] = useState<boolean>(false);
  const [importInfo, setImportInfo] = useState<ImportInfo | undefined>(undefined);
  const [importInProgress, setImportInProgress] = useState<{
    message: string;
    precent: number;
  } | undefined>();

  const context = useContext(GlobalContext);

  useEffect(() => {

    Linking.addEventListener("url", handleImport);
    if (context && context.url) {
      setTimeout(() => handleImport({ url: context.url }));
    }

    const winDimChange = Dimensions.addEventListener("change", (e) => setWindowSize({ width: e.window.width, height: e.window.height }))

    migrateV1().then(md => {
      setMigrateDice(md)
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
    let url = event.url
    url = decodeURI(url);
    // if (url.startsWith("file://")) {
    //   url = url.substring(7)
    // }
    //url = await FileSystem.contentUriToFilePath(url);
    console.log("handleImport event:", url, JSON.stringify(event));

    //Alert.alert("Import: " + url);
    setImportInProgress({
      message: translate("ImportInProgress"),
      precent: 0,
    })

    let result: ImportInfo = {
      importedDice: [],
      importedProfiles: [],
      skippedExistingDice: [],
      skippedExistingProfiles: []
    };
    
    importPackage(url, result)
      .then(() => setImportInfo(result))
      .catch(err => Alert.alert(translate("ImportError"), err?.message || err))
      .finally(() => setImportInProgress(undefined))

  }


  useEffect(() => {
    console.log("App reloading profile")
    getCurrentProfile().then(p => {
      setProfile(p);
      setTimeout(() => sceneRef.current?.update(p), 100);
    }).catch(e => console.log("error loading profile", e))
  }, [revision]);

  const sceneRef = useRef<DiceSceneMethods>(undefined);

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} onLayout={(e) => {
      let wz = e.nativeEvent.layout;
      setWindowSize(wz);
    }}>

      {/** indicator to a lock */}
      {/* {inRecovery && <View style={[styles.lockIndicator, { top: Math.max(4, insets.top), left: 5 + insets.left, zIndex: 1000 }]} />} */}
      {inRecovery && <CountdownButton iconSize={40} onComplete={() => sceneRef.current?.resetRecovery()}
        style={{
          top: Math.max(25, 15 + insets.top),
          left: Math.max(15, 5 + insets.left)
        }}
        icon="lock"
        textKey="UnlockIn"
        textLocation="right"
        delayInSeconds={1}
      />}

      <CountdownButton iconSize={35} onComplete={() => setOpenSettings(revision)} style={{
        top: Math.max(20, 15 + insets.top),
        right: Math.max(15, 5 + insets.right)
      }}
        icon="setting"
        textKey="OpenIn"
        textLocation="left"

      />

      {migrateDice.length > 0 && <MigrateDice migrateDice={migrateDice} setMigrateDice={setMigrateDice}
        winWidth={windowSize.width} />}

      {openSettings > 0 && <SettingsUI windowSize={windowSize} onChange={() => setRevision(prev => prev + 1)} onClose={() => {
        if (revision != openSettings) {
          console.log("settings changed", revision, openSettings)
          setRevision(prev => prev + 1);
        }
        setOpenSettings(0)
      }} />}
      <>

        {/** Progress */}
        {importInProgress && <View style={styles.progressBarHost}>
          <Text allowFontScaling={false} style={{ fontSize: 28, marginBottom: 5 }}>{importInProgress.message}</Text>
          <Progress.Bar width={windowSize.width * .6} progress={importInProgress.percent / 100} style={[isRTL() && { transform: [{ scaleX: -1 }] }]} />
        </View>}

        {
          // Import info
          importInfo && <ImportInfoDialog importInfo={importInfo} onClose={() => setImportInfo(undefined)} />
        }

        {profile && <FilamentScene>
          <DiceScene
            setInRecovery={setInRecovery}
            ref={sceneRef}
            freeze={openSettings > 0}
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