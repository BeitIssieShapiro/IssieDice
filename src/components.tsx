import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { isRTL } from "./lang";
import IconAnt from 'react-native-vector-icons/AntDesign';
import IconIonicons from 'react-native-vector-icons/Ionicons';
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";

import Icon from 'react-native-vector-icons/FontAwesome';


import { useEffect, useState } from "react";
import { BTN_COLOR } from "./settings";


export function IconButton({ icon, onPress, text, type, backgroundColor, width }:
    { icon?: string, text?: string, width?: number, backgroundColor?: string, onPress: () => void, type?: undefined | "Ionicon" | "MCI" }) {
    const IconElem = type == "Ionicon" ? IconIonicons :
        (type == "MCI" ? MCIIcon : IconAnt);

    return <TouchableOpacity style={[styles.iconButton, { flexDirection: isRTL() ? "row-reverse" : "row" },
    backgroundColor && { backgroundColor },
    !text && { borderWidth: 0 }]} onPress={onPress} >

        {icon && <IconElem name={icon} style={styles.icon} />}
        {!!text && <Text allowFontScaling={false} style={{ width, fontSize: 22, marginInlineStart: 5, marginInlineEnd: 5, textAlign: icon ? "left" : "center" }}>{text}</Text>}
    </TouchableOpacity>
}

export function Spacer({ h, w, bc }: { h?: Number, w?: Number, bc?: string }) {
    return <View style={{ height: h, width: w, backgroundColor: bc }} />
}

export function isTooWhite(color: string) {
    try {
        const limit = 210;
        const bigint = parseInt(color.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;

        return (r > limit && g > limit && b > limit);
    } catch (e) {
    }
    return false;
}

export function ColorButton({ callback, color, size, icon, index, iconColor }: any) {
    let borderStyle = {}
    if (isTooWhite(color)) {
        borderStyle = { borderWidth: 1, borderColor: "gray" }
    }

    return <TouchableOpacity
        onPress={callback}
        activeOpacity={0.7}
        key={"" + index}
    >
        <View style={[{
            backgroundColor: color,
            borderRadius: size / 2,
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center'

        }, borderStyle]}
        >

            {icon && <Icon color={iconColor || "white"} size={size / 2} name={icon}></Icon>}
        </View>
    </TouchableOpacity>
}
export interface NumberSelectorProps {
    title: string;
    style: any;
    min: number;
    max: number;
    value: number;
    onUp: () => void;
    onDown: () => void;
    titleStyle: any;
}
export function NumberSelector({ style, title, min, max, value, onUp, onDown, titleStyle }: NumberSelectorProps) {
    return (
        <View style={style}>
            <View style={styles.numberSelector}>
                <IconAnt name="minuscircleo" color={value == min ? "lightgray" : BTN_COLOR} size={35} onPress={value > min ? onDown : undefined} />
                <Text allowFontScaling={false} style={{ fontSize: 30, marginHorizontal: 10 }}>{value}</Text>
                <IconAnt name="pluscircleo" color={value == max ? "lightgray" : BTN_COLOR} size={35} onPress={value < max ? onUp : undefined} />
            </View>
            <Text allowFontScaling={false} style={titleStyle}>{title}</Text>
        </View>
    )
}


export const FadeInView = (props: any) => {
    const [fadeAdmin] = useState(new Animated.Value(0))
    const [hide, setHide] = useState(false)
    useEffect(() => {
        setHide(false)

        Animated.timing(
            fadeAdmin,
            {
                toValue: props.width ? props.width : props.height,
                duration: props.duration || 500,
                useNativeDriver: false,

            }
        ).start((res) => {
            setHide(props.width ? props.width == 0 : props.height == 0)
        });
    }, [props.height, props.width])

    if (hide) {
        return (<View />);
    }
    return (<Animated.View
        style={[props.style, {
            overflow: props.overflow || "hidden",
            //opacity: fadeAdmin,         // Bind opacity to animated value
        }, props.width ? { width: fadeAdmin } : { height: fadeAdmin }]}
    >
        {props.children}
    </Animated.View>
    );
}

const styles = StyleSheet.create({

    icon: {
        color: "#6E6E6E",
        fontSize: 28
    },

    iconButton: {

        margin: 10,
        paddingLeft: 10,
        paddingRight: 10,

        maxHeight: 39,
        minHeight: 39,
        minWidth: 39,
        alignItems: "center",
        borderColor: "gray",
        borderStyle: "solid",
        borderWidth: 1,
        padding: 2,
        borderRadius: 20,
    },
    numberSelector: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: "100%"
    },
});

