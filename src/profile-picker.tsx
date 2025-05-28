import { Fragment, useEffect, useState } from "react";
import { ListElements } from "./profile";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { DefaultProfileName, isRTL, translate } from "./lang";
import Icon from 'react-native-vector-icons/AntDesign';
import { FadeInView, IconButton } from "./components";
import { DicePreview } from "./edit-dice";
import { RadioButton } from "./radio-button";
import { List, Templates } from "./models";
import { Folders } from "./disk";
import { colors, gStyles, menuActionIcon } from "./common-style";
import { DiePreview } from "./die-preview";



interface ButtonInfo {
    name?: string;
    icon?: string;
    type?: "MCI" | "Ionicon";
}

interface ProfilePickerProps {
    open: boolean;
    currentProfile: string;
    loadButton: ButtonInfo;
    editButton?: ButtonInfo;
    exportButton?: ButtonInfo;
    height: number | string;
    onClose: () => void;
    onSelect: (item: string) => void;
    exclude?: string | Templates;
    folder: Folders
    onDelete?: (name: string, afterDelete: () => void) => void;
    onEdit?: (name: string, afterSave: () => void) => void;
    onCreate?: () => void;
    onExport?: (name: string) => void;
    isNarrow?: boolean;
}

export function ProfilePicker({ open, height, onClose, onSelect, exclude, folder, onDelete, onEdit, onCreate,
    isNarrow,
    currentProfile,
    onExport }: ProfilePickerProps) {
    const [list, setList] = useState<List[]>([]);
    const [revision, setRevision] = useState<number>(0);

    useEffect(() => {
        if (open) {
            ListElements(folder).then(list => {
                setList(list.filter(l => !exclude || l.key != exclude));
            })
        }
    }, [open, exclude, revision]);

    const create = onCreate && <IconButton icon={{ name: "plus", color: colors.titleBlue }} onPress={() => onCreate()} text={translate("Create")} />
    return <FadeInView height={open ? height : 0} style={[gStyles.pickerView]} onClose={onClose}>
        <View style={[gStyles.pickerTitleHost, { direction: isRTL() ? "rtl" : "ltr" }]}>
            <Text allowFontScaling={false} style={gStyles.pickerTitleText} >{
                translate("SelectProfileTitle")
            }</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                {!isNarrow && create}
                <Icon name="close" size={45} onPress={onClose} />
            </View>
        </View>
        {isNarrow && <View style={{}} >{create}</View>}

        <View style={gStyles.horizontalSeperator} />

        {!list || list.length == 0 ?
            <Text allowFontScaling={false} style={{ fontSize: 25, margin: 25 }}>{translate("NoItemsFound")}</Text> :
            <ScrollView style={[styles.listScroll, { direction: isRTL() ? "rtl" : "ltr" }]}>
                {list.map(item => (
                    <View key={item.key} style={styles.itemHost}>
                        <View style={[styles.itemRow, isRTL() ? { flexDirection: "row" } : { flexDirection: "row" }]}>
                            <Pressable style={{ flex: 1, flexDirection: "row" }} onPress={() => onSelect(item.key)}>
                                <RadioButton selected={currentProfile == item.key} />
                                <View style={[styles.listItem, isRTL() ? { direction: "rtl" } : {}]} key={item.key} >
                                    <Text
                                        allowFontScaling={false}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={{
                                            textAlign: (isRTL() ? "right" : "left"),
                                            fontSize: 28, paddingLeft: 10, paddingRight: 10,
                                            paddingTop: 10, paddingBottom: 10,
                                        }}>{item.name}</Text>
                                </View>
                            </Pressable>
                            {item.key !== DefaultProfileName &&
                                <View style={{ flexDirection: "row-reverse", width: isNarrow ? "25%" : "40%" }}>
                                    {onDelete && !item.readOnly && <IconButton icon={{ name: "delete", ...menuActionIcon }} onPress={() => onDelete(item.key, () => setRevision(prev => prev + 1))} />}
                                    {onEdit && !item.readOnly && <IconButton icon={{ name: "edit", ...menuActionIcon }} onPress={() => onEdit(item.key, () => setRevision(prev => prev + 1))} />}
                                    {onExport && !item.readOnly && <IconButton icon={{ name: "share-social-outline", type: "Ionicons", ...menuActionIcon }} onPress={() => onExport(item.key)} />}
                                </View>}
                        </View>
                        <View style={gStyles.horizontalSeperator} />
                    </View>

                ))}
            </ScrollView>
        }
    </FadeInView>
}


