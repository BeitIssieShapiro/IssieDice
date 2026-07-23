import IconAnt from "@react-native-vector-icons/ant-design"
import IconIonicons from "@react-native-vector-icons/ionicons"
import IconMDI from "@react-native-vector-icons/material-design-icons"
import IconMI from "@react-native-vector-icons/material-icons"
import IconFW from "@react-native-vector-icons/fontawesome5"

const defaultIconColor = "#6E6E6E";

export type IconType = "MCI" | "MDI" | "Ionicons" | "AntDesign" | "FontAwesome" | "MI"

export interface IconProps {
    name: string;
    type?: IconType;
    color?: string;
    size?: number;
}

export function MyIcon({ info, onPress, style }: { info: IconProps, onPress?: () => void, style?: any }) {
    const IconElem =
        info.type == "Ionicons" ? IconIonicons :
        info.type == "MCI" ? IconMDI :
        info.type == "MDI" ? IconMDI :
        info.type == "MI" ? IconMI :
        info.type == "FontAwesome" ? IconFW :
        IconAnt;
    // @ts-ignore
    return <IconElem name={info.name} size={info.size || 22} color={info.color || defaultIconColor} style={[{ width: info.size, height: info.size, margin: 0, padding: 0 }, style]} onPress={onPress} />
}

export function MyCloseIcon({ onClose }: { onClose: () => void }) {
    return <MyIcon
        info={{ type: "AntDesign", name: "close", size: 45 }}
        onPress={onClose} />
}
