import { Fragment, useEffect, useState } from "react";
import { Folders, List, ListElements, Templates } from "./profile";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { isRTL, translate } from "./lang";
import Icon from 'react-native-vector-icons/AntDesign';
import { FadeInView, IconButton } from "./components";
import { DicePreview } from "./edit-dice";
import { RadioButton } from "./radio-button";


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
    loadButton, editButton, isNarrow, onExport, exportButton }: ProfilePickerProps) {
    const [list, setList] = useState<List[]>([]);
    const [revision, setRevision] = useState<number>(0);

    const isDicePicker = folder == Folders.DiceTemplates;

    useEffect(() => {
        if (open) {
            ListElements(folder).then(list => {
                setList(list.filter(l => !exclude || l.key != exclude));
            })
        }
    }, [open, exclude, revision]);

    const dirStyle: any = { flexDirection: isRTL() ? "row-reverse" : "row" };

    return <FadeInView height={open ? height : 0}
        style={[styles.pickerView, { bottom: 0, left: 0, right: 0 }]}>
        <View style={styles.titleHost}>
            {onCreate && <Icon name="pluscircleo" size={50} onPress={() => onCreate()} />}
            <Text allowFontScaling={false} style={{ fontSize: 28, margin: 25 }}>{
                folder == Folders.Profiles ?
                    translate("SelectProfileTitle") : translate("SelectDiceTitle")
            }</Text>
        </View>
        <Seperator width="90%" />
        <View style={styles.closeButton}>
            <Icon name="close" size={45} onPress={onClose} />
        </View>
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
                        <Seperator width="100%" />
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


    return <FadeInView height={open ? height : 0}
        style={[styles.pickerView, { bottom: 0, left: 0, right: 0 }]}>
        <View style={styles.titleHost}>
            {onCreate && // New Die Icon
                <Pressable style={{position:"absolute", left:"20%"}} onPress={() => onCreate()}>
                    <DicePreview facesInfo={[
                        {backgroundColor:"white"},
                        {backgroundColor:"white"},
                        {backgroundColor:"white"},
                        ]} size={65}/>
                    <Icon name="plus" size={25}  style={{
                        position:"absolute",
                        left:-6,
                        top:40,
                        width: 27, height: 27,
                        backgroundColor:"white",
                        
                    }}/>
                </Pressable>}
            <Text allowFontScaling={false} style={{ fontSize: 28, margin: 25 }}>{
                translate("SelectDiceTitle")
            }</Text>
        </View>
        <Seperator width="90%" />
        <View style={styles.closeButton}>
            <Icon name="close" size={45} onPress={onClose} />
        </View>
        {!list || list.length == 0 ?
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
                        <Seperator width="100%" />
                    </View>

                ))}
            </ScrollView>
        }
    </FadeInView>
}

export enum FaceType {
    Image = "image",
    Search = "search",
    Camera = "camera",
    Text = "text",
}


const styles = StyleSheet.create({
    closeButton: {
        position: "absolute",
        right: 10,
        top: 10,
        zIndex: 100
    },
    pickerView: {
        flexDirection: 'column',
        position: 'absolute',
        //backgroundColor: '#EBEBEB',
        backgroundColor: "white",
        zIndex: 99999,
        left: 0,
        borderColor: 'gray',
        borderBottomColor: "transparent",
        borderWidth: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 2,
        alignItems: 'center',
        shadowColor: 'black',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.35,
        shadowRadius: 3.84,
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
    titleHost: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent:"center",
        width:"100%"
    }
});