import * as RNFS from 'react-native-fs';
import * as path from 'path';
import { Settings } from './setting-storage';
import { Platform, Settings as RNSettings } from 'react-native'
import { MMKV } from 'react-native-mmkv';
import { ensureAndroidCompatible, ignore, joinPaths } from './utils';
import Dice from './dice';
import { fTranslate, translate } from './lang';
import { FaceType } from './profile-picker';
import { unzip, zip } from 'react-native-zip-archive';
import { FaceText } from './edit-text';

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
    faces?: FaceInfo[];
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
    faces?: FaceInfo[] | undefined;
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


export async function SaveProfile(name: string, profile: Profile, overwrite = false) {
    if (!isValidFilename(name)) {
        throw new InvalidFileName(name);
    }
    const profilePath = path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${name}.json`);
    if (!overwrite) {
        if (await RNFS.exists(ensureAndroidCompatible(profilePath))) {
            throw new AlreadyExists(name);
        }
    }
    const profileClean = { ...profile, dice: profile.dice.map(d => ({ template: d.template, active: d.active })) }

    const str = JSON.stringify(profileClean, undefined, " ");
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

    const p: Profile = await (readProfile(name));
    return writeCurrentProfile(p, name);
}

export async function readProfile(name: string): Promise<Profile> {
    const profilePath = path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${name}.json`);
    const fileContents = await RNFS.readFile(ensureAndroidCompatible(profilePath), 'utf8');
    const p: Profile = JSON.parse(fileContents);
    return p;
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
        let faces: FaceInfo[] = []
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

export function getProfilePath(name: string): string {
    return `${RNFS.DocumentDirectoryPath}/${Folders.Profiles}/${name}`;
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

async function loadCustomDice(ommitFaces = false): Promise<List[]> {
    return RNFS.readDir(`${RNFS.DocumentDirectoryPath}/${Folders.CustomDice}`).then(async (folders) => {
        const list = [];
        for (const folder of folders) {
            list.push({
                key: folder.name,
                name: folder.name,
                faces: ommitFaces ? [] : await loadFaceImages(folder.name),
            })
        }
        return list;
    }).catch((e) => {
        console.log("Fail browsing custom dices", e);
        return [];
    });
}

export interface FaceInfo {
    uri: string;
    text?: FaceText;
}

export async function loadFaceImages(name: string): Promise<FaceInfo[]> {
    const customDicePath = getCustomTypePath(name);

    const files = await RNFS.readDir(customDicePath);
    const list: FaceInfo[] = [{ uri: "" }, { uri: "" }, { uri: "" }, { uri: "" }, { uri: "" }, { uri: "" }];
    for (const elem of files) {
        if (elem.name.startsWith("face")) {
            const index = parseInt(elem.name.substring(5, 6));
            list[index].uri = elem.path;
            if (elem.path.endsWith(".json")) {
                // is a text
                const textInfo = JSON.parse(await loadFile(elem.path));
                list[index].text = textInfo;
            }
        }
    }

    return list;
}

export async function saveDataUrlAs(dataUrl: string, filePath: string) {
    RNFS.writeFile(filePath, dataUrl, "base64");
}


export async function ListElements(folder: Folders): Promise<List[]> {
    if (folder == Folders.DiceTemplates) {
        return [...templatesList, ...(await loadCustomDice())];
    } else if (folder == Folders.FaceType) {
        return faceTypes;
    } else if (folder == Folders.Profiles) {
        return loadProfiles();
    }
    return [];
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


export async function exportDice(name: string): Promise<string> {
    const metaDataFile = getTempFileName("json");
    const metaData = {
        version: "1.0",
        type: "dice",
        name
    }
    const files = (await loadFaceImages(name)).filter(f => f.uri.length > 0).map(f => ensureAndroidCompatible(f.uri));

    const diceMaterialUri = path.join(getCustomTypePath(name), "dice.jpg");
    files.push(diceMaterialUri);

    files.push(ensureAndroidCompatible(metaDataFile));
    await writeFile(metaDataFile, JSON.stringify(metaData, undefined, " "));

    const targetFile = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, name + ".zip"));
    // delete if exists before
    await RNFS.unlink(targetFile).catch(ignore);

    return zip(files, targetFile).then(path => {
        return ensureAndroidCompatible(path);
    });
}

