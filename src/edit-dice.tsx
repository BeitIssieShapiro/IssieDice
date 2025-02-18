import { Alert, Button, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { fTranslate, translate } from "./lang";
import { Spacer } from "./components";
import Icon from 'react-native-vector-icons/AntDesign';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FaceType, FaceTypePicker } from "./profile-picker";
import { copyFileToFolder, SelectFromGallery } from "./image-select";
import { existsFolder, Folders, getCustomTypePath, isValidFilename, loadFaceImages, renameDiceFolder, writeFile, } from "./profile";
import { captureRef } from "react-native-view-shot";
import prompt from "react-native-prompt-android";
import path from "path";
import { readFile, unlink } from "react-native-fs";
import { ensureAndroidCompatible } from "./utils";
import { EditImage } from "./edit-image";

const blankImg = require("../assets/blank.png");
interface EditDiceProps {
    name: string;
    onClose: () => void;
}

export const InvalidCharachters = "<, >, :, \", /, \, |, ?, *,"

const emptyFacesArray = ["", "", "", "", "", ""]
export function EditDice({ onClose, name }: EditDiceProps) {
    const [addFace, setAddFace] = useState<number>(-1);
    const [editedName, setEditedName] = useState<string>(name);
    const [lastSaveddName, setLastSavedName] = useState<string>(name);
    const [faces, setFaces] = useState<string[]>(emptyFacesArray);
    const [facesText, setFacesText] = useState<string[]>(emptyFacesArray);
    const diceLayoutRef = useRef<any>(null);
    const [editImage, setEditImage] = useState<{ uri: string, index: number } | undefined>();

    useEffect(() => {
        if (name.length > 0) {
            //fetch the existing faces
            const newFacesText = emptyFacesArray;
            loadFaceImages(name).then(async (faceFiles) => {
                for (let i = 0; i < faceFiles.length; i++) {
                    if (faceFiles[i].endsWith(".json")) {
                        // is a text
                        const textInfo = JSON.parse(await readFile(faceFiles[i]));
                        newFacesText[i] = textInfo.text;
                    }
                }

                setFaces(faceFiles);
                setFacesText(newFacesText);
            });
        }
    }, [])

    async function handleAddFace(index: number, type: FaceType, editedName: string) {
        if (type == FaceType.Image) {
            const filePath = await SelectFromGallery(`${Folders.CustomDice}/${editedName}`, `face_${index}$$${Math.floor(Math.random() * 1000000)}.jpg`, `face_${index}$$`);

            setEditImage({ uri: filePath, index });
            // console.log("added Face", filePath)
            // setFaces(curr => {
            //     curr[index] = filePath;
            //     return [...curr];
            // })
        } else if (type == FaceType.Text) {
            prompt(translate("SetFaceText"), undefined, [
                { text: translate("Cancel"), style: "cancel" },
                {
                    text: translate("OK"),
                    onPress: (faceText) => {
                        if (faceText && faceText.length > 0) {
                            // Save it as a json file
                            const faceData = {
                                text: faceText,
                            }
                            const basePath = getCustomTypePath(editedName);
                            const faceName = `face_${index}$$${Math.floor(Math.random() * 1000000)}.json`
                            const content = JSON.stringify(faceData, undefined, " ");
                            const faceFilePath = path.join(basePath, faceName);
                            writeFile(faceFilePath, content).then(() => {
                                setFaces(curr => {
                                    curr[index] = faceFilePath;
                                    return [...curr];
                                })
                                setFacesText(curr => {
                                    curr[index] = faceText;
                                    return [...curr];
                                })
                            });
                        }
                    }
                },
            ], { type: 'plain-text', defaultValue: facesText[index] });
        }
    }

    const handleEditName = (editedName: string) => {
        prompt(translate("SetDiceName"), undefined, [
            { text: translate("Cancel"), style: "cancel" },
            {
                text: translate("OK"),
                onPress: (newName) => {
                    console.log("OK pressed", newName)
                    if (newName) {
                        if (!isValidFilename(newName)) {
                            Alert.alert(fTranslate("InvalidName", InvalidCharachters));
                            return;
                        }
                        setEditedName(newName);
                    }
                }
            },
        ], { type: 'plain-text', defaultValue: editedName });
    }

    async function handleSave(editedName: string, lastSavedName: string) {
        // todo delete old unused faces
        if (editedName.length == 0) {
            Alert.alert(translate("DiceMissingName"), "", [{ text: translate("OK") }]);
            return;
        }

        if (editedName != lastSavedName) {


            if (!isValidFilename(editedName)) {
                Alert.alert(translate("InvalideDiceName"), "", [{ text: translate("OK") }]);
                return;
            }

            if (await existsFolder(getCustomTypePath(editedName))) {
                Alert.alert(translate("AlreadyExistsDice"), "", [{ text: translate("OK") }]);
                return;
                //todo - allow overwrite
            }
            if (lastSavedName.length > 0) {
                await renameDiceFolder(lastSavedName, editedName);
                setLastSavedName(editedName);
            }
            // else this is a new Dice, folder will be created
        }

        const filePath = await diceLayoutRef.current?.toImage().catch((e: any) => console.log("fail capture", e));
        console.log("save", filePath)
        await copyFileToFolder(filePath, `${Folders.CustomDice}/${editedName}`, "dice.jpg");
    }

    console.log("faces", faces)

    if (editImage) {
        return <EditImage uri={editImage.uri} onClose={() => setEditImage(undefined)} onDone={(url) => {
            setFaces(curr => {
                curr[editImage.index] = url;
                return [...curr];
            })
            setEditImage(undefined);
        }} />
    }


    return <View style={styles.container}>
        <View style={styles.settingTitle}>
            <Spacer w={35} />
            <Text allowFontScaling={false} style={styles.settingTitleText}>{translate(name.length > 0 ? "EditDice" : "CreateDice")}</Text>
            <Icon name={"close"} color={"black"} size={35} onPress={onClose} />
        </View>

        <View style={[styles.section]} >
            <Text style={styles.sectionName}>{translate("DiceName")}:</Text>
            <Text style={styles.sectionValue}>{editedName}</Text>
            <Icon name="edit" size={35} onPress={() => handleEditName(editedName)} />

        </View>

        <FaceTypePicker
            open={addFace >= 0}
            onClose={() => setAddFace(-1)}
            onSelect={(type) => {
                handleAddFace(addFace, type as FaceType, editedName);
                setAddFace(-1);
            }}
        />

        <View style={styles.addFacesHost}>

            {[0, 1, 2, 3, 4, 5].map(index => {
                return <TouchableOpacity key={index} style={styles.addFace}
                    onPress={() => {
                        if (editedName.length == 0) {
                            Alert.alert(translate("MustHaveDiceNameBeforeAddFace"))
                            return;
                        }
                        setAddFace(index)
                    }}>
                    {faces[index]?.length > 0 && !faces[index].endsWith(".json") ?
                        <Image source={{ uri: faces[index] }} style={{ width: 75, height: 75 }} /> :
                        (facesText[index].length > 0 ?
                            <TextFace style={[]} text={facesText[index]} size={75} /> :
                            <Icon name="plus" size={35} />)
                    }
                </TouchableOpacity>
            })}
        </View>
        <View style={{ flexDirection: "row" }}>
            <DicePreview faces={faces} size={150} facesText={facesText} />
            <DiceLayout faces={faces} facesText={facesText} size={200} ref={diceLayoutRef} />
        </View>
        <Button title={translate("Save")} onPress={() => handleSave(editedName, lastSaveddName)} />
    </View>
}

