import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Dice, EmptyDice, templatesList } from "./models";
import { isRTL, translate } from "./lang";
import { IconButton, Spacer } from "./components";
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import { DicePreview } from "./edit-dice";
import { Settings } from "./setting-storage";
import { colors, gStyles } from "./common-style";
import { Switch } from "@rneui/themed";
import IconAnt from 'react-native-vector-icons/AntDesign';

interface DiceSettingsProps {
    style: any;
    dice: Dice;
    isBusy: boolean;
    onOpenLoadDice: () => void;
    onSetActive: (active: boolean) => void;
    onSaveDice: () => void;
    onImageSearchOpen: () => void;
    onSelectTemplate: () => void;
    onEditName: () => void;
    onEditDice?: () => void;
    isLast: boolean;
    isScreenNarrow: boolean;
}

export function DiceSettings({ style, dice, isBusy, onSetActive,onEditDice,
    onOpenLoadDice, onSaveDice, onImageSearchOpen, onSelectTemplate, isLast, isScreenNarrow }: DiceSettingsProps) {

    console.log("dice-temp", dice.template)
    let templ = templatesList.find(t => t.key == dice.template)!;

    const dirStyle: any = { flexDirection: (isRTL() ? "row-reverse" : "row") }

    return <View style={[gStyles.card, style]}>
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

            {/* <IconButton icon="cube-outline" text={translate("List")} onPress={() => onOpenLoadDice()} type="Ionicon" /> */}
            {/* <TouchableOpacity style={[{ alignItems: "center", marginEnd: 15, width: "33%" }, dirStyle]}
                onPress={() => onSetActive(!dice.active)}>
                {dice.active ?
                    <IconMCI name="checkbox-outline" style={{ fontSize: 30, color: gStyles.iconBtnColor.color }} /> :
                    <IconMCI name="checkbox-blank-outline" style={{ fontSize: 30, color: gStyles.iconBtnColor.color }} />
                }
                <Text allowFontScaling={false} style={{ fontSize: 20 }} >{translate("ActiveDice")}</Text>
            </TouchableOpacity> */}

            <Spacer h={20} />

            {dice.faces && dice.faces.length > 0 ?
                <DicePreview facesInfo={dice.faces} size={style.width/3} /> :
                <DicePreview facesInfo={templ?.image} size={style.width/3} />
            }
        </View>
        <View style={[gStyles.cardFooter, {justifyContent:isRTL()?"flex-end":"flex-start"}]}>
            <IconButton icon="list" text={translate("List")} onPress={() => onOpenLoadDice()} type="Ionicon"/>
            {onEditDice && <IconAnt name="edit" size={35} onPress={onEditDice} />}
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