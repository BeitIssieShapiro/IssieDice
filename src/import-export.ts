import * as RNFS from "react-native-fs";

import { fTranslate } from "./lang";
import { Profile, Templates } from "./models";
import { existsFolder, getCustomTypePath, getProfilePath, listCustomDice, listProfiles, loadFaceImages, loadProfileFile, profileFilePath, readTexture, saveProfileFile } from "./profile";
import { doNothing, getTempFileName, loadFile, writeFile } from "./disk";
import { ensureAndroidCompatible, joinPaths } from "./utils";
import { unzip, zip } from "react-native-zip-archive";

export async function exportDice(name: string): Promise<string> {
    const metaDataFile = getTempFileName("json");
    const metaData = {
        version: "1.0",
        type: "dice",
        name
    }

    const files = [];
    const exists = await RNFS.exists(getCustomTypePath(name));
    if (!exists) {
        return "";
    }

    const faceInfos = await loadFaceImages(name);
    for (const faceInfo of faceInfos) {
        if (faceInfo.backgroundUri) {
            files.push(ensureAndroidCompatible(faceInfo.backgroundUri));
        }
        if (faceInfo.infoUri) {
            files.push(ensureAndroidCompatible(faceInfo.infoUri));
        }
        if (faceInfo.audioUri) {
            files.push(ensureAndroidCompatible(faceInfo.audioUri))
        }
    }

    const diceMaterialUri = await readTexture(name)
    if (diceMaterialUri.length > 0) {
        files.push(ensureAndroidCompatible(diceMaterialUri));
    }

    files.push(ensureAndroidCompatible(metaDataFile));
    await writeFile(metaDataFile, JSON.stringify(metaData, undefined, " "));

    const targetFile = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, name + ".dice"));
    // delete if exists before
    await RNFS.unlink(targetFile).catch(doNothing);

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

    const p = await loadProfileFile(name);

    const metaData = {
        version: "1.0",
        type: "profile",
        name,
        ...p,
    }
    await writeFile(metaDataFile, JSON.stringify(metaData, undefined, " "));

    const targetFile = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, "profile__" + name + ".dice"));
    // delete if exists before
    await RNFS.unlink(targetFile).catch(doNothing);

    const profileZip = await zip([ensureAndroidCompatible(metaDataFile)], targetFile);
    const diceZips = [];
    const diceNames = [];
    for (const dice of p.dice) {
        if (alreadyIncludedCubes.includes(dice.template) || dice.template.startsWith(Templates.prefix)) continue;
        diceNames.push(dice.template);
        const dieZip = await exportDice(dice.template)
        if (dieZip.length > 0) {
            diceZips.push(dieZip);
        }
    }

    if (returnInOne) {
        const targetFile = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, name + ".dice"));

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
    const diceList = await listCustomDice(true);
    const diceNames = diceList.map(d => d.name);
    for (const name of diceNames) {
        const dieZip = await exportDice(name);
        if (dieZip.length > 0) {
            files.push(dieZip);
        }
    }

    const profileList = await listProfiles();
    for (const profileItem of profileList) {
        files.push(
            (await exportProfile(profileItem.name, diceNames) as ExportProfileResponse).profileZip
        );
    }

    const date = new Date()
    let fn = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);
    console.log("about to zip a dice file", files)
    const targetPath = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, "IssieDice Backup-" + fn + ".dice"));
    await RNFS.unlink(targetPath).catch(doNothing);

    return zip(files, targetPath).then(path => {
        return ensureAndroidCompatible(path);
    });
}

export interface ImportInfo {
    importedDice: string[];
    importedProfiles: string[];
    skippedExistingDice: string[];
    skippedExistingProfiles: string[];
}

export async function importPackage(packagePath: string, importInfo: ImportInfo, subFolder = "") {
    const unzipTargetPath = ensureAndroidCompatible(joinPaths(RNFS.TemporaryDirectoryPath, "imported", subFolder));
    await RNFS.unlink(unzipTargetPath).catch(doNothing);
    const unzipFolderPath = await unzip(packagePath, unzipTargetPath);

    const items = await RNFS.readDir(ensureAndroidCompatible(unzipFolderPath));
    const metaDataItem = items.find(f => f.name.endsWith(".json") && !f.name.startsWith("face"));
    if (metaDataItem) {
        const metadataStr = await loadFile(metaDataItem.path);
        const md = JSON.parse(metadataStr);
        if (md.type == "dice") {
            const targetPath = getCustomTypePath(md.name)

            if (await RNFS.exists(targetPath)) {
                importInfo.skippedExistingDice.push(md.name);
                return;
            }

            await RNFS.mkdir(targetPath);
            for (const file of items.filter(item => item.name != metaDataItem.name)) {
                await RNFS.moveFile(file.path, targetPath + "/" + file.name).catch(e => console.log("copy file on import failed", e));
            }
            importInfo.importedDice.push(md.name);
        } else if (md.type == "profile") {
            const targetPath = profileFilePath(md.name);
            if (await RNFS.exists(targetPath)) {
                importInfo.skippedExistingProfiles.push(md.name);
                return;
            }

            const p: Profile = {
                dice: md.dice,
                size: md.size,
                recoveryTime: md.recoveryTime,
                tableColor: md.tableColor,
                soundEnabled: md.soundEnabled
            }

            await saveProfileFile(md.name, p, true);
            importInfo.importedProfiles.push(md.name);
        } else {
            throw "Unknown package type";
        }
    } else {
        // list of zips
        let i = 0;
        for (const item of items) {
            await importPackage(item.path, importInfo, i++ + "");
        }
    }
}

