// disk.ts
import * as RNFS from "react-native-fs";
import { ensureAndroidCompatible } from "./utils";
import path from "path";

export const enum Folders {
    Profiles = "profiles",
    Dice = "dice",
    DiceTemplates = "templates",
    FaceType = "faceType",
    CustomDice = "custom-dice"
}
export function doNothing() { }


export class AlreadyExists extends Error { }
export class InvalidFileName extends Error { }

export const InvalidCharachters = "<, >, :, \", /, \, |, ?, *,"


export async function saveJSON<T>(path: string, obj: T): Promise<void> {
  const json = JSON.stringify(obj, null, 2);
  await RNFS.writeFile(ensureAndroidCompatible(path), json, "utf8");
}

export async function loadJSON<T>(path: string, defaults: T): Promise<T> {
  try {
    const raw = await RNFS.readFile(ensureAndroidCompatible(path), "utf8");
    return JSON.parse(raw) as T;
  } catch (_err) {
    return defaults;
  }
}

export function unlinkFile(path: string) {
    return RNFS.unlink(ensureAndroidCompatible(path));
}


export function loadFile(path: string) {
    return RNFS.readFile(ensureAndroidCompatible(path), 'utf8');
}

export async function writeFileWithCacheBuster(targetPath: string, content: string, encoding: string | undefined = undefined) {
    const { folder, fileName, extension } = splitFilePath(targetPath);
    const cacheBusterPrefixPos = fileName.indexOf("$$");

    if (!await RNFS.exists(ensureAndroidCompatible(folder))) {
        await RNFS.mkdir(ensureAndroidCompatible(folder));
    }
    if (cacheBusterPrefixPos < 0) {
        await RNFS.unlink(ensureAndroidCompatible(targetPath)).catch(doNothing);
    } else {
        const baseFileName = fileName.substring(0, cacheBusterPrefixPos);
        const files = await RNFS.readDir(ensureAndroidCompatible(folder));
        for (const file of files) {
            // delete any file with same base path
            if (file.name.startsWith(baseFileName) && file.name.endsWith(extension)) {
                await RNFS.unlink(ensureAndroidCompatible(file.path));
            }
        }
    }
    return writeFile(targetPath, content, undefined, encoding);
}

export async function writeFile(path: string, content: string, verifyFolderExists?: string, encoding?: string) {
    if (verifyFolderExists) {
        if (!await RNFS.exists(ensureAndroidCompatible(verifyFolderExists))) {
            await RNFS.mkdir(ensureAndroidCompatible(verifyFolderExists));
        }
    }
    return RNFS.writeFile(ensureAndroidCompatible(path), content, encoding)

}

function splitFilePath(targetPath: string): { folder: string; fileName: string; extension: string } {
    const lastSlashIndex = targetPath.lastIndexOf("/");
    let folder = "";
    let fullName = targetPath;
    if (lastSlashIndex !== -1) {
        folder = targetPath.substring(0, lastSlashIndex);
        fullName = targetPath.substring(lastSlashIndex + 1);
    }
    const lastDotIndex = fullName.lastIndexOf(".");
    let fileName = fullName;
    let extension = "";
    if (lastDotIndex !== -1) {
        fileName = fullName.substring(0, lastDotIndex);
        extension = fullName.substring(lastDotIndex); // includes the dot, e.g. ".jpg"
    }
    return { folder, fileName, extension };
}

export const copyFileToFolder = async (sourcePath: string, targetPath: string, overwrite = true) => {

    const { folder, fileName, extension } = splitFilePath(targetPath);
    await RNFS.mkdir(ensureAndroidCompatible(folder));
    if (overwrite) {
        const cacheBusterPrefixPos = fileName.indexOf("$$");

        if (cacheBusterPrefixPos < 0) {
            await RNFS.unlink(ensureAndroidCompatible(targetPath)).catch(doNothing);
        } else {
            const baseFileName = fileName.substring(0, cacheBusterPrefixPos);
            const files = await RNFS.readDir(ensureAndroidCompatible(folder));
            for (const file of files) {
                // delete any file with same base path
                if (file.name.startsWith(baseFileName) && file.name.endsWith(extension)) {
                    await RNFS.unlink(ensureAndroidCompatible(file.path));
                }
            }
        }
    }
    await RNFS.copyFile(ensureAndroidCompatible(sourcePath), ensureAndroidCompatible(targetPath));
};

export const deleteFile = async (filePath: string) => {
    if (filePath.length == 0 || filePath.startsWith("http")) return;
    try {
        // Check if the file exists before attempting to delete it
        const fileExists = await RNFS.exists(ensureAndroidCompatible(filePath));

        if (fileExists) {
            await RNFS.unlink(ensureAndroidCompatible(filePath)); // Delete the file
            console.log(`File deleted: ${filePath}`);
        } else {
            console.log('File does not exist');
        }
    } catch (e: any) {
        console.log("error deleting file", filePath, e.message);
    }
}


export function getTempFileName(ext: string) {
    const date = new Date()
    let fn = Math.random() + '-' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + 'T' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);

    return path.join(RNFS.TemporaryDirectoryPath, fn + "." + ext);
}

export async function getRandomFile(filePath: string, ext: string): Promise<string> {
    const tempFileTime = getTempFileName(ext)
    await RNFS.copyFile(filePath, tempFileTime);
    return tempFileTime;
}

export function getCacheBusterSuffix(): string {
    return "$$" + Math.floor(Math.random() * 1000000);
}

