import * as RNFS from 'react-native-fs';
import * as path from 'path';
import { Settings } from './setting-storage';
import { Platform, Settings as RNSettings } from 'react-native'
import { MMKV } from 'react-native-mmkv';
import { ensureAndroidCompatible, joinPaths } from './utils';
import Dice from './dice';
import { translate } from './lang';
import { FaceType } from './profile-picker';

export const enum Folders {
    Profiles = "profiles",
    Dice = "dice",
    DiceTemplates = "templates",
    FaceType = "faceType",
    CustomDice = "custom-dice"
}



export const SettingsKeys = {
    CurrentProfileName: "CurrentProfileName",
    DiceCount: "DiceCount",
    DiceTemplates: "DiceTemplates",
    DiceNames: "DiceNames",
    DiceActive: "DiceActive",
    DiceSize: "DiceSize",
    RecoveryTime: "RecoveryTime",
    TableColor: "TableColor",
    LastColors: "LastColors",
}


export class AlreadyExists extends Error { }
export class InvalidFileName extends Error { }

export const InvalidCharachters = "<, >, :, \", /, \, |, ?, *,"

export enum Templates {
    prefix = "__",
    Custom = "__custom",
    Numbers = "__numbers",
    Colors = "__colors",
    Dots = "__dots",
}

export interface List {
    key: string | Templates,
    name: string;
    icon?: string;
    faces?: string[];
    readOnly?: boolean;
}

export const templatesList = [
    {
        key: Templates.Numbers,
        name: translate("Numbers"),
        icon: require("../assets/numbers-preview.png"),
        readOnly: true,
    },
    {
        key: Templates.Colors,
        name: translate("Colors"),
        icon: require("../assets/colors-preview.png"),
        readOnly: true,
    },
    {
        key: Templates.Dots,
        name: translate("Dots"),
        icon: require("../assets/dots-preview.png"),
        readOnly: true,
    }
]

export const faceTypes = [
    {
        key: FaceType.Image,
        name: translate("Image"),
    },
    {
        key: FaceType.Camera,
        name: translate("Camera"),
    },
    {
        key: FaceType.Text,
        name: translate("Text"),
    },
    {
        key: FaceType.Search,
        name: translate("Search"),
    },

]

export interface Dice {
    template: Templates;
    active: boolean;
    faces?: string[] | undefined;
}

export interface Profile {
    dice: Dice[]
    size: number;
    recoveryTime: number;
    tableColor: string;
}

export const EmptyProfile = {
    dice: [
        {
            template: Templates.Numbers,
            active: true,
        }
    ],
    size: 2,
    recoveryTime: 3,
    tableColor: "green"
} as Profile;

export const getRecordingFileName = (recName: string | number, forceFilePrefix?: boolean) => {
    return ensureAndroidCompatible(joinPaths(RNFS.DocumentDirectoryPath, recName + ".mp4"), forceFilePrefix);
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
    let exists = await RNFS.exists(profilesPath);
    if (!exists) {
        await RNFS.mkdir(profilesPath);
    }
    exists = await RNFS.exists(buttonsPath);
    if (!exists) {
        await RNFS.mkdir(buttonsPath);
    }
}


export async function SaveProfile(name: string, p: Profile, overwrite = false) {
    if (!isValidFilename(name)) {
        throw new InvalidFileName(name);
    }
    // todo verify name is a valid file name
    const profilePath = path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${name}.json`);
    if (!overwrite) {
        if (await RNFS.exists(ensureAndroidCompatible(profilePath))) {
            throw new AlreadyExists(name);
        }
    }

    const profileToSave = { ...p, buttons: [] } as Profile;
    // load the audio into the json
    // let index = 0
    // for (const dice of p.dice) {
    //     const audioB64 = await RNFS.exists(getRecordingFileName(index)) ?
    //         await RNFS.readFile(getRecordingFileName(index), 'base64') :
    //         "";
    //     profileToSave.dice.push({
    //         ...dice,
    //         recording: audioB64,
    //     } as Dice);
    //     index++;
    // }

    const str = JSON.stringify(profileToSave);
    return RNFS.writeFile(ensureAndroidCompatible(profilePath), str, 'utf8');
}

export async function renameProfile(previousName: string, newName: string, overwrite = false) {
    const prevPath = path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${previousName}.json`);
    const newPath = path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${newName}.json`);
    if (!overwrite && await RNFS.exists(ensureAndroidCompatible(newPath))) {
        throw new AlreadyExists(newName);
    }

    // only rename if file existed
    if (await RNFS.exists(ensureAndroidCompatible(prevPath))) {
        await RNFS.moveFile(ensureAndroidCompatible(prevPath), ensureAndroidCompatible(newPath));
    }
}

export async function deleteProfile(name: string) {
    const profilePath = path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${name}.json`);
    return RNFS.unlink(ensureAndroidCompatible(profilePath));
}

