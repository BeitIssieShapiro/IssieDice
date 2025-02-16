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

const MAX_DICE_SIZE = 7;

interface DiceSettingsProps {
    index: 0 | 1 | 2 | 3;
    revision: number;
    dice: Dice;
    isBusy: boolean;
    onOpenLoadDice: () => void;
    onSetActive: (active: boolean) => void;
    onSetSize: (size: number) => void;
    onSaveDice: () => void;
    onImageSearchOpen: () => void;
    onSelectTemplate: () => void;
    onEditName: () => void;
    isLast: boolean;
    isScreenNarrow: boolean;
}

export function DiceSettings({ index, revision, dice, isBusy, onSetActive, onSetSize,
    onOpenLoadDice, onSaveDice, onImageSearchOpen, onSelectTemplate, isLast, isScreenNarrow }: DiceSettingsProps) {

    const templ = templatesList.find(t => t.key == dice.template);
    const dirStyle: any = { flexDirection: (isRTL() ? "row" : "row-reverse") }

    return <View style={[{
        direction: isRTL() ? "rtl" : "ltr",
        width: "100%",
        //height: 160,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomColor: "lightgray",
        borderBottomWidth: isLast ? 0 : 2,
        paddingBottom: 15,
        paddingTop: 15,
    }, isScreenNarrow && { flexDirection: "column", alignItems: "flex-start" }]}>

        <View style={{ flexDirection: "column" }}>
            <View style={styles.settingsRow}>
                <Text style={styles.cubeTitle}>{templ?.name || dice.template}</Text>
                <IconButton icon="cube-outline" text={translate("Change")} onPress={() => onOpenLoadDice()} type="Ionicon" />
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", marginEnd: 15 }}
                    onPress={() => onSetActive(!dice.active)}>
                    {dice.active ?
                        <IconMCI name="checkbox-outline" style={{ fontSize: 30, color: BTN_COLOR }} /> :
                        <IconMCI name="checkbox-blank-outline" style={{ fontSize: 30, color: BTN_COLOR }} />
                    }
                    <Text allowFontScaling={false} style={{ fontSize: 20 }} >{translate("Active")}</Text>
                </TouchableOpacity>
            </View>

            {/* Dice Size */}
            <View style={[styles.section, dirStyle]} >
                <View style={styles.numberSelector}>
                    <IconAnt name="minuscircleo" color={dice.size == 1 ? "lightgray" : BTN_COLOR} size={35} onPress={() => onSetSize(dice.size - 1)} />
                    <Text allowFontScaling={false} style={{ fontSize: 30, marginHorizontal: 10 }}>{dice.size}</Text>
                    <IconAnt name="pluscircleo" color={dice.size == MAX_DICE_SIZE ? "lightgray" : BTN_COLOR} size={35} onPress={() => onSetSize(dice.size + 1)} />
                </View>
                <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("DiceSize")}</Text>
            </View>
            {/* Top Row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", height: 60 }}>




                {isBusy && <ActivityIndicator size="large" color="#0000ff" />}
            </View>
            {/* Bottom Row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 60 }}>

                {templ?.icon && <Image source={templ.icon} style={styles.previewIcon} />}
                {dice.faces && <DicePreview faces={dice.faces} size={styles.previewIcon.width} />}
            </View>

        </View>
    </View >

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
        height: "80%",
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
        width: 55,
        height: 55
    },
    section: {
        backgroundColor: "white",
        height: 60,
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
});