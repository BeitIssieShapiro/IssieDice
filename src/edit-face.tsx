import React, { useState } from "react";
import {

    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,

} from "react-native";
import { translate } from "./lang";
import { IconButton, NumberSelector, Spacer } from "./components";
import { MyColorPicker } from "./color-picker";
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import { BTN_COLOR } from "./settings";
import { Dropdown } from "react-native-element-dropdown";
import { DefaultFaceBackgroundColor, FacePreview } from "./edit-dice";
import { FaceInfo, getTempFileName } from "./profile";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SelectFromGallery } from "./image-select";
import { CameraOverlay } from "./CameraOverlay";
import { SearchImage } from "./search-image";

export interface FaceText {
    text: string;
    fontSize: number;
    fontName?: string;
    fontBold: boolean;
    color: string;
}

interface EditFaceProps {
    initialFaceText?: FaceText;
    initialBackgroundColor?: string;
    initialBackgroundImage?: string;

    onDone: (faceInfo: FaceInfo) => void;
    onClose: () => void;
    width: number;
    size: number;


}
interface ColorPickerProps {
    color: string;
    onSelect: (color: string) => void;
}
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 42];
const FONTS = [
    { label: "default", value: undefined },
    { label: "גברת לוין", value: "Gveret Levin AlefAlefAlef" }
];