interface ExportProfileResponse {
    profileZip: string;
    diceZips: string[];
    diceNames: string[];
}

export async function exportProfile(name: string, alreadyIncludedCubes: string[], returnInOne = false): Promise<ExportProfileResponse | string> {
    const metaDataFile = getTempFileName("json");

    const p = await readProfile(name);

    const metaData = {
        version: "1.0",
        type: "profile",
        name,
        ...p,
    }
    await writeFile(metaDataFile, JSON.stringify(metaData, undefined, " "));

    const targetFile = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, "profile__" + name + ".zip"));
    // delete if exists before
    await RNFS.unlink(targetFile).catch(ignore);

    const profileZip = await zip([ensureAndroidCompatible(metaDataFile)], targetFile);
    const diceZips = [];
    const diceNames = [];
    for (const dice of p.dice) {
        if (alreadyIncludedCubes.includes(dice.template) || dice.template.startsWith(Templates.prefix)) continue;
        diceNames.push(dice.template);
        diceZips.push(
            await exportDice(dice.template)
        );
    }

    if (returnInOne) {
        const targetFile = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, name + ".zip"));

        return zip([profileZip, ...diceZips], targetFile).then(path => {
            return ensureAndroidCompatible(path);
        });
    }

    return {
        profileZip,
        diceZips,
        diceNames,
    };
}

export async function exportAll(): Promise<string> {
    const files = [];
    const diceList = await loadCustomDice(true);
    const diceNames = diceList.map(d => d.name);
    for (const name of diceNames) {
        files.push(
            await exportDice(name)
        );
    }

    const profileList = await loadProfiles();
    for (const profileItem of profileList) {
        files.push(
            (await exportProfile(profileItem.name, diceNames) as ExportProfileResponse).profileZip
        );
    }

    const date = new Date()
    let fn = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);
    console.log("about to zip", files)
    const targetPath = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, "IssieDice Backup-" + fn + ".zip"));
    await RNFS.unlink(targetPath).catch(ignore);

    return zip(files, targetPath).then(path => {
        return ensureAndroidCompatible(path);
    });
}

export async function importPackage(packagePath: string, overwrite = false) {
    const unzipTargetPath = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, "imported"));
    const unzipFolderPath = await unzip(packagePath, unzipTargetPath);

    const items = await RNFS.readDir(ensureAndroidCompatible(unzipFolderPath));
    const metaDataItem = items.find(f => f.name.endsWith(".json"));
    if (metaDataItem) {
        const metadataStr = await loadFile(metaDataItem.path);
        const md = JSON.parse(metadataStr);
        if (md.type == "dice") {
            const targetPath = getCustomTypePath(md.name);
            if (!overwrite && await existsFolder(targetPath)) {
                throw fTranslate("ImportDiceExist", md.name);
            }

            await RNFS.mkdir(targetPath);
            for (const file of items.filter(item => !item.name.endsWith(".json"))) {
                await RNFS.moveFile(file.path, targetPath);
            }
        } else if (md.type == "profile") {
            const targetPath = getProfilePath(md.name);
            if (!overwrite && await existsFolder(targetPath)) {
                throw fTranslate("ImportProfileExist", md.name);
            }

            const p: Profile = {
                dice: md.dice,
                size: md.size,
                recoveryTime: md.recoveryTime,
                tableColor: md.tableColor,
            }

            await SaveProfile(md.name, p, true);
        } else {
            throw "Unknown package type";
        }
    } else {
        // list of zips
        for (const item of items) {
            await importPackage(item.path);
        }
    }
}



function loadFile(path: string) {
    return RNFS.readFile(ensureAndroidCompatible(path), 'utf8');
}

export function writeFile(path: string, content: string) {
    return RNFS.writeFile(ensureAndroidCompatible(path), content);
}

function getTempFileName(ext: string) {
    const date = new Date()
    let fn = Math.random() + '-' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + 'T' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);

    return path.join(RNFS.TemporaryDirectoryPath, fn + "." + ext);
}

export async function getRandomFile(filePath: string, ext: string): Promise<string> {
    const tempFileTime = getTempFileName(ext)
    await RNFS.copyFile(filePath, tempFileTime);
    return tempFileTime;
}