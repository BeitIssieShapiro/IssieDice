import { useRef, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import ImageLibrary from "./image-library";
import { isRTL, translate } from "./lang";
import Icon from "react-native-vector-icons/Ionicons";
import { downloadFile } from "react-native-fs";

interface SearchImageProps {
    onSelectImage: (filePath: string) => void
    onClose: () => void;
    width: number;
    targetFile: string;
}


export function SearchImage({ onSelectImage, onClose, width, targetFile }: SearchImageProps) {
    const [value, setValue] = useState<string>("")
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

    return (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
            <View style={[styles.container, { width: "95%" , overflow:"hidden"}]}>
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
                                <TouchableOpacity key={i} onPress={() => {
                                    downloadImage(item.url, targetFile).then(filePath =>
                                        onSelectImage(filePath));
                                }}><Image source={{ uri: item.url }} style={styles.foundItem} />
                                </TouchableOpacity>
                            )) : (
                                <Text style={styles.noResultMsg}>{translate("NoResultsMsg")}</Text>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </View>)
}

export async function downloadImage(url: string, targetPath: string): Promise<string> {
    try {

        // Download the image file.
        const downloadResult = await downloadFile({
            fromUrl: url,
            toFile: targetPath,
        }).promise;

        if (downloadResult.statusCode === 200) {
            return targetPath;
        } else {
            throw new Error(`Download failed with status code ${downloadResult.statusCode}`);
        }
    } catch (error) {
        console.error("Error downloading image:", error);
        throw error;
    }
}

const styles = StyleSheet.create({
    overlay: {
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1200,
        shadowColor: '#171717',
        shadowOffset: { width: 3, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 7,
    },

    container: {
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: "white",
        height: "100%",
    },
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
