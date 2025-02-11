import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { isRTL } from "./lang";
import IconAnt from 'react-native-vector-icons/AntDesign';
import { useEffect, useState } from "react";


export function IconButton({ icon, onPress, text }: { icon?: string, text: string, onPress: () => void }) {

    return <TouchableOpacity style={[styles.iconButton, { flexDirection: isRTL() ? "row" : "row-reverse", justifyContent: "center" }]} onPress={onPress} >
        {!!text && <Text allowFontScaling={false} style={{ fontSize: 22, marginInlineStart: 5, marginInlineEnd: 5 }}>{text}</Text>}
        {icon && <IconAnt name={icon} style={styles.icon} />}
    </TouchableOpacity>
}

export function Spacer({ h, w, bc }: { h?: Number, w?: Number, bc?: string }) {
    return <View style={{ height: h, width: w, backgroundColor: bc }} />
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
        fontSize: 30
    },

    iconButton: {

        marginInlineEnd: 10,
        maxHeight: 39,
        minHeight: 39,
        minWidth: 39,
        alignItems: "center",
        borderColor: "gray",
        borderStyle: "solid",
        borderWidth: 1,
        padding: 2,
        borderRadius: 20,
    }
});