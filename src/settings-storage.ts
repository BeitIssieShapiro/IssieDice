import { MMKV } from "react-native-mmkv";
import { ensureAndroidCompatible, joinPaths } from "./utils";
import path from "path";
import * as RNFS from "react-native-fs";
import { Folders } from "./disk";


export const SettingsKeys = {
    CurrentProfileName: "CurrentProfileName",
    DiceCount: "DiceCount",
    DiceTemplates: "DiceTemplates",
    DiceNames: "DiceNames",
    DiceActive: "DiceActive",
    DiceSize: "DiceSize",
    RecoveryTime: "RecoveryTime",
    TableColor: "TableColor",
    SoundEnabled:"SoundEnabled",
    LastColors: "LastColors",
}

export let storage: MMKV;

export async function Init() {

    console.log("Initializing MMKV storage");
    try {
        storage = new MMKV({
            id: 'IssieDiceStorage',
        });
        console.log("Initializing MMKV storage Success");

    } catch (e) {
        // https://github.com/mrousavy/react-native-mmkv/issues/776
        console.log("Initializing MMKV failed", e);
    }

    const profilesPath = ensureAndroidCompatible(path.join(RNFS.DocumentDirectoryPath, Folders.Profiles));
    const buttonsPath = ensureAndroidCompatible(path.join(RNFS.DocumentDirectoryPath, Folders.Dice));
    let exists = await RNFS.exists(ensureAndroidCompatible(profilesPath));
    if (!exists) {
        await RNFS.mkdir(ensureAndroidCompatible(profilesPath));
    }
    exists = await RNFS.exists(ensureAndroidCompatible(buttonsPath));
    if (!exists) {
        await RNFS.mkdir(ensureAndroidCompatible(buttonsPath));
    }
}

export const getRecordingFileName = (recName: string | number, forceFilePrefix?: boolean) => {
    return ensureAndroidCompatible(joinPaths(RNFS.DocumentDirectoryPath, recName + ".mp4"), forceFilePrefix);
}
