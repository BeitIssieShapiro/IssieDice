import { ImageSourcePropType } from "react-native";
import { translate } from "./lang";

// models.ts
export enum Templates {
    prefix = "__",
    Custom = "__custom",
    Numbers = "__numbers",
    Colors = "__colors",
    Dots = "__dots",
}

export interface FaceText {
    text: string;
    fontSize: number;
    fontName?: string;
    fontBold: boolean;
    color: string;
}

export interface FaceInfo {
    backgroundUri?: string;
    infoUri?: string;
    backgroundColor?: string
    text?: FaceText;
    audioUri?: string
}
export interface Dice {
    template: Templates;
    active: boolean;
    faces?: FaceInfo[];
    texture?: string;
}

/* to change profile you need:
   - add in the  EmptyProfile interface
   - add to EmptyProfile
   - add SettingsKeys for it
   - adjust loadProfileIntoSettings
   - adjust getCurrentProfile
   - add to settingsUI
   - use somewhere
*/
export interface Profile {
    dice: Dice[];
    size: number;
    recoveryTime: number;
    tableColor: string;
    soundEnabled: boolean
}

export const EmptyProfile: Profile = {
    dice: [{ template: Templates.Dots, active: true }],
    size: 2,
    recoveryTime: 15,
    tableColor: "#00FF00",
    soundEnabled: true
};

export const emptyFaceInfo: FaceInfo = {}

export enum FaceType {
    Image = "image",
    Search = "search",
    Camera = "camera",
    Text = "text",
}

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

export interface List {
    key: string | Templates,
    name: string;
    image?: ImageSourcePropType;
    faces?: FaceInfo[];
    readOnly?: boolean;
}

export const templatesList = [
    {
        key: Templates.Numbers,
        name: translate("Numbers"),
        image: require("../assets/numbers.png"),
        readOnly: true,
    },
    {
        key: Templates.Colors,
        name: translate("Colors"),
        image: require("../assets/colors.png"),
        readOnly: true,
    },
    {
        key: Templates.Dots,
        name: translate("Dots"),
        image: require("../assets/dots.png"),
        readOnly: true,
    }
]