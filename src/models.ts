import { ImageSourcePropType } from "react-native";
import { translate } from "./lang";
import { defaultFloorColor } from "./color-picker";
import { getAssetLocalPath } from "./assets";

// models.ts
export enum Templates {
    prefix = "__",
    Custom = "__custom",
    Numbers = "__numbers",
    Colors = "__colors",
    Dots = "__dots",
    Hanukkah = "__hanukkah",
}

export function isStaticDie(template: Templates): boolean {
    return template.startsWith(Templates.prefix);
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
export type SpinnerShape = "classic" | "rounded";

export interface Profile {
    dice: Dice[];
    size: number;
    recoveryTime: number;
    tableColor: string;
    soundEnabled: boolean
    spinner: boolean // when true, a single spinner replaces the dice
    spinnerDie: Dice; // the spinner's template - uses faces 1-4
    spinnerMusic: boolean; // play "Sevivon Sov Sov Sov" while the spinner spins
    spinnerShape: SpinnerShape; // classic: pointed tip, rounded: like the wooden ones
}

export const EmptyDice: Dice = {
    template: Templates.Dots,
    active: false,
};

export interface Bounds {
     left: number; right: number; bottom: number; top: number 
}

export const EmptyProfile: Profile = {
    dice: [{...EmptyDice, active:true}, EmptyDice, EmptyDice, EmptyDice],
    size: 2,
    recoveryTime: 15,
    tableColor: defaultFloorColor,
    soundEnabled: true,
    spinner: false,
    spinnerDie: { template: Templates.Hanukkah, active: true },
    spinnerMusic: true,
    spinnerShape: "classic",
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
    spinnerOnly?: boolean;
    diceOnly?: boolean;
}

export const templatesList = [
    {
        key: Templates.Numbers,
        name: translate("Numbers"),
        //image: require("../assets/numbers.png"),
        image: {uri: getAssetLocalPath("numbers.png", true)},
        readOnly: true,
    },
    {
        key: Templates.Colors,
        name: translate("Colors"),
        //image: require("../assets/colors.png"),
        image: {uri: getAssetLocalPath("colors.png", true)},
        readOnly: true,
    },
    {
        key: Templates.Dots,
        name: translate("Dots"),
        //image: require("../assets/dots.png"),
        image: {uri: getAssetLocalPath("dots.png", true)},
        readOnly: true,
    },
    {
        key: Templates.Hanukkah,
        name: translate("Hanukkah"),
        image: {uri: getAssetLocalPath("hanukkah.png", true)},
        readOnly: true,
        spinnerOnly: true,
    }
]