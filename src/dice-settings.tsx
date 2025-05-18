import { StyleSheet, Text, View } from "react-native";
import { Dice, templatesList } from "./models";
import { isRTL, translate } from "./lang";
import { IconButton, MyIcon, Spacer } from "./components";
import { DicePreview } from "./edit-dice";
import { colors, gStyles } from "./common-style";
import { Switch } from "@rneui/themed";

interface DiceSettingsProps {
    width: number,
    height: number
    dice: Dice;
    onOpenLoadDice: () => void;
    onSetActive: (active: boolean) => void;
    onEditDice?: () => void;

}

export function DiceSettings({ width, height, dice, onSetActive, onEditDice, onOpenLoadDice }: DiceSettingsProps) {

    let templ = templatesList.find(t => t.key == dice.template)!;

    const isMobile = width < 300 || height < 300;
    const isNarrow = width < 300;

    const dirStyle: any = { flexDirection: (isRTL() ? "row-reverse" : "row") }

    return <View style={[gStyles.card, { width, height, marginBottom: 10 }]}>
        <View style={[gStyles.cardTitle, dirStyle]}>
            <Text allowFontScaling={false} style={[styles.textValue, { textAlign: isRTL() ? "right" : "left" }]}>
                {templ ? templ.name : dice.template}
            </Text>
            <Switch
                value={dice.active}
                onValueChange={(active) => onSetActive(active)}
                color={colors.switchColor}
            />
        </View>
        <View style={gStyles.cardBody}>
            <Spacer h={isMobile ? 5 : 20} />

            {dice.faces && dice.faces.length > 0 ?
                <DicePreview facesInfo={dice.faces} size={width / 3} /> :
                <DicePreview facesInfo={templ?.image} size={width / 3} />
            }
        </View>
        <View style={[gStyles.cardFooter, { flexDirection: "row", justifyContent: isNarrow ? "space-between" : "flex-start", alignItems: "center", direction: (isRTL() ? "rtl" : "ltr") }]}>
            <IconButton icon={{ name: "list", type: "Ionicons", size: 30, color: colors.titleBlue }} text={isMobile ? "" : translate("List")} onPress={() => onOpenLoadDice()} />
            {onEditDice && <MyIcon info={{ name: "edit", type: "AntDesign", size: 30, color: colors.titleBlue }} onPress={onEditDice} />}
        </View>
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

    numberSelector: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: "100%"
    },

    textValue: {
        marginEnd: 10,
        marginStart: 10,
        fontSize: 20,
        color: "black"
    },
});