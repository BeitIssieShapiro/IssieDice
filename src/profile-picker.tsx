import { Fragment, useEffect, useState } from "react";
import { Folders, List, ListElements, Templates } from "./profile";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { isRTL, translate } from "./lang";
import Icon from 'react-native-vector-icons/AntDesign';
import { FadeInView, IconButton } from "./components";
import { DicePreview } from "./edit-dice";


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
    name: string;
    icon?: string;
}

interface ProfilePickerProps {
    open: boolean;
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

export function ProfilePicker({ open, height, onClose, onSelect, exclude, folder, onDelete, onEdit, onCreate, loadButton, editButton, isNarrow, onExport, exportButton }: ProfilePickerProps) {
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


    return <FadeInView height={open ? height : 0}
        style={[styles.pickerView, { bottom: 0, left: 0, right: 0 }]}>
        <View style={styles.titleHost}>
            {onCreate && <Icon name="pluscircleo" size={50} onPress={() => onCreate()} />}
            <Text allowFontScaling={false} style={{ fontSize: 28, margin: 25 }}>{
                folder == Folders.Profiles ?
                    translate("SelectProfileTitle") : translate("SelectButtonTitle")
            }</Text>
        </View>
        <Seperator width="90%" />
        <View style={styles.closeButton}>
            <Icon name="close" size={45} onPress={onClose} />
        </View>
        {!list || list.length == 0 ?
            <Text allowFontScaling={false} style={{ fontSize: 25, margin: 25 }}>{translate("NoItemsFound")}</Text> :
            <ScrollView style={styles.listHost}>
                {list.map(item => (
                    <Fragment key={item.key}>
                        <View style={{
                            flexDirection: isRTL() ? "row-reverse" : "row",
                            width: "95%",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}>
                            <View style={styles.listItem} key={item.key} >
                                {item && item.icon && <Image source={item.icon} style={styles.pickerImage} />}
                                {item && !item.icon && isDicePicker && <DicePreview size={45} faces={item.faces!} />}
                                <Text
                                    allowFontScaling={false}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{
                                        textAlign: (isRTL() ? "right" : "left"),
                                        fontSize: 28, paddingLeft: 15, paddingRight: 15,
                                        paddingTop: 10, paddingBottom: 10,
                                    }}>{item.name}</Text>
                            </View>
                            <View style={{ flexDirection: "row" }}>
                                <IconButton icon={loadButton?.icon} onPress={() => onSelect(item.key)} text={loadButton.name} />
                                {onDelete && <IconButton icon="delete" onPress={() => onDelete(item.key, () => setRevision(prev => prev + 1))} text={translate("Delete")} />}
                                {onEdit && !item.readOnly && <IconButton icon={editButton?.icon} text={isNarrow && editButton?.icon ? "" :editButton?.name!} onPress={() => onEdit(item.key, () => setRevision(prev => prev + 1))} />}
                                {onExport && !item.readOnly && <IconButton icon={exportButton?.icon} text={isNarrow && exportButton?.icon ? "" :exportButton?.name!} onPress={() => onExport(item.key)} />}

                            </View>
                        </View>
                        <Seperator width="100%" />
                    </Fragment>

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

interface FaceTypePickerProps {
    open: boolean;
    onSelect: (item: string) => void;
    onClose: () => void;
}

export function FaceTypePicker(props: FaceTypePickerProps) {
    return <ProfilePicker
        open={props.open}
        height={400}
        onSelect={props.onSelect}
        onClose={props.onClose}
        folder={Folders.FaceType}
        loadButton={{name:translate("Select")}}
    />
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
    listItem: {
        flexDirection: "row",
        paddingLeft: "10%",
        paddingRight: "10%",
        flex: 1,
    },
    listHost: {
        padding: 20,
        width: "100%",
    },
    pickerImage: {
        width: 45,
        height: 45,
    },
    titleHost: {
        flexDirection: "row",
        alignItems: "center"
    }
});