interface DicePreviewProps {
    faces: string[];
    facesText: string[]
    size: number;

}
export function DicePreview({ faces, size, facesText }: DicePreviewProps) {

    const usedFaces = faces.filter(f => f.length > 0);
    if (usedFaces.length < 3) {
        for (let i = 0; i < 3 - usedFaces.length; i++) {
            usedFaces.push(blankImg)
        }
    }

    const faceSize = { width: size / 2, height: size / 2, left: size / 2, top: size / 2 }

    return (
        <View style={[styles.previewContainer, { width: size, height: size }]}>
            {/* Top Face */}
            <Image
                source={{ uri: usedFaces[0] }}
                style={[styles.previewFace, styles.previewFaceTop, faceSize, { bottom: size * 2 / 3 }]}
            />
            {/* Right Face */}
            <Image
                source={{ uri: usedFaces[1] }}
                style={[styles.previewFace, styles.previewFaceRight, faceSize, { bottom: size / 3 }]}
            />
            {/* Left Face */}
            <Image
                source={{ uri: usedFaces[2] }}
                style={[styles.previewFace, styles.previewFaceLeft, faceSize]}
            />
        </View>
    );

}


function DiceLayoutImpl({ faces, size, facesText }: DicePreviewProps, ref: any) {
    const viewShotRef = useRef(null);
    const usedFaces = faces.map(f => ({ uri: f }));
    if (usedFaces.length < 6) {
        for (let i = 0; i < 6; i++) {
            usedFaces.push(blankImg)
        }
    }

    const usedFacesText = facesText;
    if (usedFacesText.length < 6) {
        for (let i = 0; i < 6; i++) {
            usedFacesText.push("")
        }
    }

    useImperativeHandle(ref, () => ({
        toImage: () => {
            return captureRef(viewShotRef, { format: "jpg", quality: 1, width: 3 * faceSize, height: 4 * faceSize });
        }
    }));

    const faceSize = size / 4;
    const faceSizeStyle = { width: faceSize, height: faceSize }
    console.log("usedFaces", usedFaces)
    const facesStyles = [
        [styles.previewFace, , faceSizeStyle, { left: faceSize + faceSize / 2, top: 0 }], // Right
        [styles.previewFace, , faceSizeStyle, { left: faceSize / 2, top: faceSize }], // Bottom
        [styles.previewFace, , faceSizeStyle, { left: faceSize + faceSize / 2, top: faceSize }], // Back
        [styles.previewFace, , faceSizeStyle, { left: 2 * faceSize + faceSize / 2, top: faceSize }], // Top
        [styles.previewFace, , faceSizeStyle, { left: faceSize + faceSize / 2, top: 2 * faceSize }], // Left
        [styles.previewFace, , faceSizeStyle, { left: faceSize + faceSize / 2, top: 3 * faceSize }], // Front
    ]


    return (
        <View style={[styles.previewContainer, { width: 4 * faceSize, height: 4 * faceSize }]} collapsable={false} ref={viewShotRef}>
            {
                [0, 1, 2, 3, 4, 5].map(i => (
                    usedFaces[i] && usedFaces[i].uri && usedFaces[i].uri.length > 0 && !usedFaces[i].uri.endsWith(".json") ?
                        <Image key={i} source={usedFaces[i]} style={facesStyles[i]} /> :
                        usedFacesText[i] && usedFacesText[i].length > 0 &&
                        <TextFace key={i} style={facesStyles[i]} text={usedFacesText[i]} size={faceSize} />

                ))
            }
        </View>
    );

}

