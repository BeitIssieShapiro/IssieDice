import { ActivityIndicator, Alert, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { translate } from "./lang";
import { Spacer } from "./components";
import Icon from 'react-native-vector-icons/AntDesign';
import IconIonic from 'react-native-vector-icons/Ionicons';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FaceType } from "./profile-picker";
import { copyFileToFolder, SelectFromGallery } from "./image-select";
import { existsFolder, FaceInfo, Folders, getCustomTypePath, isValidFilename, loadFaceImages, renameDiceFolder, writeFile, } from "./profile";
import { captureRef } from "react-native-view-shot";
import path from "path";
import { unlink } from "react-native-fs";
import { EditImage } from "./edit-image";
import { CameraOverlay } from "./CameraOverlay";
import { EditText, FaceText } from "./edit-text";
import { Menu, MenuItem } from "react-native-material-menu";
import { SearchImage } from "./search-image";

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
    backgroundColor: "#E7E7E7",
    color: "black"

}
const emptyFacesArray = ["", "", "", "", "", ""]
const emptyFacesText = [emptyFaceText, emptyFaceText, emptyFaceText, emptyFaceText, emptyFaceText, emptyFaceText,]
export function EditDice({ onClose, name, width }: EditDiceProps) {
    const [editedName, setEditedName] = useState<string>(name);
    const [openNameEditor, setOpenNameEditor] = useState<boolean>(false);
    const [editedFaceText, setEditedFaceText] = useState<number>(-1);
    const [faces, setFaces] = useState<string[]>(emptyFacesArray);
    const [savedFaces, setSavedFaces] = useState<string[]>(emptyFacesArray);
    const [facesText, setFacesText] = useState<FaceText[]>(emptyFacesText);
    const diceLayoutRef = useRef<any>(null);
    const [editImage, setEditImage] = useState<{ uri: string, index: number } | undefined>();
    const [openCamera, setOpenCamera] = useState<number>(-1);
    const [openSearch, setOpenSearch] = useState<number>(-1);
    const [showAddTypesMenu, setShowAddTypesMenu] = useState<number>(-1);
    const [busy, setBusy] = useState<boolean>(false);

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
        console.log("handleAddFace", index)
        if (type == FaceType.Image) {
            const filePath = await SelectFromGallery(`${Folders.CustomDice}/${editedName}`, `face_${index}$$${Math.floor(Math.random() * 1000000)}.jpg`, `face_${index}$$`);
            if (filePath.length > 0) {
                setEditImage({ uri: filePath, index });
            }
        } else if (type == FaceType.Camera) {
            setOpenCamera(index);
        } else if (type == FaceType.Text) {
            setEditedFaceText(index);
        } else if (type == FaceType.Search) {
            setOpenSearch(index);
        }
        setShowAddTypesMenu(-1);
    }

    function handleFaceTextChange(index: number, faceText: FaceText) {
        if (faceText.text.length > 0) {
            // Save it as a json file
            const basePath = getCustomTypePath(editedName);
            const faceName = `face_${index}$$${Math.floor(Math.random() * 1000000)}.json`
            const content = JSON.stringify(faceText, undefined, " ");
            const faceFilePath = path.join(basePath, faceName);
            writeFile(faceFilePath, content, basePath).then(() => {
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


    const handleEditName = async (newName: string, editedName: string): Promise<boolean> => {
        if (!newName || newName.length == 0) {
            Alert.alert(translate("DiceMissingName"), "", [{ text: translate("OK") }]);
            return false;
        }

        if (newName != editedName) {
            if (!isValidFilename(newName)) {
                Alert.alert(translate("InvalideDiceName"), "", [{ text: translate("OK") }]);
                return false;
            }

            if (await existsFolder(getCustomTypePath(newName))) {
                Alert.alert(translate("AlreadyExistsDice"), "", [{ text: translate("OK") }]);
                return false;
                //todo - allow overwrite
            }
            setOpenNameEditor(false);
            if (editedName.length > 0) {
                setBusy(true);
                await renameDiceFolder(editedName, newName)
                    .finally(() => setBusy(false));
            }
        }
        setOpenNameEditor(false);
        setEditedName(newName);
        return true;
    }


    useEffect(() => {
        let facesTouched = false;
        setBusy(true);
        try {
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
        } finally {
            setBusy(false);
        }
    }, [faces, savedFaces]);

    function hideMenu() {
        setShowAddTypesMenu(-1)
    }

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
            <Icon disabled={busy} name={"close"} color={"black"} size={35} onPress={onClose} />
        </View>

        {busy && <ActivityIndicator />}

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
            initialFontName={facesText[editedFaceText].fontName}
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
                handleEditName(newName.text, editedName)
            }}
            textWidth={300}
            textHeight={80}

        />}

        {openSearch >= 0 && <SearchImage onSelectImage={(uri) => {
            setFaces(curr => {
                curr[openSearch] = uri;
                return [...curr];
            })
            setOpenSearch(-1);
        }} onClose={() => setOpenSearch(-1)} width={width}
            targetFile={path.join(getCustomTypePath(editedName), `face_${openSearch}$$${Math.floor(Math.random() * 1000000)}.jpg`)}
        />}

        <View style={styles.addFacesHost}>

            {[0, 1, 2, 3, 4, 5].map(index => {
                return (
                    <Menu
                        style={{ margin: 60 }}
                        key={index}
                        visible={showAddTypesMenu == index}
                        onRequestClose={hideMenu}
                        anchor={<TouchableOpacity key={index} style={styles.addFace}
                            onPress={() => {
                                if (editedName.length == 0) {
                                    Alert.alert(translate("MustHaveDiceNameBeforeAddFace"))
                                    return;
                                }
                                setShowAddTypesMenu(index);
                            }}
                        >
                            {faces[index]?.length > 0 && !faces[index].endsWith(".json") ?
                                <Image source={{ uri: faces[index] }} style={{ width: 75, height: 75, backgroundColor: "#E7E7E7" }} /> :
                                (facesText[index].text.length > 0 ?
                                    <TextFace style={[]} faceText={facesText[index]} size={75} /> :
                                    <Icon name="plus" size={35} />)
                            }
                        </TouchableOpacity>} >
                        <FaceTypeMenuItem label={translate("FaceTypeText")} icon="text" onPress={() => handleAddFace(index, FaceType.Text, editedName)} />
                        <FaceTypeMenuItem label={translate("FaceTypeCamera")} icon="camera-outline" onPress={() => handleAddFace(index, FaceType.Camera, editedName)} />
                        <FaceTypeMenuItem label={translate("FaceTypeImage")} icon="image-outline" onPress={() => handleAddFace(index, FaceType.Image, editedName)} />
                        <FaceTypeMenuItem label={translate("FaceTypeSearch")} icon="search-outline" onPress={() => handleAddFace(index, FaceType.Search, editedName)} />

                    </Menu>)
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
    faces: FaceInfo[] | ImageSourcePropType;
    size: number;
}

export function DicePreview({ faces, size }: DicePreviewProps) {
    if (!faces) return null
    const faceSize = { width: size / 2, height: size / 2, left: size / 2, top: size / 2 }
    const facesStyles = [
        [styles.previewFace, styles.faceBorder, styles.previewFaceTop, faceSize, { bottom: size * 2 / 3 }], // Top
        [styles.previewFace, styles.faceBorder, styles.previewFaceRight, faceSize, { bottom: size / 3 }], // Right
        [styles.previewFace, styles.faceBorder, styles.previewFaceLeft, faceSize], // Left
    ];

    const halfSize = size / 4;

    const presetDice = [
        { left: - 3 * halfSize },
        { left: - halfSize, top: -2 * halfSize },
        { left: - 3 * halfSize, top: -2 * halfSize },
    ]

    return (
        <View style={[styles.previewContainer, { width: size, height: size }]}>
            {[0, 1, 2].map(index => {
                if (!Array.isArray(faces)) {
                    return <View key={index} style={[{ overflow: 'hidden' }, facesStyles[index]]}>
                        <Image key={index} source={faces} style={[{
                            width: size * 2, height: size * 2,
                            position: "absolute",
                        }, presetDice[index]]} />
                    </View>
                }

                const face = faces[index] as FaceInfo;
                return face.uri.length > 0 && !face.uri.endsWith(".json") ?
                    <Image key={index} source={{ uri: face.uri }} style={facesStyles[index]} /> :
                    <TextFace key={index} faceText={face.text ?? emptyFaceText} style={facesStyles[index]} size={size / 2} />
            })}
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
                fontFamily: faceText.fontName ?? undefined
            }]}>{faceText.text}</Text>
        </View>
    </View >
}

function FaceTypeMenuItem({ label, icon, onPress }: { label: string, icon: string, onPress: () => void }) {
    return <MenuItem onPress={onPress}>
        <View style={styles.menuItem}  >
            <IconIonic name={icon} color="blue" size={22} />
            <Spacer w={10} />
            <Text style={{ fontSize: 22 }}>{label}</Text>
        </View>
    </MenuItem>
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
        backgroundColor: "#E7E7E7",
        borderRadius: 5,
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
        backgroundColor: "#E7E7E7",
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
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
    }

})