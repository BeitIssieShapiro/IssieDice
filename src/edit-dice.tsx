import { Button, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { translate } from "./lang";
import { Spacer } from "./components";
import Icon from 'react-native-vector-icons/AntDesign';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FaceType, FaceTypePicker } from "./profile-picker";
import { copyFileToFolder, SelectFromGallery } from "./image-select";
import { loadFaceImages, } from "./profile";
import { captureRef } from "react-native-view-shot";

const blankImg = require("../assets/blank.png");
interface EditDiceProps {
    name: string;
    onClose: () => void;
}

export function EditDice({ onClose, }: EditDiceProps) {
    const [addFace, setAddFace] = useState<number>(-1);
    const [faces, setFaces] = useState<string[]>(["", "", "", "", "", ""]);
    const [dicePreview, setDicePreview] = useState<boolean>(false);
    const diceLayoutRef = useRef<any>(null);
    const name = "temp"

    useEffect(() => {
        if (name.length > 0) {
            //fetch the existing faces
            loadFaceImages(name).then((images) => setFaces(images));
        }
    }, [name])

    async function handleAddFace(index: number, type: FaceType) {
        if (type == FaceType.Image) {
            const filePath = await SelectFromGallery(`custom-dice/${"temp"}`, `face_${index}.jpg`);
            setFaces(curr => {
                curr[index] = filePath;
                return [...curr];
            })
        }
    }

    async function handleSave(name: string) {
        const filePath = await diceLayoutRef.current?.toImage().catch((e:any)=>console.log("fail capture", e));
        console.log("save", filePath)
        await copyFileToFolder(filePath, `custom-dice/${name}`, "dice.jpg");
    }

    console.log("faces", faces)

    return <View style={styles.container}>
        <View style={styles.settingTitle}>
            <Spacer w={35} />
            <Text allowFontScaling={false} style={styles.settingTitleText}>{translate(name.length > 0 ? "EditDice" : "CreateDice")}</Text>
            <Icon name={"close"} color={"black"} size={35} onPress={onClose} />
        </View>

        <FaceTypePicker
            open={addFace >= 0}
            onClose={() => setAddFace(-1)}
            onSelect={(type) => {
                handleAddFace(addFace, type as FaceType);
                setAddFace(-1);
            }}
        />

        <View style={styles.addFacesHost}>

            {[0, 1, 2, 3, 4, 5].map(index => {
                return <TouchableOpacity key={index} style={styles.addFace}
                    onPress={() => setAddFace(index)}>
                    {faces[index]?.length > 0 ?
                        <Image source={{ uri: faces[index] }} style={{ width: 75, height: 75 }} /> :
                        <Icon name="plus" size={35} />
                    }
                </TouchableOpacity>
            })}
        </View>
        <View style={{ flexDirection: "row" }}>
            <DicePreview faces={faces} size={150} />
            <DiceLayout faces={faces} size={200} ref={diceLayoutRef}/>
        </View>
        <Button title={translate("Save")} onPress={() => handleSave(name)} />
    </View>
}

interface DicePreviewProps {
    faces: string[];
    size: number;

}
export function DicePreview({ faces, size }: DicePreviewProps) {

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


function DiceLayoutImpl({ faces, size }: DicePreviewProps, ref: any) {
    const viewShotRef = useRef(null);
    const usedFaces = faces.filter(f => f.length > 0).map(f => ({ uri: f }));
    if (usedFaces.length < 6) {
        for (let i = 0; i < 6; i++) {
            usedFaces.push(blankImg)
        }
    }

    useImperativeHandle(ref, () => ({
        toImage: () => {
            return captureRef(viewShotRef, { format: "jpg", quality: 1 });
        }
    }));

    const faceSize = size / 4;
    const faceSizeStyle = { width: faceSize, height: faceSize }
    console.log("usedFaces", usedFaces)
    return (
        <View style={[styles.previewContainer, { width: size * 3 / 4, height: size }]} collapsable={false} ref={viewShotRef}>
            {/* Right Face */}
            <Image
                source={usedFaces[0]}
                style={[styles.previewFace, , faceSizeStyle, { left: faceSize, top: 0 }]}
            />
            {/* Right Bottom */}
            <Image
                source={usedFaces[1]}
                style={[styles.previewFace, , faceSizeStyle, { left: 0, top: faceSize }]}
            />
            {/* Back Face */}
            <Image
                source={usedFaces[2]}
                style={[styles.previewFace, , faceSizeStyle, { left: faceSize, top: faceSize }]}
            />
            {/* Back Top */}
            <Image
                source={usedFaces[3]}
                style={[styles.previewFace, , faceSizeStyle, { left: 2 * faceSize, top: faceSize }]}
            />
            {/* Back Left */}
            <Image
                source={usedFaces[4]}
                style={[styles.previewFace, , faceSizeStyle, { left: faceSize, top: 2 * faceSize }]}
            />
            {/* Back Front */}
            <Image
                source={usedFaces[5]}
                style={[styles.previewFace, , faceSizeStyle, { left: faceSize, top: 3 * faceSize }]}
            />
        </View>
    );

}

export const DiceLayout = forwardRef(DiceLayoutImpl);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "absolute",
        top: 0, left: 0,
        width: "100%", height: "100%",
        backgroundColor: "gray",
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
    }
})