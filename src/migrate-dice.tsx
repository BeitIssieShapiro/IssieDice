import { useEffect, useRef, useState } from "react"
import {  getCustomTypePath, loadFaceImages } from "./profile";
import { DiceLayout, FacePreviewSize } from "./edit-dice";
import { Settings, StyleSheet, Text, View } from "react-native";
import { isRTL, translate } from "./lang";
import * as Progress from 'react-native-progress';
import { FaceInfo } from "./models";
import { copyFileToFolder, getCacheBusterSuffix } from "./disk";

export function MigrateDice({ migrateDice, setMigrateDice, winWidth }:
    { migrateDice: string[], setMigrateDice: React.Dispatch<React.SetStateAction<string[]>>, winWidth: number }) {
    const [currMigratedIndex, setCurrMigrateIndex] = useState<number>(-1);
    const [migarteDiceInfo, setMigrateDiceInfo] = useState<FaceInfo[][]>([]);

    const diceLayoutRef = useRef<any>(undefined);

    function migrateOneDie(index: number) {
        console.log("save texture of migrated", index, migrateDice[index]);

        const textureFilePath = `${getCustomTypePath(migrateDice[index])}/texture${getCacheBusterSuffix()}.jpg`

        diceLayoutRef.current?.toImage().catch((e: any) => console.log("fail capture", e))
            .then((filePath: string) => {
                copyFileToFolder(filePath, textureFilePath, true)
                console.log("saved the texture")
            })
            .finally(() => {
                setCurrMigrateIndex(prev => prev + 1)
            })
    }

    async function loadFaceInfo() {
        const faceInfos = []
        for (const md of migrateDice) {
            faceInfos.push(await loadFaceImages(md));
        }

        setMigrateDiceInfo(faceInfos)
        // this tiggers the process
        setCurrMigrateIndex(0);
    }

    useEffect(() => {
        // load migarted dice
        loadFaceInfo()
    }, [])

    useEffect(() => {
        if (currMigratedIndex >= 0 && currMigratedIndex < migrateDice.length) {
            setTimeout(() => {
                migrateOneDie(currMigratedIndex);
            }, 1000);
        } else if (currMigratedIndex >= migrateDice.length) {
            // done migrating - set a setting to avoid it again
            console.log("Set migrated")
            Settings.set({"MigrateV1": false});
            setMigrateDice([])
            setCurrMigrateIndex(-1)
        }
    }, [currMigratedIndex])

    return <View style={{  zIndex: 1000, position:"absolute", top:0, left:0, width:"100%", height:"100%" }}>
        <View style={styles.progressBarHost}>
            <Text allowFontScaling={false} style={{ fontSize: 28, marginBottom: 5 }}>{translate("MigrateOldDice")}</Text>
            <Progress.Bar width={winWidth * .6} progress={currMigratedIndex / migrateDice.length} style={[isRTL() && { transform: [{ scaleX: -1 }] }]} />
        </View>

        {currMigratedIndex >= 0 && currMigratedIndex < migrateDice.length &&
            <DiceLayout
                ref={diceLayoutRef}
                facesInfo={migarteDiceInfo[currMigratedIndex]}
                size={FacePreviewSize * 4} />}
    </View>
}


const styles = StyleSheet.create({
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
});