export async function verifyProfileNameFree(name: string) {
    console.log("verifyProfileNameFree", name)
    const p = path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${name}.json`);
    if (await RNFS.exists(ensureAndroidCompatible(p))) {
        throw new AlreadyExists(name);
    }
    console.log("verifyProfileNameFree OK")
}

export async function LoadProfile(name: string) {

    // First saves current (if named)
    const currName = Settings.getString(SettingsKeys.CurrentProfileName, "");
    if (currName.length) {
        console.log("Save profile", currName);
        const currentProfile = await readCurrentProfile();
        await SaveProfile(currName, currentProfile, true);
    }

    if (name == "") {
        // create new profile
        await clearProfile()
        return;
    }

    const profilePath = path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${name}.json`);
    const fileContents = await RNFS.readFile(ensureAndroidCompatible(profilePath), 'utf8');
    const p: Profile = JSON.parse(fileContents);

    return writeCurrentProfile(p, name);
}

export async function clearProfile() {


    writeCurrentProfile(EmptyProfile, "");
}


async function writeCurrentProfile(p: Profile, name: string) {
    const diceTemplateType = [];
    const diceActive = [];

    for (let i = 0; i < 4; i++) {
        if (p.dice.length > i) {
            const dice = p.dice[i];
            diceTemplateType.push(dice.template);
            diceActive.push(dice.active);
        } else {
            diceTemplateType.push(Templates.Numbers);
            diceActive.push(true);
        }
    }
    Settings.set(SettingsKeys.CurrentProfileName, name);
    Settings.set(SettingsKeys.DiceCount, p.dice.length);
    Settings.set(SettingsKeys.DiceSize, p.size);
    Settings.set(SettingsKeys.RecoveryTime, p.recoveryTime);
    Settings.set(SettingsKeys.TableColor, p.tableColor);

    Settings.setArray(SettingsKeys.DiceTemplates, diceTemplateType);
    Settings.setArray(SettingsKeys.DiceActive, diceActive);
}

export async function readCurrentProfile(): Promise<Profile> {
    const numOfDice = Settings.getNumber(SettingsKeys.DiceCount, 1);
    const diceTemplateType = Settings.getArray<string>(SettingsKeys.DiceTemplates, "string", [Templates.Numbers, Templates.Numbers, Templates.Numbers, Templates.Numbers]);
    const diceActive = Settings.getArray<boolean>(SettingsKeys.DiceActive, "boolean", [true, true, true, true]);
    const size = Settings.getNumber(SettingsKeys.DiceSize, 2);
    const recoveryTime = Settings.getNumber(SettingsKeys.RecoveryTime, EmptyProfile.recoveryTime);
    const tableColor = Settings.getString(SettingsKeys.TableColor, EmptyProfile.tableColor);

    const dice = [] as Dice[];

    for (let i = 0; i < numOfDice; i++) {
        let faces: string[] = []
        if (diceTemplateType.length > i && !diceTemplateType[i].startsWith(Templates.prefix)) {
            faces = await loadFaceImages(diceTemplateType[i]);
        }
        dice.push({
            template: diceTemplateType.length > i && diceTemplateType[i] ? diceTemplateType[i] as Templates : Templates.Numbers,
            active: diceActive.length > i && diceActive[i] != undefined ? diceActive[i] : true,
            faces,
        });
    }

    console.log("readCurrentProfile", dice)

    return {
        dice,
        size,
        recoveryTime,
        tableColor
    };
}

export function getCustomTypePath(name: string): string {
    return `${RNFS.DocumentDirectoryPath}/${Folders.CustomDice}/${name}`;
}



async function loadProfiles(): Promise<List[]> {
    return RNFS.readDir(`${RNFS.DocumentDirectoryPath}/${Folders.Profiles}`).then(async (files) => {
        const list = [];
        for (const file of files) {
            if (file.name.endsWith(".json")) {
                const name = file.name.substring(0, file.name.length - 5);
                list.push({
                    key: name,
                    name
                })
            }

        }
        return list;
    }).catch((e) => {
        console.log("Fail browsing profiles", e);
        return [];
    });
}