function TextFace({ text, style, size }: { text: string, style: any, size: number }) {
    return <View style={[...style, styles.textFaceContainer, { width: size, height: size }]}>
        <Text style={styles.textFace}>{text}</Text>
    </View>
}


export const DiceLayout = forwardRef(DiceLayoutImpl);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "absolute",
        top: 0, left: 0,
        width: "100%", height: "100%",
        backgroundColor: "lightgray",
        zIndex: 1100
    },
    settingTitle: {
        backgroundColor: "white",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 80,
        fontSize: 25,
        borderRadius: 5,
        margin: 10
    },
    section: {
        flexDirection: "row",
        backgroundColor: "white",
        height: 60,
        padding: 8,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 45,
        marginTop: 10,
        marginHorizontal: 40
    },
    sectionName: {
        fontSize: 25,
        fontWeight: "bold",
    },
    sectionValue: {
        fontSize: 25,
    },
    settingTitleText: {
        fontSize: 35,
    },
    addFacesHost: {
        flexDirection: "row",
        flexWrap: "wrap",

    },
    addFace: {
        margin: 20,
        width: 80,
        height: 80,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 5,
        borderColor: "black",
        borderWidth: 2,
        borderStyle: "solid",
    },
    previewContainer: {
        backgroundColor: 'transparent',
    },
    previewFace: {
        position: 'absolute',
        transformOrigin: "0.0",
    },
    previewFaceLeft: {
        transform: [
            { rotate: "90deg" },
            { skewX: "-30deg" },
            { scaleY: 0.864 }
        ]
    },
    previewFaceRight: {
        transform: [
            { rotate: "-30deg" },
            { skewX: "-30deg" },
            { scaleY: 0.864 }
        ],
    },
    previewFaceTop: {
        transform: [
            { rotate: "210deg" },
            { skewX: "-30deg" },
            { scaleY: 0.864 }
        ],
    },
    textFaceContainer: {
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center"
    },
    textFace: {
        fontSize: 25,
        textAlign: "center",
        flexWrap: "wrap",
    }

})