export const EditFace: React.FC<EditFaceProps> = ({
    initialFaceText,
    initialBackgroundColor,
    initialBackgroundImage, onDone, onClose, width, size,
}) => {
    const [text, setText] = useState<string>(initialFaceText?.text || "");
    const [fontName, setFontName] = useState<string | undefined>(initialFaceText?.fontName || undefined);
    const [fontSize, setFoneSize] = useState(initialFaceText?.fontSize || 30);
    const [isBold, setIsBold] = useState(initialFaceText?.fontBold !== undefined ? initialFaceText.fontBold : false);
    const [color, setColor] = useState(initialFaceText?.color || "black");
    const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
    const [openColorPicker, setOpenColorPicker] = useState<ColorPickerProps | undefined>();
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>(initialBackgroundImage);
    const [openCamera, setOpenCamera] = useState<boolean>(false);
    const [openSearch, setOpenSearch] = useState<boolean>(false);


    if (openCamera) {
        return <CameraOverlay onClose={() => setOpenCamera(false)} onDone={(uri) => {
            setBackgroundImage(uri);
            setBackgroundColor(undefined)
            setOpenCamera(false);
        }} />
    }

    if (openSearch) {
        const filePath = getTempFileName("jpg");
        return <SearchImage
            onSelectImage={(uri) => {
                setBackgroundImage(uri);
                setBackgroundColor(undefined)
                setOpenSearch(false);
            }}
            onClose={() => setOpenSearch(false)} width={width}
            targetFile={filePath}
        />
    }

    return (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
            <View style={[styles.container, { width: width || "90%" }]}>

                <Text allowFontScaling={false} style={styles.title}>{translate("EditFace")}</Text>


                <FacePreview size={size}
                    backgroundColor={backgroundColor}
                    backgroundImage={backgroundImage}
                    faceText={{
                        fontBold: isBold,
                        fontSize,
                        text: text || "",
                        color,
                    }}
                />
                <Spacer h={10} />


                <MyColorPicker title={translate("SelectColor")} allowCustom={true} color={openColorPicker ? openColorPicker.color : "white"}
                    height={300} width={width} isScreenNarrow={true} onClose={() => setOpenColorPicker(undefined)}
                    onSelect={(color) => {
                        openColorPicker && openColorPicker.onSelect(color);
                        setOpenColorPicker(undefined);
                    }} open={openColorPicker != undefined}
                />


                <View style={{ width: "100%", flexDirection: "row", alignItems: "center" }}>
                    {/*Background*/}
                    <View style={styles.faceEditSection}>
                        <Text allowFontScaling={false} style={styles.label}>{translate("EditBackground")}</Text>

                        <Icon name="view-gallery-outline" size={35} onPress={() => {
                            const filePath = getTempFileName("jpg")
                            SelectFromGallery(filePath).then(() => {
                                setBackgroundImage(filePath);
                                setBackgroundColor(undefined)
                            });
                        }} />

                        <Icon name="image-search-outline" size={35} onPress={() => setOpenSearch(true)} />

                        <Icon name="camera-plus-outline" size={35} onPress={() => setOpenCamera(true)} />
                        <Icon name="camera-plus-outline" size={35} onPress={() => setOpenCamera(true)} />
                        <TouchableOpacity
                            style={styles.colorSelectHost}
                            onPress={() => setOpenColorPicker(({
                                color: backgroundColor || DefaultFaceBackgroundColor, onSelect: c => {
                                    setBackgroundColor(c)
                                    setBackgroundImage(undefined);
                                }
                            }))}
                        >
                            <Text allowFontScaling={false} style={styles.styleLabel}>{translate("BackgroundColor")}</Text>
                            <View style={[styles.colorCircle, { backgroundColor: backgroundColor }]} />
                        </TouchableOpacity>
                    </View>
                    {/*Text*/}
                    <View style={[styles.faceEditSection, { width: "50%" }]}>
                        <Text allowFontScaling={false} style={styles.label}>{translate("EditText")}</Text>

                        {/* Editable Text Input */}
                        <View style={{ flexDirection: "column", alignItems: "center", }}>

                            <TextInput
                                style={[
                                    styles.input,
                                    { width: size, height: size },

                                    { fontSize, color, fontWeight: isBold ? "bold" : "normal", backgroundColor },
                                    { fontFamily: fontName }
                                ]}
                                placeholderTextColor="gray"
                                value={text}
                                autoCapitalize="none"
                                autoCorrect={false}

                                onChangeText={(newText) => {
                                    setText(newText);
                                }}
                                autoFocus
                                allowFontScaling={false}
                            />
                        </View>
                        <View style={styles.stylesHost}>
                            {/* Font Selection */}
                            <View style={styles.colorSelectHost}>
                                <Text allowFontScaling={false} style={styles.styleLabel}>{translate("FontName")}</Text>

                                <Dropdown
                                    style={{ width: 150, justifyContent: "flex-start", marginStart: 10 }}
                                    itemTextStyle={{ fontSize: 20 }}
                                    selectedTextStyle={{ fontSize: 20 }}
                                    data={FONTS}
                                    maxHeight={300}
                                    labelField="label"
                                    valueField="value"
                                    value={fontName}
                                    onChange={item => {
                                        setFontName(item.value);
                                    }}
                                />
                            </View>

                            {/* Font Size Selection */}
                            <NumberSelector min={10} max={60} title={translate("FontSize")} value={fontSize} style={styles.fontSelector}
                                onDown={() => setFoneSize(fontSize - 2)}
                                onUp={() => setFoneSize(fontSize + 2)}
                                titleStyle={styles.styleLabel}
                            />


                            <TouchableOpacity style={styles.colorSelectHost}
                                onPress={() => setOpenColorPicker(({ color, onSelect: c => setColor(c) }))} >
                                <Text allowFontScaling={false} style={styles.styleLabel}>{translate("TextColor")}</Text>
                                <View style={[styles.colorCircle, { backgroundColor: color }]} />
                            </TouchableOpacity>

                            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", marginEnd: 15, width: "33%" }}
                                onPress={() => setIsBold(!isBold)}>
                                {isBold ?
                                    <IconMCI name="checkbox-outline" style={{ fontSize: 30, color: BTN_COLOR }} /> :
                                    <IconMCI name="checkbox-blank-outline" style={{ fontSize: 30, color: BTN_COLOR }} />
                                }
                                <Text allowFontScaling={false} style={styles.styleLabel} >{translate("Bold")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>


                    {/*Audio*/}
                    <View style={styles.faceEditSection}>
                        <Text allowFontScaling={false} style={styles.label}>{translate("EditAudio")}</Text>
                    </View>

                </View>


                <View style={styles.buttonRow}>
                    <IconButton width={80} text={translate("OK")} onPress={() => {
                        const faceInfo = {
                            text: text.length > 0 ? {
                                text,
                                fontName,
                                fontBold: isBold,
                                fontSize,
                                color,
                            } : undefined,
                            backgroundUri: backgroundImage,
                            backgroundColor,
                        } as FaceInfo
                        onDone(faceInfo);

                    }} />
                    <IconButton width={80} text={translate("Cancel")} onPress={onClose} />
                </View>
            </View>
        </View>
    );
};

// Styles
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
    },
    faceEditSection: {
        height: "100%",
        width: "22%",
        borderWidth: 1,
        borderColor: "lightgray",
        borderRadius: 7,
        boxShadow: [{
            offsetX: 3,
            offsetY: 6,
            color: 'lightgray',
            blurRadius: 7,
        }],
        margin: 3,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 10,
    },
    label: {
        fontSize: 26,
        marginBottom: 10,
        textAlign: "center",
    },
    input: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        textAlign: "center",
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "bold",
        marginVertical: 5,
    },
    optionButton: {
        margin: 5,
        padding: 10,
        borderRadius: 5,
        backgroundColor: "#ddd",
    },
    toggleButton: {
        marginVertical: 10,
        padding: 10,
        borderWidth: 1,
        borderRadius: 5,
    },
    boldSelected: {
        backgroundColor: "lightgray",
    },
    colorBox: {
        width: 30,
        height: 30,
        margin: 5,
        borderRadius: 5,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
        marginTop: 20,
    },
    button: {
        padding: 10,
        backgroundColor: "#ddd",
        borderRadius: 5,
        width: 150,
        alignItems: "center",
    },
    colorCircle: {
        width: 40, height: 40,
        borderRadius: 20,
        marginEnd: 20,
        borderColor: "gray",
        borderWidth: 1
    },
    fontSelector: {
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        width: 240,
        height: 40
    },
    stylesHost: {
        flexDirection: "column",
        justifyContent: "flex-start",
        margin: 10,
    },
    colorSelectHost: {
        flexDirection: "row",
        marginTop: 7,
        marginBottom: 7,
        alignItems: "center",
        fontSize: 25
    },
    styleLabel: {
        fontSize: 20,
        width: 100,
        fontWeight: "bold",
    },
    picker: {
        height: 50,
        // backgroundColor: "green",
        width: '100%',
        zIndex: 1900
    },
});