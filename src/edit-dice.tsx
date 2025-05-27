import { ActivityIndicator, Alert, Image, ImageSourcePropType, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { fTranslate, isRTL, translate } from "./lang";
import { getInsetsLimit, MyIcon, ScreenSubTitle, ScreenTitle, Spacer } from "./components";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { existsFolder, getCustomTypePath, getNextDieName, isValidFilename, loadFaceImages, renameDiceFolder } from "./profile";
import { captureRef } from "react-native-view-shot";
import path from "path";
import { EditText } from "./edit-text";
import { EditFace, FaceText } from "./edit-face";
import * as RNFS from 'react-native-fs';
import { buildFullMatrix, normalizeImgSrc4Android, WinSize } from "./utils";
import { playAudio } from "./audio";
import { emptyFaceInfo, FaceInfo } from "./models";
import { copyFileToFolder, getCacheBusterSuffix, InvalidCharachters, unlinkFile, writeFileWithCacheBuster } from "./disk";
import { colors, gStyles } from "./common-style";

const faces = {
    top: {a:250,s:-30, sc: 0.864},
    left: {a:95,s:30, sc: 1.05},
    right: {a:10,s:-30, sc:0.864}
};

const faceTransform = (angle: any) => ({
    transform: [
        {
            matrix: buildFullMatrix(
                angle.a,
                angle.s,
                angle.sc,
            ),
        },
    ],
});

const faceTransTop = faceTransform(faces.top)
const faceTransLeft = faceTransform(faces.left)
const faceTransRight = faceTransform(faces.right)

// const skewXminus30 =  { matrix: makeSkewX3DMatrix(-30) };

// const uppFace = { transform: [{ rotate: "210deg" }, skewXminus30, { scaleY: 0.864 }] }
// const leftFace = { transform: [{ rotate: "90deg" }, skewXminus30, { scaleY: 0.864 }] }
// const rightFace = { transform: [{ rotate: "-30deg" }, skewXminus30, { scaleY: 0.864 }] }

interface EditDiceProps {
    name: string;
    onClose: () => void;
    onAfterSave: (name: string) => void;
    windowSize: WinSize
}



export const FacePreviewSize = 150;
export const FontFactor = FacePreviewSize / 70;
export const DefaultFaceBackgroundColor = "#E7E7E7";

const emptyFacesInfoArray = [emptyFaceInfo, emptyFaceInfo, emptyFaceInfo, emptyFaceInfo, emptyFaceInfo, emptyFaceInfo];

export function EditDice({ onClose, name, windowSize, onAfterSave }: EditDiceProps) {
    const [editedName, setEditedName] = useState<string>(name);
    const [openNameEditor, setOpenNameEditor] = useState<boolean>(false);
    const [editFace, setEditFace] = useState<number>(-1);
    const [facesInfo, setFacesInfo] = useState<FaceInfo[]>([...emptyFacesInfoArray]);
    const diceLayoutRef = useRef<any>(null);
    const [busy, setBusy] = useState<boolean>(false);

    const shouldcondense = windowSize.width < FacePreviewSize * 6 + styles.faceView.margin * 6 + 5;

    useEffect(() => {
        if (name.length > 0) {
            loadFaceImages(name).then(async (fInfo) => {
                setFacesInfo([...fInfo]);
            });
        } else {
            selectDieName();
            setFacesInfo([...emptyFacesInfoArray]);
        }
    }, [])

    async function selectDieName() {
        // chooses a name with the patter Cube 1/2/3 the first which is available
        const newCubeName = await getNextDieName("NewDieName");
        setEditedName(newCubeName);
    }

    async function handleFaceInfoChange(index: number, faceInfo: FaceInfo, currFacesInfo: FaceInfo[]) {
        let infoUri = currFacesInfo[index].infoUri;
        let text = currFacesInfo[index].text;
        let backgroundUri = currFacesInfo[index].backgroundUri;
        let backgroundColor = currFacesInfo[index].backgroundColor;
        let audioUri = currFacesInfo[index].audioUri;

        let changed = false;
        setBusy(true);

        const isTextChanged = (before: FaceText | undefined, after: FaceText | undefined) => {
            if (before && !after || after && !before) return true;
            if (!before && !after) return false;

            return before!.color != after!.color ||
                before!.fontBold != after!.fontBold ||
                before!.fontName != after!.fontName ||
                before!.fontSize != after!.fontSize ||
                before!.text != after!.text;
        }

        if (isTextChanged(text, faceInfo.text) || backgroundColor != faceInfo.backgroundColor) {
            changed = true;
            // text or background change
            if (infoUri) {
                await unlinkFile(infoUri);
                infoUri = undefined;
            }

            if (faceInfo.text || faceInfo.backgroundColor) {
                const basePath = getCustomTypePath(editedName);
                const faceName = `face_${index}${getCacheBusterSuffix()}.json`
                const content = JSON.stringify({ ...faceInfo.text, backgroundColor: faceInfo.backgroundColor }, undefined, " ");

                // save new json
                infoUri = path.join(basePath, faceName);
                await writeFileWithCacheBuster(infoUri, content);
                text = faceInfo.text;
            }

            backgroundColor = faceInfo.backgroundColor;
        }

        if (backgroundUri != faceInfo.backgroundUri) {
            changed = true;
            if (backgroundUri) {
                await unlinkFile(backgroundUri);
                backgroundUri = undefined;
            }
            if (faceInfo.backgroundUri) {
                // move image to cube's folder
                const basePath = getCustomTypePath(editedName);
                const faceName = `face_${index}${getCacheBusterSuffix()}.jpg`
                backgroundUri = path.join(basePath, faceName);

                await copyFileToFolder(faceInfo.backgroundUri, backgroundUri, true);
            }
        }
        if (audioUri != faceInfo.audioUri) {
            changed = true;
            if (audioUri) {
                await unlinkFile(audioUri);
                audioUri = undefined;
            }
            if (faceInfo.audioUri) {
                const basePath = getCustomTypePath(editedName);
                const faceName = `face_${index}${getCacheBusterSuffix()}.mp4`;
                audioUri = path.join(basePath, faceName);
                await copyFileToFolder(faceInfo.audioUri, audioUri, true);
            }
        }

        if (changed) {
            setFacesInfo(curr => {
                return curr.map((item, i) => i == index ?
                    { infoUri, backgroundUri, backgroundColor, text, audioUri } as FaceInfo
                    : item)
            })

            const textureFilePath = `${getCustomTypePath(editedName)}/texture${getCacheBusterSuffix()}.jpg`
            setTimeout(() => {
                console.log("capture the texture")
                diceLayoutRef.current?.toImage().catch((e: any) => console.log("fail capture", e))
                    .then((filePath: string) => {
                        copyFileToFolder(filePath, textureFilePath, true)
                        console.log("saved the texture");
                        onAfterSave(editedName);
                    })
                    .finally(() => setBusy(false))
            }, 1000);
            console.log("FacesInfo updated", facesInfo);
        } else {
            setBusy(false);
        }
    }

    const handleEditName = async (newName: string, editedName: string): Promise<boolean> => {
        if (!newName || newName.length == 0) {
            Alert.alert(translate("DiceMissingName"), "", [{ text: translate("OK") }]);
            return false;
        }

        if (newName != editedName) {
            if (!isValidFilename(newName)) {
                Alert.alert(fTranslate("InvalideDiceName", InvalidCharachters), "", [{ text: translate("OK") }]);
                return false;
            }

            if (await RNFS.exists(getCustomTypePath(newName))) {
                Alert.alert(translate("AlreadyExistsDice"), "", [{ text: translate("OK") }]);
                return false;
                //todo - allow overwrite
            }
            setOpenNameEditor(false);
            if (editedName.length > 0) {
                setBusy(true);
                await renameDiceFolder(editedName, newName)
                    .then(() => setEditedName(newName))
                    .finally(() => setBusy(false));
            }
        }
        setOpenNameEditor(false);
        return true;
    }
    console.log("facesInfo", facesInfo)

    const isLandscape = windowSize.height < windowSize.width;
    const faceSize = !isLandscape ?
        Math.min(windowSize.width / 4, FacePreviewSize, 0.15 * windowSize.height) :
        windowSize.width / 8;

    const renderFaceRow = (index: number) => (<View key={index} style={[styles.faceView, { width: faceSize, height: faceSize },
    shouldcondense && { margin: 3 }
    ]}>
        <FacePreview size={faceSize}
            backgroundColor={facesInfo[index].backgroundColor}
            faceText={facesInfo[index].text}
            backgroundImage={facesInfo[index].backgroundUri}
            audioUri={facesInfo[index].audioUri}
            onAudioPress={() => facesInfo[index].audioUri && playAudio(facesInfo[index].audioUri)}
        />

        <View style={styles.faceButtons}>
            <MyIcon info={{ name: "edit", size: 33 }} onPress={() => setEditFace(index)} />
        </View>
    </View>)

    return <View style={[gStyles.screenContainer]}>
        <ScreenTitle title={translate(name.length > 0 ? "EditDice" : "CreateDice")} onClose={onClose} icon={{ name: "check-bold", type: "MCI", size: 30, color: colors.titleBlue }} />
        <ScreenSubTitle
            elementTitle={translate("DiceName")} elementName={editedName}
            actionName={translate("EditDieName")}
            actionIcon={{ name: "edit", type: "AntDesign", color: colors.titleBlue, size: 30 }}
            onAction={() => setOpenNameEditor(true)}
        />


        {editFace >= 0 && <EditFace
            windowSize={windowSize}
            initialFaceText={facesInfo[editFace]?.text}
            initialBackgroundImage={facesInfo[editFace]?.backgroundUri}
            initialBackgroundColor={facesInfo[editFace]?.backgroundColor}
            intialAudioUri={facesInfo[editFace]?.audioUri}
            onClose={() => setEditFace(-1)}
            onDone={(faceInfo) => {
                console.log("onDone", editFace, faceInfo, facesInfo)
                handleFaceInfoChange(editFace, faceInfo, facesInfo);
                setEditFace(-1);
            }}
            width={windowSize.width}
            size={FacePreviewSize}
        />}

        {openNameEditor && <EditText label={translate("EditNameTitle")}
            initialText={editedName}
            textOnly={true}
            windowSize={windowSize}
            width={400}
            onClose={() => setOpenNameEditor(false)}
            onDone={(newName) => {
                handleEditName(newName.text, editedName)
            }}
            textWidth={300}
            textHeight={80}

        />}
        <DiceLayout facesInfo={facesInfo} size={FacePreviewSize * 4} ref={diceLayoutRef} />

        <View style={[styles.addFacesHost]}>
            <View style={{ flexDirection: "column", width: "100%" }}>
                {isLandscape ?
                    <View style={styles.faceRow}>
                        {[0, 1, 2, 3, 4, 5].map(index => renderFaceRow(index))}
                    </View>
                    :
                    <>
                        <View style={styles.faceRow}>
                            {[0, 1, 2].map(index => renderFaceRow(index))}
                        </View>
                        <View style={styles.faceRow}>
                            {[3, 4, 5].map(index => renderFaceRow(index))}
                        </View>
                    </>}
            </View>
        </View>

    </View >

}

interface DiceLayoutProps {
    facesInfo: FaceInfo[]
    size: number;

}
interface DicePreviewProps {
    facesInfo: FaceInfo[] | ImageSourcePropType;
    size: number;
}

export function DicePreview({ facesInfo, size }: DicePreviewProps) {
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
                if (!Array.isArray(facesInfo)) {
                    return <View key={index} style={[{ overflow: 'hidden' }, facesStyles[index]]}>
                        <Image key={index} source={facesInfo} style={[{
                            width: size * 2, height: size * 2,
                            position: "absolute",
                        }, presetDice[index]]} />
                    </View>
                }

                const face = facesInfo[index] as FaceInfo;

                return <FacePreview
                    key={index}
                    size={size / 2}
                    style={facesStyles[index]}
                    backgroundColor={face?.backgroundColor}
                    faceText={face?.text}
                    backgroundImage={face?.backgroundUri}
                    audioUri={face?.audioUri}
                />
            })}
        </View>
    );

}


