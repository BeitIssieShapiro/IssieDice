import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Dice, SettingsKeys, templatesList } from "./profile";
import { isRTL, translate } from "./lang";
import { IconButton, Spacer } from "./components";
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import IconMI from 'react-native-vector-icons/MaterialIcons';
import IconAnt from 'react-native-vector-icons/AntDesign';
import { BTN_COLOR } from "./settings";
import { DicePreview } from "./edit-dice";
import { Settings } from "./setting-storage";


interface DiceSettingsProps {
    sectionStyle: any;
    dice: Dice;
    isBusy: boolean;
    onOpenLoadDice: () => void;
    onSetActive: (active: boolean) => void;
    onSaveDice: () => void;
    onImageSearchOpen: () => void;
    onSelectTemplate: () => void;
    onEditName: () => void;
    isLast: boolean;
    isScreenNarrow: boolean;
}

export function DiceSettings({ sectionStyle, dice, isBusy, onSetActive,
    onOpenLoadDice, onSaveDice, onImageSearchOpen, onSelectTemplate, isLast, isScreenNarrow }: DiceSettingsProps) {

    const templ = templatesList.find(t => t.key == dice.template);
    const dirStyle: any = { flexDirection: (isRTL() ? "row-reverse" : "row") }

    return <View style={[{ width: "100%", flexDirection: "column" }]}>
        <View style={[styles.section, dirStyle]}>
            <View style={dirStyle}>
                <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("DiceName")}:</Text>
                <Text allowFontScaling={false} style={[styles.textValue, { textAlign: isRTL() ? "right" : "left" }]}>
                    {templ ? templ.name : dice.template}
                </Text>
            </View>
            <IconButton icon="cube-outline" text={translate("List")} onPress={() => onOpenLoadDice()} type="Ionicon" />
        </View>
        <View style={[styles.section, dirStyle]} >
            <TouchableOpacity style={[{  alignItems: "center", marginEnd: 15, width: "33%" }, dirStyle]}
                onPress={() => onSetActive(!dice.active)}>
                {dice.active ?
                    <IconMCI name="checkbox-outline" style={{ fontSize: 30, color: BTN_COLOR }} /> :
                    <IconMCI name="checkbox-blank-outline" style={{ fontSize: 30, color: BTN_COLOR }} />
                }
                <Text allowFontScaling={false} style={{ fontSize: 20 }} >{translate("ActiveDice")}</Text>
            </TouchableOpacity>



            {templ?.icon && <Image source={templ.icon} style={styles.previewIcon} />}
            {dice.faces && dice.faces.length > 0 && <DicePreview faces={dice.faces} size={styles.previewIcon.width} />}
            <View style={{ height: 10, width: styles.previewIcon.width }} />
        </View>
        {!isLast && <View style={styles.horizontalSeperator} />}
    </View>

}

const styles = StyleSheet.create({
    settingsRow: {
        flexDirection: "row",
        alignItems: "center"
    },
    cubeTitle: {
        fontSize: 25,
        fontWeight: "bold",
        color: "black",
        marginEnd: 20,
    },
    verticalSeperator: {
        width: 2,
        height: "100%",
        backgroundColor: "lightgray",
    },
    horizontalSeperator: {
        height: 2,
        width: "100%",
        backgroundColor: "lightgray",
    },
    buttonPreview: {
        alignItems: "center",
        justifyContent: "center",
        height: 80,
        width: 80,
        borderWidth: 2,
        borderStyle: "solid",
        borderRadius: 40,
        marginBottom: 5,
    },
    previewIcon: {
        width: 65,
        height: 65
    },
    section: {
        backgroundColor: "white",
        flexDirection: "row",
        height: 70,
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 45,
        marginTop: 10,
    },
    numberSelector: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: "100%"
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0D3D63",
    },
    textValue: {
        marginEnd: 10,
        marginStart: 10,
        fontSize: 20,
        color: "black"
    },
});