import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { isRTL } from "./lang";
import IconAnt from 'react-native-vector-icons/AntDesign';


export function IconButton({ icon, onPress, text }: { icon?: string, text: string, onPress: () => void }) {

    return <TouchableOpacity style={[styles.iconButton, { flexDirection: isRTL() ? "row" : "row-reverse", justifyContent: "center" }]} onPress={onPress} >
        <Text allowFontScaling={false} style={{ fontSize: 22, marginInlineStart: 5, marginInlineEnd: 5 }}>{text}</Text>
        {icon && <IconAnt name={icon} style={styles.icon} />}
    </TouchableOpacity>
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
        minWidth: 80,
        alignItems: "center",
        borderColor: "gray",
        borderStyle: "solid",
        borderWidth: 1,
        padding: 2,
        borderRadius: 20,
    }
});