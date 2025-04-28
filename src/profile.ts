import * as RNFS from 'react-native-fs';
import * as path from 'path';
import { Settings } from './setting-storage';
import { Platform, Settings as RNSettings } from 'react-native'
import { ensureAndroidCompatible } from './utils';
import { fTranslate } from './lang';
import { NativeModules } from 'react-native';
import { Dice, EmptyDice, EmptyProfile, FaceInfo, List, Profile, Templates, templatesList } from './models';
import { AlreadyExists, Folders, getCacheBusterSuffix, InvalidFileName, loadFile, loadJSON, saveJSON, writeFileWithCacheBuster } from './disk';
import { SettingsKeys } from './settings-storage';

type NoName = "";

export async function migrateV1(): Promise<string[]> {
    const migratedDice = [];
    // iOD only - migration from v1
    if (Platform.OS == "ios") {
        const shouldMigrate = RNSettings.get("MigrateV1");
        if (shouldMigrate != false) {
            console.log("Migrating old dice templates")
            const { TemplateMigrator } = NativeModules;

            const customDice = await TemplateMigrator.migrateCustomTemplates();

            for (const customDie of customDice) {
                const migratedDieName = await getNextDieName("MigratedDieName");
                const diePath = getCustomTypePath(migratedDieName);
                await RNFS.mkdir(diePath);
                migratedDice.push(migratedDieName);

                for (let i = 1; i <= 6; ++i) {
                    const base64Image = customDie["iPic" + i];
                    if (base64Image && base64Image.length > 0) {
                        // save a jpg file
                        const faceName = `face_${i - 1}${getCacheBusterSuffix()}.jpg`
                        const filePath = path.join(diePath, faceName);
                        await writeFileWithCacheBuster(filePath, base64Image, 'base64');
                    }
                }
            }
            console.log("Done migrating old dice templates", customDice.length);
        }
    }
    return migratedDice;
}

export function profileFilePath(name: string) {
    return ensureAndroidCompatible(path.join(RNFS.DocumentDirectoryPath, Folders.Profiles, `${name}.json`));
}

export async function saveProfileFile(name: string, profile: Profile, overwrite = false) {
    if (!isValidFilename(name)) throw new InvalidFileName(name);
    const profilePath = profileFilePath(name);
    if (!overwrite) {
        if (await RNFS.exists(profilePath)) {
            throw new AlreadyExists(name);
        }
    }

    const profileClean = { ...profile, dice: profile.dice.map(d => ({ template: d.template, active: d.active })) }
    await saveJSON(profilePath, profileClean);
}

export async function loadProfileFile(name: string): Promise<Profile> {
    if (!name) return EmptyProfile;
    return loadJSON<Profile>(profileFilePath(name), EmptyProfile);
}


export async function renameProfileFile(previousName: string, newName: string, overwrite = false) {
    const prevPath = profileFilePath(previousName);
    const newPath = profileFilePath(newName)
    if (!overwrite && await RNFS.exists(newPath)) {
        throw new AlreadyExists(newName);
    }

    // only rename if file existed
    if (await RNFS.exists(prevPath)) {
        await RNFS.moveFile(prevPath, newPath);
    }
}

export async function deleteProfileFile(name: string) {
    const profilePath = profileFilePath(name);
    return RNFS.unlink(profilePath);
}

export async function verifyProfileNameFree(name: string) {
    const profilePath = profileFilePath(name);
    console.log("verifyProfileNameFree", name)
    if (await RNFS.exists(profilePath)) {
        throw new AlreadyExists(name);
    }
    console.log("verifyProfileNameFree OK")
}

export async function LoadProfileFileIntoSettings(name: string | NoName) {
    // First saves current (if named)
    const currName = Settings.getString(SettingsKeys.CurrentProfileName, "");
    if (currName.length) {
        console.log("Save profile", currName);
        const currentProfile = await getCurrentProfile();
        await saveProfileFile(currName, currentProfile, true);
    }

    if (name == "") {
        // create new profile
        await clearProfileInSettings()
        return;
    }

    const p: Profile = await loadProfileFile(name);
    return loadProfileIntoSettings(p, name);
}


export async function clearProfileInSettings() {
    loadProfileIntoSettings(EmptyProfile, "");
}


async function loadProfileIntoSettings(p: Profile, name: string) {
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
    Settings.set(SettingsKeys.SoundEnabled, p.soundEnabled);

    Settings.setArray(SettingsKeys.DiceTemplates, diceTemplateType);
    Settings.setArray(SettingsKeys.DiceActive, diceActive);
}

export async function getCurrentProfile(): Promise<Profile> {
    const numOfDice = 4 // Settings.getNumber(SettingsKeys.DiceCount, 1);
    const diceTemplateType = Settings.getArray<string>(SettingsKeys.DiceTemplates, "string", [Templates.Numbers, Templates.Numbers, Templates.Numbers, Templates.Numbers]);
    const diceActive = Settings.getArray<boolean>(SettingsKeys.DiceActive, "boolean", [true, true, true, true]);
    const size = Settings.getNumber(SettingsKeys.DiceSize, 2);
    const recoveryTime = Settings.getNumber(SettingsKeys.RecoveryTime, EmptyProfile.recoveryTime);
    const tableColor = Settings.getString(SettingsKeys.TableColor, EmptyProfile.tableColor);
    const soundEnabled = Settings.getBoolean(SettingsKeys.SoundEnabled, true);

    const dice = [] as Dice[];

    for (let i = 0; i < numOfDice; i++) {
        let faces: FaceInfo[] = []
        if (diceTemplateType.length > i && !diceTemplateType[i].startsWith(Templates.prefix)) {
            faces = await loadFaceImages(diceTemplateType[i]);
        }
        const template = diceTemplateType.length > i && diceTemplateType[i] ? diceTemplateType[i] as Templates : EmptyDice.template;
        dice.push({
            template,
            active: diceActive.length > i && diceActive[i] != undefined ? diceActive[i] : true,
            faces,
            texture: await readTexture(template)
        });
    }

    console.log("readCurrentProfile", dice)

    return {
        dice,
        size,
        recoveryTime,
        tableColor,
        soundEnabled
    };
}

