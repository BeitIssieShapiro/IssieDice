import path from "path";
import { AudioAsset } from "./audio";
import { copyFileAssets, downloadFile, exists, TemporaryDirectoryPath } from "react-native-fs";
import { ImageSourcePropType, Platform } from "react-native";
import { Image } from "@rneui/base";
import { ensureAndroidCompatible } from "./utils";
import Sound from "react-native-sound";

const assets = [
    { name: "dice-sound.mp3", asset: require("../assets/dice-sound.mp3") },
    { name: "dots.png", asset: require("../assets/dots.png") },
    { name: "numbers.png", asset: require("../assets/numbers.png") },
    { name: "colors.png", asset: require("../assets/colors.png") },
    { name: "dice-empty.glb", asset: require("../assets/dice-empty.glb") },
    { name: "transparent_shadow_material.filamat", asset: require("../assets/transparent_shadow_material.filamat") },
]


export function initAssets() {
    const waitFor: Promise<void>[] = [];
    assets.forEach((asset) => {
        waitFor.push(loadAsset(asset));
    });
    return Promise.all(waitFor).then(() => {
        Object.keys(Sounds).forEach((key) => {
            Sounds[key].sound = new Sound(Sounds[key].asset, undefined, (error) => {
                if (error) {
                    console.log("Error loading sound", error);
                } else {
                    console.log("Sound loaded");
                }
            })
        })
    });
}

export function getAssetLocalPath(name: string, forceFilePrefix: boolean = false) {
    return ensureAndroidCompatible(path.join(TemporaryDirectoryPath, name), forceFilePrefix);
}

async function loadAsset(asset: { name: string, asset: ImageSourcePropType }) {
    const fileName = getAssetLocalPath(asset.name);
    if (await exists(fileName)) return;
    if (Platform.OS === 'android') {
        await copyFileAssets(asset.name, fileName);
    } else {
        console.log("IOS: Downloading", asset.name);
        const src = Image.resolveAssetSource(asset.asset);
        let downloadInfo = await downloadFile({
            fromUrl: src.uri,
            toFile: fileName
        });
        await downloadInfo.promise;
    }
}

export const Sounds: { [key: string]: AudioAsset } = {
    collision: {
        name: "collision",
        asset: getAssetLocalPath("dice-sound.mp3"),
    },
};

