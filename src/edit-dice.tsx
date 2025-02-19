import { Alert, Button, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { fTranslate, translate } from "./lang";
import { Spacer } from "./components";
import Icon from 'react-native-vector-icons/AntDesign';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FaceType, FaceTypePicker } from "./profile-picker";
import { copyFileToFolder, SelectFromGallery } from "./image-select";
import { existsFolder, FaceInfo, Folders, getCustomTypePath, isValidFilename, loadFaceImages, renameDiceFolder, writeFile, } from "./profile";
import { captureRef } from "react-native-view-shot";
import prompt from "react-native-prompt-android";
import path from "path";
import { readFile, unlink } from "react-native-fs";
import { EditImage } from "./edit-image";
import { CameraOverlay } from "./CameraOverlay";
import { EditText, FaceText, TextStyle } from "./edit-text";

const blankImg = require("../assets/blank.png");
interface EditDiceProps {
    name: string;
    onClose: () => void;
    width: number
}

export const InvalidCharachters = "<, >, :, \", /, \, |, ?, *,"
const emptyFaceText: FaceText = {
    text: "",
    fontSize: 0,
    fontBold: false,
    backgroundColor: "white",
    color: "black"

}
const emptyFacesArray = ["", "", "", "", "", ""]
const emptyFacesText = [emptyFaceText, emptyFaceText, emptyFaceText, emptyFaceText, emptyFaceText, emptyFaceText,]
export function EditDice({ onClose, name, width }: EditDiceProps) {
    const [addFace, setAddFace] = useState<number>(-1);
    const [editedName, setEditedName] = useState<string>(name);
    const [openNameEditor, setOpenNameEditor] = useState<boolean>(false);
    const [editedFaceText, setEditedFaceText] = useState<number>(-1);
    const [faces, setFaces] = useState<string[]>(emptyFacesArray);
    const [savedFaces, setSavedFaces] = useState<string[]>(emptyFacesArray);
    const [facesText, setFacesText] = useState<FaceText[]>(emptyFacesText);
    const diceLayoutRef = useRef<any>(null);
    const [editImage, setEditImage] = useState<{ uri: string, index: number } | undefined>();
    const [openCamera, setOpenCamera] = useState<number>(-1);

    useEffect(() => {
        if (name.length > 0) {
            loadFaceImages(name).then(async (faceFiles) => {
                const fileList = faceFiles.map(f => f.uri);
                setFaces(fileList);
                setSavedFaces([...fileList])
                setFacesText(faceFiles.map(f => f.text || emptyFaceText));
            });
        }
    }, [])

    async function handleAddFace(index: number, type: FaceType, editedName: string) {
        if (type == FaceType.Image) {
            const filePath = await SelectFromGallery(`${Folders.CustomDice}/${editedName}`, `face_${index}$$${Math.floor(Math.random() * 1000000)}.jpg`, `face_${index}$$`);

            setEditImage({ uri: filePath, index });
        } else if (type == FaceType.Camera) {
            setOpenCamera(index);
        } else if (type == FaceType.Text) {
            setEditedFaceText(index);
        }
    }

    function handleFaceTextChange(index: number, faceText: FaceText) {
        if (faceText.text.length > 0) {
            // Save it as a json file

            const basePath = getCustomTypePath(editedName);
            const faceName = `face_${index}$$${Math.floor(Math.random() * 1000000)}.json`
            const content = JSON.stringify(faceText, undefined, " ");
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
        } else {
            setFaces(curr => {
                curr[index] = "";
                return [...curr];
            })
            setFacesText(curr => {
                curr[index] = emptyFaceText;
                return [...curr];
            })
        }
    }


    const handleEditName = async (newName: string, editedName: string) => {
        if (!newName || newName.length == 0) {
            Alert.alert(translate("DiceMissingName"), "", [{ text: translate("OK") }]);
            return;
        }

        if (newName != editedName) {
            if (!isValidFilename(newName)) {
                Alert.alert(translate("InvalideDiceName"), "", [{ text: translate("OK") }]);
                return;
            }

            if (await existsFolder(getCustomTypePath(newName))) {
                Alert.alert(translate("AlreadyExistsDice"), "", [{ text: translate("OK") }]);
                return;
                //todo - allow overwrite
            }
            if (editedName.length > 0) {
                await renameDiceFolder(editedName, newName);
            }
            // else this is a new Dice, folder will be created
        }
        setEditedName(newName);
    }


    useEffect(() => {
        let facesTouched = false;
        // Auto dave upon changes
        for (let i = 0; i < faces.length; i++) {
            if (faces[i] != savedFaces[i]) {
                if (savedFaces[i].length > 0) {
                    // remove previos face (async)
                    unlink(savedFaces[i]);
                }
                facesTouched = true;
            }
        }
        if (facesTouched) {
            setSavedFaces(faces);
            // save the dice.jpg after it renders
            requestAnimationFrame(() => {
                diceLayoutRef.current?.toImage().catch((e: any) => console.log("fail capture", e))
                    .then((filePath: string) => copyFileToFolder(filePath, `${Folders.CustomDice}/${editedName}`, "dice.jpg", true))
            });
        }
    }, [faces, savedFaces])

    if (editImage) {
        return <EditImage uri={editImage.uri} onClose={() => setEditImage(undefined)} onDone={(url) => {
            setFaces(curr => {
                curr[editImage.index] = url;
                return [...curr];
            })
            setEditImage(undefined);
        }} />
    }

    if (openCamera >= 0) {
        return <CameraOverlay onClose={() => setOpenCamera(-1)} onDone={(uri) => {
            setEditImage({ uri, index: openCamera });
            setOpenCamera(-1);
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
            <Icon name="edit" size={35} onPress={() => setOpenNameEditor(true)} />

        </View>

        {editedFaceText >= 0 && <EditText label={translate("FaceTextLabel")}
            initialText={facesText[editedFaceText].text}
            initialFontBold={facesText[editedFaceText].fontBold}
            initialFontSize={facesText[editedFaceText].fontSize}
            initialColor={facesText[editedFaceText].color}
            initialBGColor={facesText[editedFaceText].backgroundColor}

            onClose={() => setEditedFaceText(-1)}
            onDone={(faceText) => {
                handleFaceTextChange(editedFaceText, faceText);
                setEditedFaceText(-1);
            }} width={width}
            textWidth={70}
            textHeight={70}
        />}

        {openNameEditor && <EditText label={translate("EditNameTitle")}
            initialText={editedName}
            textOnly={true}
            width={400}
            onClose={() => setOpenNameEditor(false)}
            onDone={(newName) => {
                handleEditName(newName.text, editedName);
                setOpenNameEditor(false);
            }}
            textWidth={300}
            textHeight={80}

        />}


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
                        (facesText[index].text.length > 0 ?
                            <TextFace style={[]} faceText={facesText[index]} size={75} /> :
                            <Icon name="plus" size={35} />)
                    }
                </TouchableOpacity>
            })}
        </View>
        <View style={{ flexDirection: "row", width: "100%", justifyContent: "center" }}>
            <DicePreview faces={faces.map((f, i) => ({ uri: f, text: facesText[i] }))} size={150} />
            <DiceLayout faces={faces} facesText={facesText} size={200} ref={diceLayoutRef} />
        </View>
        {/* <Button title={translate("Save")} onPress={() => handleSave(editedName, lastSavedName)} /> */}
    </View>
}