export function getCustomTypePath(name: string): string {
    return `${RNFS.DocumentDirectoryPath}/${Folders.CustomDice}/${name}`;
}

export function getProfilePath(name: string): string {
    return `${RNFS.DocumentDirectoryPath}/${Folders.Profiles}/${name}`;
}

export async function listProfiles(): Promise<List[]> {
    return RNFS.readDir(`${RNFS.DocumentDirectoryPath}/${Folders.Profiles}`).then(async (files) => {
        const list: List[] = [];
        for (const file of files) {
            if (file.name.endsWith(".json")) {
                const name = file.name.substring(0, file.name.length - 5);
                list.push({
                    key: name,
                    name
                })
            }
        }
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
    }).catch((e) => {
        console.log("Fail browsing profiles", e);
        return [];
    });
}

export async function listCustomDice(ommitFaces = false): Promise<List[]> {
    return RNFS.readDir(`${RNFS.DocumentDirectoryPath}/${Folders.CustomDice}`).then(async (folders) => {
        const list: List[] = [];
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

export async function loadFaceImages(name: string): Promise<FaceInfo[]> {
    const customDicePath = getCustomTypePath(name);

    const files = await RNFS.readDir(customDicePath);
    const list: FaceInfo[] = [{}, {}, {}, {}, {}, {}];
    for (const elem of files) {
        if (elem.name.startsWith("face")) {
            const index = parseInt(elem.name.substring(5, 6));
            if (elem.path.endsWith(".json")) {
                // is a text
                const textInfo = JSON.parse(await loadFile(elem.path));
                list[index].text = textInfo;
                list[index].backgroundColor = textInfo.backgroundColor;
                list[index].infoUri = elem.path;
            } else if (elem.path.endsWith(".jpg")) {
                // a jpg:
                list[index].backgroundUri = elem.path;
            } else if (elem.path.endsWith("mp4")) {
                list[index].audioUri = elem.path;
            }
        }
    }

    return list;
}

export async function readTexture(name: string): Promise<string> {
    if (name.startsWith(Templates.prefix)) {
        return "";
    }
    const customDicePath = getCustomTypePath(name);
    const files = await RNFS.readDir(customDicePath);
    for (const elem of files) {
        if (elem.name.startsWith("texture$$") && elem.name.endsWith(".jpg")) {
            return "file://" + elem.path;
        }
    }
    return "";
}


export async function ListElements(folder: Folders): Promise<List[]> {
    if (folder == Folders.DiceTemplates) {
        const customDice = await listCustomDice();
        customDice.sort((a, b) => a.name.localeCompare(b.name));

        return [...templatesList, ...customDice];
    } else if (folder == Folders.Profiles) {
        return listProfiles();
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

export async function renameDiceFolder(currName: string, newName: string) {
    const srcPath = getCustomTypePath(currName);
    const destPath = getCustomTypePath(newName);
    if (await RNFS.exists(srcPath)) {
        await RNFS.moveFile(srcPath, destPath);
    } else {
        await RNFS.mkdir(destPath);
    }

    // change saved settings and profiles including old dice name
    const diceTemplateTypes = Settings.getArray<string>(SettingsKeys.DiceTemplates, "string", [Templates.Numbers, Templates.Numbers, Templates.Numbers, Templates.Numbers]);
    const newList = diceTemplateTypes.map(template => template == currName ? newName : template);
    Settings.setArray(SettingsKeys.DiceTemplates, newList);

    // Check all profile and change dice name if includes the old dice name
    const allProfiles = await listProfiles();
    for (const profileListItem of allProfiles) {
        const profile = await loadProfileFile(profileListItem.key);
        let modified = false;
        for (const die of profile.dice) {
            if (die.template == currName) {
                modified = true;
                die.template = newName as Templates;
            }
        }
        if (modified) {
            //overwrite Profile after being modified
            saveProfileFile(profileListItem.key, profile, true)
        }
    }
}

export async function deleteDice(name: string) {
    const srcPath = getCustomTypePath(name);
    await RNFS.unlink(srcPath);

    // Check all profile with the deleted die and change die to a default (dots)
    const allProfiles = await listProfiles();
    for (const profileListItem of allProfiles) {
        const profile = await loadProfileFile(profileListItem.key);

        let modified = false;
        for (const die of profile.dice) {
            if (die.template == name) {
                modified = true;
                die.template = Templates.Dots;
            }
        }
        if (modified) {
            //overwrite Profile after being modified
            saveProfileFile(profileListItem.key, profile, true)
        }
    }
}






export async function getNextDieName(transKey: string): Promise<string> {
    let counter = 1;
    let newCubeName = fTranslate(transKey, counter);

    let exists = false;
    do {
        const diePath = getCustomTypePath(newCubeName);
        exists = await RNFS.exists(diePath);
        if (exists) {
            counter++;
            newCubeName = fTranslate(transKey, counter);
        }
    } while (exists);

    return newCubeName;
}