interface DiePickerProps {
    open: boolean;
    height: number;
    onClose: () => void;
    onSelect: (item: string) => void;
    onDelete?: (name: string, afterDelete: () => void) => void;
    onEdit?: (name: string, afterSave: () => void) => void;
    onCreate?: () => void;
    onExport?: (name: string) => void;
    currentDie: string;
    isNarrow: boolean;
}
export function DiePicker({ open, height, currentDie, onClose, onSelect, onDelete, onEdit, onCreate, onExport, isNarrow }: DiePickerProps) {
    const [list, setList] = useState<List[]>([]);
    const [revision, setRevision] = useState<number>(0);

    useEffect(() => {
        if (open) {
            ListElements(Folders.DiceTemplates).then(list => {
                setList(list);
            })
        }
    }, [open, revision]);

    const dir: ViewStyle = { direction: isRTL() ? "rtl" : "ltr" };
    const create = onCreate && <IconButton icon={{ name: "plus", color: colors.titleBlue }} onPress={() => onCreate()} text={translate("Create")} />
    return <FadeInView height={open ? height : 0} onClose={onClose}
        style={[gStyles.pickerView]}>
        <View style={[gStyles.pickerTitleHost, dir]}>
            <Text allowFontScaling={false} style={gStyles.pickerTitleText}>{
                translate("SelectDiceTitle")
            }</Text>
            <View style={[{ flexDirection: "row", alignItems: "center" }, dir]}>
                {!isNarrow && create}
                <Icon name="close" size={45} onPress={onClose} />
            </View>


        </View>
        {isNarrow && <View style={{}} >{create}</View>}

        <View style={[gStyles.horizontalSeperator, { marginBottom: 10 }]} />

        {
            !list || list.length == 0 ?
                <Text allowFontScaling={false} style={{ fontSize: 25, margin: 25 }}>{translate("NoItemsFound")}</Text> :
                <ScrollView style={[styles.listScroll, { direction: isRTL() ? "rtl" : "ltr" }]}>
                    {list.map(item => (
                        <View key={item.key} style={styles.itemHost}>
                            <View style={[styles.itemRow, isRTL() ? { flexDirection: "row" } : { flexDirection: "row" }]}>
                                <Pressable style={{ flex: 1, flexDirection: "row" }} onPress={() => onSelect(item.key)}>
                                    <RadioButton selected={currentDie == item.key} />
                                    <View style={[styles.listItem, isRTL() ? { direction: "rtl" } : {}]} key={item.key} >
                                        {item && item.image && <DiePreview
                                            imageSrc={ item.image.uri} size={45} style={{  }}/>}


                                         {/* {item && item.image && <DicePreview size={45} facesInfo={item.image} />}
                                         {item && !item.image && <DicePreview size={45} facesInfo={item.faces!} />} */}
                                        <Text
                                            allowFontScaling={false}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                            style={{
                                                textAlign: (isRTL() ? "right" : "left"),
                                                fontSize: 28, paddingLeft: 10, paddingRight: 10,
                                                paddingTop: 10, paddingBottom: 10,
                                            }}>{item.name}</Text>
                                    </View>
                                </Pressable>
                                <View style={{ flexDirection: "row-reverse", width: isNarrow ? "25%" : "40%" }}>
                                    {onDelete && !item.readOnly && <IconButton icon={{ name: "delete", ...menuActionIcon }} onPress={() => onDelete(item.key, () => setRevision(prev => prev + 1))} />}
                                    {onEdit && !item.readOnly && <IconButton icon={{ name: "edit", ...menuActionIcon }} onPress={() => onEdit(item.key, () => setRevision(prev => prev + 1))} />}
                                    {onExport && !item.readOnly && <IconButton icon={{ name: "share-social-outline", type: "Ionicons", ...menuActionIcon }} onPress={() => onExport(item.key)} />}

                                </View>
                            </View>
                            <View style={gStyles.horizontalSeperator} />
                        </View>

                    ))}
                </ScrollView>
        }
    </FadeInView >
}




const styles = StyleSheet.create({
    closeButton: {
        position: "absolute",
        right: 10,
    },
    createButton: {
        position: "absolute",
        right: 60
    },
    itemHost: {
        width: "95%",
        justifyContent: "center",
        alignItems: "center",

    },
    itemRow: {
        width: "95%",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    listItem: {
        width: "60%",
        flexDirection: "row",
        paddingLeft: 10,
        paddingRight: 10,
        flex: 1,
    },
    listScroll: {
        //padding: "5%",
        //width: "100%",
    },
    pickerImage: {
        width: 45,
        height: 45,
    },

});