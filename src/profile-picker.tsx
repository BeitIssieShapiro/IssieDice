import { Fragment, useEffect, useState } from "react";
import { ListElements } from "./profile";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { isRTL, translate } from "./lang";
import Icon from 'react-native-vector-icons/AntDesign';
import { FadeInView, IconButton } from "./components";
import { DicePreview } from "./edit-dice";
import { RadioButton } from "./radio-button";
import { List, Templates } from "./models";
import { Folders } from "./disk";
import { colors, gStyles } from "./common-style";


function Seperator({ width }: { width: string }) {
    return <View
        style={{
            width,
            marginTop: 4,
            borderBottomColor: 'gray',
            borderBottomWidth: 1,
        }}
    />
}

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

    return <FadeInView height={open ? height : 0} style={[gStyles.pickerView]} onClose={onClose}>
        <View style={[gStyles.pickerTitleHost, { direction: isRTL() ? "rtl" : "ltr" }]}>
            <Text allowFontScaling={false} style={gStyles.pickerTitleText} >{
                translate("SelectProfileTitle")
            }</Text>
            <Icon name="close" size={45} onPress={onClose} />
        </View>

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
                            <View style={{ flexDirection: "row-reverse", width: "40%" }}>
                                {onDelete && !item.readOnly && <IconButton icon="delete" onPress={() => onDelete(item.key, () => setRevision(prev => prev + 1))} />}
                                {onEdit && !item.readOnly && <IconButton icon="edit" onPress={() => onEdit(item.key, () => setRevision(prev => prev + 1))} />}
                                {onExport && !item.readOnly && <IconButton icon="share-social-outline"
                                    type="Ionicon" onPress={() => onExport(item.key)} />}

                            </View>
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
    currentDie: string
}
export function DiePicker({ open, height, currentDie, onClose, onSelect, onDelete, onEdit, onCreate, onExport }: DiePickerProps) {
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

    return <FadeInView height={open ? height : 0} onClose={onClose}
        style={[gStyles.pickerView]}>
        <View style={[gStyles.pickerTitleHost, dir]}>
            <Text allowFontScaling={false} style={gStyles.pickerTitleText}>{
                translate("SelectDiceTitle")
            }</Text>
            <View style={[{ flexDirection: "row", alignItems: "center" }, dir]}>
                {onCreate && <IconButton icon="plus" onPress={() => onCreate()} text={translate("Create")} />}
                <Icon name="close" size={45} onPress={onClose} />
            </View>
            {
                // <Pressable style={{position:"absolute", left:"20%"}} onPress={() => onCreate()}>
                //     <DicePreview facesInfo={[
                //         {backgroundColor:"white"},
                //         {backgroundColor:"white"},
                //         {backgroundColor:"white"},
                //         ]} size={35}/>
                //     <Icon name="plus" size={25}  style={{
                //         position:"absolute",
                //         left:-6,
                //         top:40,
                //         width: 27, height: 27,
                //         backgroundColor:"white",

                //     }}/>
                // </Pressable>}
            }

        </View>
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
                                        {item && item.image && <DicePreview size={45} facesInfo={item.image} />}
                                        {item && !item.image && <DicePreview size={45} facesInfo={item.faces!} />}
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
                                <View style={{ flexDirection: "row-reverse", width: "40%" }}>
                                    {onDelete && !item.readOnly && <IconButton icon="delete" onPress={() => onDelete(item.key, () => setRevision(prev => prev + 1))} />}
                                    {onEdit && !item.readOnly && <IconButton icon="edit" onPress={() => onEdit(item.key, () => setRevision(prev => prev + 1))} />}
                                    {onExport && !item.readOnly && <IconButton icon="share-social-outline"
                                        type="Ionicon" onPress={() => onExport(item.key)} />}

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