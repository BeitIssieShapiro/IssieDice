import { Fragment, useEffect, useState } from "react";
import { Folders, List, ListElements, Templates } from "./profile";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { isRTL, translate } from "./lang";
import Icon from 'react-native-vector-icons/AntDesign';
import { FadeInView, IconButton } from "./components";


function Seperator({width}:{width:string}) {
    return <View
        style={{
            width,
            marginTop: 4,
            borderBottomColor: 'gray',
            borderBottomWidth: 1,
        }}
    />
}

interface ProfilePickerProps {
    open: boolean;
    height: number | string;
    onClose: () => void;
    onSelect: (item: string) => void;
    exclude?: string | Templates;
    folder: Folders
    onDelete?: (name: string, afterDelete: () => void) => void;
    onEdit?: (name: string, afterSave: () => void) => void;
}

export function ProfilePicker({ open, height, onClose, onSelect, exclude, folder, onDelete, onEdit }: ProfilePickerProps) {
    const [list, setList] = useState<List[]>([]);
    const [revision, setRevision] = useState<number>(0);

    useEffect(() => {
        if (open) {
            ListElements(folder).then(list => {
                setList(list.filter(l => !exclude || l.key != exclude));
            })
        }
    }, [open, exclude, revision]);


    return <FadeInView height={open ? height : 0}
        style={[styles.pickerView, { bottom: 0, left: 0, right: 0 }]}>
        <Text allowFontScaling={false} style={{ fontSize: 28, margin: 25 }}>{
            folder == Folders.Profiles ?
                translate("SelectProfileTitle") : translate("SelectButtonTitle")
        }</Text>
        <Seperator width="90%"/>
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
                            width: "90%",
                            justifyContent: "space-between",
                        }}>
                            <View style={styles.listItem} key={item.key} >
                                <Text
                                    allowFontScaling={false}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{
                                        textAlign: (isRTL() ? "right" : "left"),
                                        fontSize: 28, paddingLeft: 15, paddingRight: 15
                                    }}>{item.name}</Text>
                            </View>
                            <View style={{ flexDirection: "row" }}>
                                <IconButton icon="upload" onPress={() => onSelect(item.key)} text={translate("Load")} />
                                {onDelete && <IconButton icon="delete" onPress={() => onDelete(item.key, () => setRevision(prev => prev + 1))} text={translate("Delete")} />}
                                {onEdit && <IconButton icon="edit" text={translate("Rename")} onPress={() => onEdit(item.key, () => setRevision(prev => prev + 1))} />}
                            </View>
                        </View>
                        <Seperator  width="100%"/>
                    </Fragment>

                ))}
            </ScrollView>
        }
    </FadeInView>
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
        paddingLeft: "10%",
        paddingRight: "10%",
        flex: 1,
    },
    listHost: {
        padding: 20,
        width: "100%",
    }
});