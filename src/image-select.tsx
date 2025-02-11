import { useEffect, useRef, useState } from "react"
import ImageLibrary from "./image-library"
import { isRTL, translate } from "./lang";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, Modal, View } from "react-native";
import { TextInput } from "react-native";
import Icon from 'react-native-vector-icons/AntDesign';
import { launchImageLibrary } from "react-native-image-picker";
import RNFS from 'react-native-fs';

export function doNothing(){}

export async function SelectFromGallery(targetFolder: string, fileName: string): Promise<string> {
    const options: any = {
        mediaType: 'photo',
        selectionLimit: 1,
    };
    return new Promise((resolve, reject) => {
        launchImageLibrary(options, async (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
                resolve("");
            } else if (response.errorCode) {
                console.log('Image Picker Error: ', response.errorCode);
            } else if (response.assets) {
                const selectedImageUri = response.assets[0].uri;

                // Copy the image to the app's document folder
                if (selectedImageUri) {
                    try {
                        resolve(copyFileToFolder(selectedImageUri, targetFolder, fileName));
                    } catch (error) {
                        reject(error)
                    }
                }
                return resolve("");
            }
        });
    });

}

export const copyFileToFolder = async (sourcePath: string, targetPath: string, fileName: string, overwrite = true) => {


    const p = `${RNFS.DocumentDirectoryPath}/${targetPath}`;
    await RNFS.mkdir(p);
    const destinationPath = `${p}/${fileName}`;

    if (overwrite) {
        await RNFS.unlink(destinationPath).catch(doNothing);
    }
    // Copy the file from the sourcePath to the destinationPath
    await RNFS.copyFile(sourcePath, destinationPath);

    return destinationPath;
};

export const deleteFile = async (filePath: string) => {
    if (filePath.length == 0 || filePath.startsWith("http")) return;
    try {
        // Check if the file exists before attempting to delete it
        const fileExists = await RNFS.exists(filePath);

        if (fileExists) {
            await RNFS.unlink(filePath); // Delete the file
            console.log(`File deleted: ${filePath}`);
        } else {
            console.log('File does not exist');
        }
    } catch (e: any) {
        console.log("error deleting file", filePath, e.message);
    }
}

export function SearchImage({ onSelectImage, open, height, onClose, isScreenNarrow }: any) {
    const [value, setValue] = useState("")
    const [results, setResults] = useState<any>();

    const textRef = useRef<TextInput>(null);

    const doSearch = () => {
        if (textRef.current) {
            textRef.current.blur();
        }
        ImageLibrary.get().search(value).then((res: any) => {
            setResults(res)
        });
    }
    if (!open) {
        return null;
    }

    return <Modal transparent={true} animationType="slide" presentationStyle="overFullScreen"
        supportedOrientations={['portrait', 'portrait-upside-down', 'landscape']}>
        <View style={{ position: "absolute", backgroundColor: "grey", opacity: 0.1, width: "100%", height: "100%" }} />
        <View style={[styles.pickerView, { margin: isScreenNarrow ? 10 : 80 }]}>
            <View style={styles.closeButton}>
                <Icon name="close" size={45} onPress={onClose} />
            </View>
            <Text style={styles.pickerTitle}>{translate("SearchImageTitle")}</Text>
            <View style={styles.searchRoot}>
                <View style={[styles.searchTextAndBtnContainer, { direction: isRTL() ? "rtl" : "ltr" }]}>
                    <View style={{ flex: 1, position: "relative" }}>
                        <TextInput
                            ref={textRef}
                            style={[styles.searchInput, { textAlign: isRTL() ? "right" : "left" }]}
                            placeholder={translate("EnterSearchHere")}
                            value={value}
                            onChangeText={setValue}
                            onSubmitEditing={doSearch}
                        />
                        {value?.length > 0 && (
                            <TouchableOpacity style={styles.cleanSearchX} onPress={() => setValue('')}>
                                <Text style={styles.cleanXText}>x</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.searchImageBtn}
                        onPress={doSearch}
                    >
                        <Text style={styles.searchBtnText}>{translate("BtnSearch")}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    <View style={styles.resultContainer}>
                        {results && (results.length > 0 ? results.map((item: any, i: number) => (
                            <TouchableOpacity key={i} onPress={() => onSelectImage(item.url)}>
                                <Image source={{ uri: item.url }} style={styles.foundItem} />
                            </TouchableOpacity>
                        )) : (
                            <Text style={styles.noResultMsg}>{translate("NoResultsMsg")}</Text>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </View>
    </Modal>

}



const styles = StyleSheet.create({
    closeButton: {
        position: "absolute",
        right: 10,
        top: 30,
        zIndex: 100
    },
    pickerTitle: {
        margin: 25,
        fontSize: 25,

    },

    pickerView: {
        flexDirection: 'column',
        backgroundColor: 'white',
        zIndex: 999,
        // width:"100%",
        // height:"100%",
        flex: 1,
        borderColor: 'gray',
        //borderBottomColor: "transparent",
        //borderWidth: 1,
        borderRadius: 20,
        //paddingTop: 2,
        alignItems: 'center',
        overflow: "hidden"
    },

    searchRoot: {
        alignItems: 'center',
        width: '100%',
    },
    searchTextAndBtnContainer: {
        position: "relative",
        flexDirection: 'row',
        marginTop: 30,
        width: '80%',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#E2E2E2',
        borderRadius: 15,
        paddingHorizontal: 20,
        fontSize: 18,
        height: 35,
        color: '#1A1A1A',
    },
    cleanSearchX: {
        right: 3,
        position: 'absolute',
        top: 0,
    },
    cleanXText: {
        fontSize: 25,
        color: 'gray',
    },
    searchImageBtn: {
        backgroundColor: '#5c7e9d',
        borderRadius: 18,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginLeft: 10,
    },
    searchBtnText: {
        color: 'white',
        fontSize: 20,
    },
    resultContainer: {
        flexDirection: "row",
        flex: 1,
        flexWrap: "wrap",
        padding: 15,
        paddingTop: 30,
    },
    foundItem: {
        height: 70,
        width: 70,
        margin: 10,
    },
    noResultMsg: {
        fontSize: 35,
        marginTop: '10%',
        textAlign: 'center',
    },
});
