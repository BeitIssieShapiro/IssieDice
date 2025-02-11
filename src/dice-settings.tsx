import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Dice, templatesList } from "./profile";
import { isRTL, translate } from "./lang";
import { IconButton, Spacer } from "./components";
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import IconMI from 'react-native-vector-icons/MaterialIcons';
import { BTN_COLOR } from "./settings";
import { DicePreview } from "./edit-dice";

interface DiceSettingsProps {
    index: 0 | 1 | 2 | 3;
    revision: number;
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

export function DiceSettings({ index, revision, dice, isBusy, onSetActive,
    onOpenLoadDice, onSaveDice, onImageSearchOpen, onSelectTemplate, isLast, isScreenNarrow }: DiceSettingsProps) {

    const templ = templatesList.find(t => t.key == dice.template);

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
        {/* Buttons */}
        <View style={{ flexDirection: "column" }}>

            {/* Top Row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", height: 60 }}>

                <IconButton icon="cube-outline" text={translate("Choose")} onPress={() => onOpenLoadDice()} type="Ionicon" />
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", marginEnd: 15 }}
                    onPress={() => onSetActive(!dice.active)}>
                    {dice.active ?
                        <IconMCI name="checkbox-outline" style={{ fontSize: 30, color: BTN_COLOR }} /> :
                        <IconMCI name="checkbox-blank-outline" style={{ fontSize: 30, color: BTN_COLOR }} />
                    }
                    <Text allowFontScaling={false} style={{ fontSize: 20 }} >{translate("Active")}</Text>
                </TouchableOpacity>
                {isBusy && <ActivityIndicator size="large" color="#0000ff" />}
            </View>
            {/* Bottom Row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent:"center", height: 60 }}>

                {templ?.icon && <Image source={templ.icon} style={styles.previewIcon} />}
                {dice.faces && <DicePreview faces={dice.faces} size={styles.previewIcon.width} />}
            </View>

        </View>
    </View >

}

const styles = StyleSheet.create({
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
    }
});