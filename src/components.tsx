import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { isRTL, translate } from "./lang";
import IconAnt from 'react-native-vector-icons/AntDesign';
import IconIonicons from 'react-native-vector-icons/Ionicons';
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";

import Icon from 'react-native-vector-icons/FontAwesome';


import { useEffect, useRef, useState } from "react";
import { colors, gStyles } from "./common-style";
import { BlurView } from "@react-native-community/blur";


export function LabeledIconButton({ type, icon, label, onPress, size = 40, color = "black" }:
    {
        type?: undefined | "Ionicon" | "MCI",
        icon: string,
        label: string,
        onPress: () => void,
        size?: number,
        color?: string,
    }) {
    const IconElem = type == "Ionicon" ? IconIonicons :
        (type == "MCI" ? MCIIcon : IconAnt);

    return <Pressable onPress={onPress} style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", width: 70 }}>
        <IconElem name={icon} size={size} color={color} />
        <Text allowFontScaling={false} style={gStyles.labeledIconText}>{label}</Text>
    </Pressable>
}

export function IconButton({ icon, onPress, text, type, backgroundColor }:
    { icon?: string, text?: string, backgroundColor?: string, onPress: () => void, type?: undefined | "Ionicon" | "MCI" }) {
    const IconElem = type == "Ionicon" ? IconIonicons :
        (type == "MCI" ? MCIIcon : IconAnt);

    return <TouchableOpacity style={[styles.iconButton, { flexDirection: "row", direction: isRTL() ? "rtl" : "ltr" },
    backgroundColor && { backgroundColor },
    !text && { borderWidth: 0 }]} onPress={onPress} >

        {icon && <IconElem name={icon} style={styles.icon} />}
        {!!text && <Text allowFontScaling={false} style={{ fontSize: 22, marginInlineStart: 5, marginInlineEnd: 5, textAlign: icon ? "left" : "center" }}>{text}</Text>}
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
    min: number;
    max: number;
    value: number;
    onUp: () => void;
    onDown: () => void;
}
export function NumberSelector({ min, max, value, onUp, onDown }: NumberSelectorProps) {
    return (
        <View style={styles.numberSelector}>
            <IconAnt name="minuscircleo" color={value == min ? "lightgray" : gStyles.iconBtnColor.color} size={30} onPress={value > min ? onDown : undefined} />
            <Text allowFontScaling={false} style={{ fontSize: 27, marginHorizontal: 10 }}>{value}</Text>
            <IconAnt name="pluscircleo" color={value == max ? "lightgray" : gStyles.iconBtnColor.color} size={30} onPress={value < max ? onUp : undefined} />
        </View>
    )
}


const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const FadeInView = (props: any) => {
    const fadeAdmin = useRef(new Animated.Value(0)).current;
    const [hide, setHide] = useState(true)
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
    return (<View style={{ ...StyleSheet.absoluteFillObject }}>
        {/* <View style={{...StyleSheet.absoluteFillObject, backgroundColor:"black", opacity:.2, zIndex:1000}}></View> */}
        {(props.width > 0 || props.height > 0) && <AnimatedBlurView
            onTouchEnd={props.onClose && props.onClose}
            blurAmount={5}
            blurType="light"
            style={{ ...StyleSheet.absoluteFillObject, zIndex: 1000 }}
            reducedTransparencyFallbackColor="white"

        />}
        <Animated.View
            style={[props.style, {
                overflow: props.overflow || "hidden",
                //opacity: fadeAdmin,         // Bind opacity to animated value
            }, props.width ? { width: fadeAdmin } : { height: fadeAdmin }]}
        >
            {props.children}
        </Animated.View>
    </View>
    );
}

export function ScreenTitle({ title, onClose, onAbout, iconName = "close" }: { title: string, onClose: () => void, onAbout?: () => void, iconName?: string }) {
    return <View style={gStyles.screenTitle}>
        {onAbout ?
            <IconAnt name={"infocirlceo"} color={gStyles.screenTitleText.color} size={35} onPress={onAbout} /> :
            <Spacer h={10} />}
        <Text allowFontScaling={false} style={gStyles.screenTitleText}>{title}</Text>
        <IconAnt name={iconName} color={gStyles.screenTitleText.color} size={35} onPress={onClose} />
    </View>
}

export function Section({ title, component, iconName, marginHorizontal }: { title: string, component: any, iconName?: string, marginHorizontal: number }) {
    return <View style={[gStyles.sectionHost, { direction: isRTL() ? "rtl" : "ltr", marginHorizontal }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
            {iconName && <MCIIcon name={iconName} color={colors.sectionIconColor} size={35} style={{ marginInlineEnd: 10 }} />}
            <Text allowFontScaling={false} style={{ fontSize: 25 }}>{title}</Text>
        </View>
        {component}
    </View>
}

export function ColumnChip({ title, component }: { title: string, component: any }) {
    return <View style={[gStyles.vchip]}>
        {component}
        <Text allowFontScaling={false} style={[gStyles.vchipText, gStyles.labeledIconText]}>{title}</Text>
    </View>
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
        height: "100%"
    },

});

