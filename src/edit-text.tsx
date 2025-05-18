import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    useWindowDimensions,
} from "react-native";
import { translate } from "./lang";
import { IconButton } from "./components";
import { MyColorPicker } from "./color-picker";
import { FaceText } from "./edit-face";
import { WinSize } from "./utils";


interface EditTextProps {
    label: string;
    initialText: string;
    textOnly?: boolean;
    initialFontName?: string;
    initialFontSize?: number;
    initialFontBold?: boolean;
    initialColor?: string;
    initialBGColor?: string;
    onDone: (faceText: FaceText) => void;
    onClose: () => void;
    width: number;
    textWidth: number;
    textHeight: number;
    windowSize: WinSize;

}


interface ColorPickerProps {
    color: string;
    onSelect: (color: string) => void;
}

export const EditText: React.FC<EditTextProps> = ({
    label, initialText, textOnly, initialFontSize, initialFontBold, initialColor, initialBGColor, initialFontName,
    onDone, onClose, width, textWidth, textHeight, windowSize
}) => {
    const [text, setText] = useState(initialText);
    const [fontSize, setFoneSize] = useState(initialFontSize || 30);
    const [isBold, setIsBold] = useState(initialFontBold !== undefined ? initialFontBold : false);
    const [color, setColor] = useState(initialColor || "black");
    const [backgroundColor, setBackgroundColor] = useState(initialBGColor || "#E7E7E7");
    const [openColorPicker, setOpenColorPicker] = useState<ColorPickerProps | undefined>();
    const [fontName, setFontName] = useState<string | undefined>(initialFontName || undefined);


    console.log("Render edit-text", text, fontName, windowSize)
    const top = windowSize.height < 400 ? 0 : "12%";

    return (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { zIndex: 999999 }, { top }]}>
            <View style={[styles.container, { width: width || "90%" }]}>

                <MyColorPicker title={translate("SelectColor")} allowCustom={true} color={openColorPicker ? openColorPicker.color : "white"}
                    height={300} width={width} isScreenNarrow={true} onClose={() => setOpenColorPicker(undefined)}
                    onSelect={(color) => {
                        openColorPicker && openColorPicker.onSelect(color);
                        setOpenColorPicker(undefined);
                    }} open={openColorPicker != undefined}
                />

                {/* Editable Text Input */}
                <View style={{ flexDirection: "column", alignItems: "center", }}>
                    <Text allowFontScaling={false} style={styles.label}>{label}</Text>

                    <TextInput
                        style={[
                            styles.input,
                            { width: textWidth, height: textHeight },

                            { fontSize, color, fontWeight: isBold ? "bold" : "normal", backgroundColor },
                            { fontFamily: fontName }
                        ]}
                        placeholderTextColor="gray"
                        defaultValue={text}
                        autoCapitalize="none"
                        autoCorrect={false}

                        onChangeText={(newText) => {
                            setText(newText);
                        }}
                        autoFocus
                        allowFontScaling={false}
                    />
                </View>




                <View style={styles.buttonRow}>
                    <IconButton text={translate("OK")} icon={{ name: "check" }} onPress={() => {
                        onDone({
                            text,
                            backgroundColor,
                            color,
                            fontBold: isBold,
                            fontName,
                            fontSize,
                        })
                    }} />
                    <IconButton text={translate("Cancel")} icon={{ name: "close" }} onPress={onClose} />
                </View>
            </View>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    overlay: {
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
    label: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 10,
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