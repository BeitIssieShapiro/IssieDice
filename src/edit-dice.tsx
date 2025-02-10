import { Button, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { translate } from "./lang";
import { Spacer } from "./components";
import Icon from 'react-native-vector-icons/AntDesign';
import { useEffect, useState } from "react";
import { FaceType, FaceTypePicker } from "./profile-picker";
import { SelectFromGallery } from "./image-select";
import { getCustomTypePath, loadFaceImages, saveDataUrlAs } from "./profile";
import { generateCubePreview } from "./image-gen";

interface EditDiceProps {
    name: string;
    onClose: () => void;
}

export function EditDice({ onClose, }: EditDiceProps) {
    const [addFace, setAddFace] = useState<number>(-1);
    const [faces, setFaces] = useState<string[]>(["", "", "", "", "", ""]);
    const [dicePreview, setDicePreview] = useState<string>("");
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

    async function handleSave(name: string, faces: string[]) {
        const dataUrl = await generateCubePreview(faces, 300, require("../assets/blank.png")).catch((e)=>console.log(e));
        if (!dataUrl) return;
        const filePath = getCustomTypePath(name) + "/preview.jpg"
        await saveDataUrlAs(dataUrl, filePath);
        setDicePreview(filePath);
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
        <Image source={{ uri: getCustomTypePath(name) + "/preview.jpg" }} style={{ width: 150, height: 150 }} />
        <Button title={translate("Save")} onPress={() => handleSave(name, faces)} />
    </View>
}




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
    }
})