function DiceLayoutImpl({ facesInfo, size }: DiceLayoutProps, ref: any) {
    const viewShotRef = useRef(null);

    useImperativeHandle(ref, () => ({
        toImage: () => {
            return captureRef(viewShotRef, { format: "jpg", quality: 1, width: 3 * faceSize, height: 4 * faceSize });
        }
    }));

    const faceSize = size / 4;
    const faceSizeStyle = { width: faceSize, height: faceSize }
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
            {[0, 1, 2, 3, 4, 5].map(i => (
                <FacePreview key={i} size={faceSize}
                    style={facesStyles[i]}
                    backgroundColor={facesInfo[i].backgroundColor}
                    faceText={facesInfo[i].text}
                    backgroundImage={facesInfo[i].backgroundUri}
                    audioUri={facesInfo[i].audioUri}
                />

            ))}
        </View>
    );
}

export function FacePreview({ faceText, backgroundColor, size, backgroundImage, audioUri, style, onAudioPress, onTextEdit }: {
    faceText?: FaceText,
    backgroundColor?: string, backgroundImage?: string, size: number, style?: any, audioUri?: string,
    onAudioPress?: () => void,
    onTextEdit?: (newText: string) => void
}) {
    const scale = size / FacePreviewSize;

    return <View style={[styles.textFaceContainer,
    {
        minWidth: size, maxWidth: size, minHeight: size, maxHeight: size,
        backgroundColor: "transparent",
        overflow: 'hidden'
    },
        style
    ]}>
        <Pressable
            onPress={(audioUri && onAudioPress) ? () => onAudioPress() : undefined}
            style={[styles.textFaceTextContainer,
            { backgroundColor: !backgroundColor || backgroundColor == "" ? DefaultFaceBackgroundColor : backgroundColor, width: FacePreviewSize, height: FacePreviewSize },
            scale != 1 ? {
                transform: [
                    { scaleX: scale },
                    { scaleY: scale }
                ]
            } : {}
            ]}>
            {backgroundImage && backgroundImage.length > 0 && <Image source={normalizeImgSrc4Android({ uri: backgroundImage })} style={{ position: "absolute", width: "100%", height: "100%" }} />}
            {faceText && (faceText.text && faceText.text.length > 0 || onTextEdit) &&
                onTextEdit ?
                <TextInput style={[styles.textFace, {
                    color: faceText.color,
                    fontWeight: faceText.fontBold ? "bold" : undefined,
                    fontSize: faceText.fontSize * FontFactor,
                    fontFamily: faceText.fontName ?? undefined
                }]}
                    autoFocus
                    multiline={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={faceText.text}
                    allowFontScaling={false}
                    onChangeText={(text => onTextEdit(text))}
                /> :

                faceText && <Text style={[styles.textFace, {
                    color: faceText.color,
                    fontWeight: faceText.fontBold ? "bold" : undefined,
                    fontSize: faceText.fontSize * FontFactor,
                    fontFamily: faceText.fontName ?? undefined
                },
                ]}>{faceText.text}
                </Text>
            }

            {audioUri && <View style={[styles.playButton]}>

                <MyIcon info={{ name: "sound", size: 25, type: "AntDesign", color: "black" }} />
            </View>}
        </Pressable>
    </View >
}

export const DiceLayout = forwardRef(DiceLayoutImpl);

const styles = StyleSheet.create({
    addFacesHost: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",

    },
    faceView: {
        backgroundColor: "#E7E7E7",
        margin: 20,
    },
    faceButtons: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
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
    faceRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        margin: 25
    },
    previewFace: {
        position: 'absolute',
        transformOrigin: "0.0",
        backgroundColor: "#E7E7E7",
        //borderRadius: 5,
    },
    faceBorder: {
        borderWidth: 2,
        borderStyle: "solid",
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
        width: "100%",
        position: "absolute",
        fontSize: 25,
        textAlign: "center",
        flexWrap: "wrap",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    playButton: {
        position: "absolute",
        right: -3,
        top: -3,
        margin: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "lightgray",
        justifyContent: "center",
        alignItems: "center"
    }

})