import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Dice } from "./profile";
import { isRTL, translate } from "./lang";
import { IconButton, Spacer } from "./components";
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import IconMI from 'react-native-vector-icons/MaterialIcons';
import { BTN_COLOR } from "./settings";

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
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-start", height: 60 }}>
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", marginEnd: 15 }}
                    onPress={() => onSetActive(!dice.active)}>
                    {dice.active ?
                        <IconMCI name="checkbox-outline" style={{ fontSize: 30, color: BTN_COLOR }} /> :
                        <IconMCI name="checkbox-blank-outline" style={{ fontSize: 30, color: BTN_COLOR }} />
                    }
                    <Text allowFontScaling={false} style={{ fontSize: 20 }} >{translate("Active")}</Text>
                </TouchableOpacity>

                {isBusy && <ActivityIndicator size="large" color="#0000ff" />}
                <IconButton text={translate("Load")} onPress={() => onOpenLoadDice()} />
                <IconButton text={translate("Save")} onPress={() => onSaveDice()} />
            </View>
            {/* Bottom Row */}
            <View style={{ flexDirection: "row", alignItems: "center", height: 60 }}>
                <IconMCI name="cube-outline" style={{ fontSize: 30, color: BTN_COLOR }} onPress={() => onSelectTemplate()} />
                <Spacer w={20} />
                <IconMCI name="image-outline" style={{ fontSize: 31, color: BTN_COLOR }} onPress={() => {
                    // SelectFromGallery().then((url) => {
                    //     if (url !== "") {
                    //         onSetImageUrl(url);
                    //     }
                    // })
                }} />
                <Spacer w={20} />


                <IconMCI name="image-search-outline" style={{ fontSize: 30, color: BTN_COLOR }} onPress={() => {
                    onImageSearchOpen();
                }} />
                <Spacer w={20} />
                <View style={styles.verticalSeperator} />


            </View>

        </View>

        {/* Preview */}
        <View>
            <View style={{ flexWrap: "nowrap", overflow: "visible", width: 140 }}>
                {/* <View style={[styles.buttonPreview, { borderColor: profileButton.color }]} >
                    {profileButton.imageUrl?.length > 0 && <Image source={{ uri: profileButton.imageUrl }}
                        style={{
                            borderRadius: 80 * (5 / 12),
                            height: 80 * (5 / 6), width: 80 * (5 / 6),
                            transform: [{ scale: 0.9 }]
                        }} />}
                </View> */}
                <Spacer h={25} />
            </View>
            <View style={{ position: "absolute", flexDirection: "row", bottom: 0, [isRTL() ? "left" : "right"]: 0, height: 25, justifyContent: "flex-end" }}>
                {/* <Text style={{ fontSize: 20, color: profileButton.showName ? "black" : "gray", paddingEnd: profileButton.name.length > 7 ? 0 : 27 }}>
                    {profileButton.name.length > 0 ? profileButton.name : translate("NoButtonName")}
                </Text>
                <IconMI name="edit" size={25} onPress={onEditName} /> */}
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
});