async function loadCustomDice(): Promise<List[]> {
    return RNFS.readDir(`${RNFS.DocumentDirectoryPath}/${Folders.CustomDice}`).then(async (folders) => {
        const list = [];
        for (const folder of folders) {
            list.push({
                key: folder.name,
                name: folder.name,
                faces: await loadFaceImages(folder.name),
            })
        }
        return list;
    }).catch((e) => {
        console.log("Fail browsing custom dices", e);
        return [];
    });
}

export async function loadFaceImages(name: string) {
    const customDicePath = getCustomTypePath(name);

    return RNFS.readDir(customDicePath).then(files => {
        const list = ["", "", "", "", "", ""];
        for (const elem of files) {
            if (elem.name.startsWith("face")) {
                const index = parseInt(elem.name.substring(5, 6));
                list[index] = elem.path
            }
        }
        return list;
    });
}

export async function saveDataUrlAs(dataUrl: string, filePath: string) {
    RNFS.writeFile(filePath, dataUrl, "base64");
}

// export async function loadButton(name: string, index: number) {
//     console.log("Load Button", name, index)
//     const buttonPath = path.join(RNFS.DocumentDirectoryPath, Folders.Buttons, `${name}.json`);
//     const fileContents = await RNFS.readFile(ensureAndroidCompatible(buttonPath), 'utf8');
//     const newBtn: Button = JSON.parse(fileContents);

//     const p = readCurrentProfile();
//     p.buttons = p.buttons.map((btn, i) => i != index ? btn : newBtn);
//     console.log("btns", p.buttons.map(b => b.name))
//     const currName = Settings.getString(CURRENT_PROFILE.name, "");

//     writeCurrentProfile(p, currName);

// }

// export async function saveButton(name: string, index: number, overwrite = false) {
//     if (!isValidFilename(name)) {
//         throw new InvalidFileName(name);
//     }

//     const buttonPath = path.join(RNFS.DocumentDirectoryPath, Folders.Buttons, `${name}.json`);
//     console.log("save button", name)
//     if (!overwrite && await RNFS.exists(ensureAndroidCompatible(buttonPath))) {
//         throw new AlreadyExists(name);
//     }

//     const p = readCurrentProfile();
//     const btn = p.buttons[index]
//     if (btn) {

//         const audioB64 = await RNFS.exists(getRecordingFileName(index)) ?
//             await RNFS.readFile(getRecordingFileName(index), 'base64') :
//             "";
//         const btnToSave = {
//             ...btn,
//             recording: audioB64,
//         }

//         const str = JSON.stringify(btnToSave);
//         return RNFS.writeFile(ensureAndroidCompatible(buttonPath), str, 'utf8');
//     }
// }

// export async function deleteButton(name: string) {
//     const buttonPath = path.join(RNFS.DocumentDirectoryPath, Folders.Buttons, `${name}.json`);
//     return RNFS.unlink(ensureAndroidCompatible(buttonPath));
// }


export async function ListElements(folder: Folders): Promise<List[]> {
    if (folder == Folders.DiceTemplates) {
        return [...templatesList, ...(await loadCustomDice())];
    } else if (folder == Folders.FaceType) {
        return faceTypes;
    } else if (folder == Folders.Profiles) {
        return loadProfiles();
    }
    return [];

    // const listPath = path.join(RNFS.DocumentDirectoryPath, folder);
    // console.log("List Path", folder);
    // const dir = await RNFS.readDir(ensureAndroidCompatible(listPath));

    // const list = [];
    // for (const elem of dir) {
    //     //console.log("Element", elem.name)
    //     if (elem.name.endsWith(".json")) {

    //         list.push(elem.name.substring(0, elem.name.length - 5));
    //     }
    // }
    // return list;
}

export function isValidFilename(filename: string): boolean {
    const invalidCharsRegex = /[<>:"/\\|?*\x00-\x1F]/;

    if (invalidCharsRegex.test(filename)) {
        return false;
    }
    return true;
}

export function existsFolder(name: string): Promise<boolean> {
    return RNFS.exists(`${RNFS.DocumentDirectoryPath}/${name}`);
}

export function renameDiceFolder(currName: string, newName: string) {
    const srcPath = getCustomTypePath(currName);
    const destPath = getCustomTypePath(newName);
    return RNFS.moveFile(srcPath, destPath);
}