interface DiceLayoutProps {
    faces: string[];
    facesText: FaceText[]
    size: number;

}
interface DicePreviewProps {
    faces: FaceInfo[];
    size: number;
}

export function DicePreview({ faces, size }: DicePreviewProps) {
    if (!faces || faces.length != 6) return null
    const faceSize = { width: size / 2, height: size / 2, left: size / 2, top: size / 2 }
    const facesStyles = [
        [styles.previewFace, styles.faceBorder, styles.previewFaceTop, faceSize, { bottom: size * 2 / 3 }], // Top
        [styles.previewFace, styles.faceBorder, styles.previewFaceRight, faceSize, { bottom: size / 3 }], // Right
        [styles.previewFace, styles.faceBorder, styles.previewFaceLeft, faceSize], // Left
    ];

    return (
        <View style={[styles.previewContainer, { width: size, height: size }]}>
            {[0, 1, 2].map(index => (
                faces[index].uri.length > 0 && !faces[index].uri.endsWith(".json") ?
                    <Image key={index} source={{ uri: faces[index].uri }} style={facesStyles[index]} /> :
                    <TextFace key={index} faceText={faces[index].text ?? emptyFaceText} style={facesStyles[index]} size={size / 2} />
            ))}
        </View>
    );

}


function DiceLayoutImpl({ faces, size, facesText }: DiceLayoutProps, ref: any) {
    const viewShotRef = useRef(null);
    const usedFaces = faces.map(f => ({ uri: f }));
    if (usedFaces.length < 6) {
        for (let i = 0; i < 6; i++) {
            usedFaces.push(blankImg)
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
        <View style={[styles.previewContainer, { width: 4 * faceSize, height: 4 * faceSize }, { position: "absolute", left: -1000 }]}
            collapsable={false} ref={viewShotRef}>
            {
                [0, 1, 2, 3, 4, 5].map(i => (
                    usedFaces[i] && usedFaces[i].uri && usedFaces[i].uri.length > 0 && !usedFaces[i].uri.endsWith(".json") ?
                        <Image key={i} source={usedFaces[i]} style={facesStyles[i]} /> :
                        faces[i] && facesText[i].text.length > 0 &&
                        <TextFace key={i} style={facesStyles[i]} faceText={facesText[i]} size={faceSize} />

                ))
            }
        </View>
    );

}

function TextFace({ faceText, style, size }: { faceText: FaceText, style: any, size: number }) {
    return <View style={[...style, styles.textFaceContainer, { minWidth: size, maxWidth: size, minHeight: size, maxHeight: size, backgroundColor: "transparent" }]}>
        <View style={[styles.textFaceTextContainer, { backgroundColor: faceText.backgroundColor, width: size, height: size }]}>
            <Text style={[styles.textFace, {
                color: faceText.color,
                fontWeight: faceText.fontBold ? "bold" : undefined,
                fontSize: faceText.fontSize,
            }]}>{faceText.text}</Text>
        </View>
    </View >
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
    faceBorder: {
        borderWidth: 1,
        borderColor: "gray",
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
    textFaceTextContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    textFace: {
        fontSize: 25,
        textAlign: "center",
        flexWrap: "wrap",
    }

})