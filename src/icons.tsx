import React from 'react'
import IconAntDesign from "@react-native-vector-icons/ant-design"
import Ionicons from "@react-native-vector-icons/ionicons"
import IconMDI from "@react-native-vector-icons/material-design-icons"
import IconFW from "@react-native-vector-icons/fontawesome5"
import IconMI from "@react-native-vector-icons/material-icons"

const defaultIconColor = "#6E6E6E";

export type IconType = "MI" | "MDI" | "Ionicons" | "AntDesign" | "FontAwesome"

export interface IconProps {
    name: string;
    type?: IconType;
    color?: string;
    size?: number;
}

export function MyIcon({ info, onPress, style }: { info: IconProps, onPress?: () => void, style?: any }) {
    const IconElem =
        info.type == "Ionicons" ? Ionicons :
        info.type == "MI" ? IconMI :
        info.type == "MDI" ? IconMDI :
        info.type == "FontAwesome" ? IconFW :
        IconAntDesign;
    // @ts-ignore
    return <IconElem name={info.name} size={info.size || 22} color={info.color || defaultIconColor} style={[{ width: info.size, height: info.size, margin: 0, padding: 0 }, style]} onPress={onPress} />
}

export function MyCloseIcon({ onClose }: { onClose: () => void }) {
    return <MyIcon
        info={{ type: "AntDesign", name: "close", size: 45 }}
        onPress={onClose} />
}
