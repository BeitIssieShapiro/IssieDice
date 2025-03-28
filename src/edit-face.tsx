import React, { useEffect, useState } from "react";
import {

    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Keyboard,
    Pressable,

} from "react-native";
import { isRTL, translate } from "./lang";
import { FadeInView, IconButton, LabeledIconButton, NumberSelector } from "./components";
import { MyColorPicker } from "./color-picker";
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/AntDesign';
import { BTN_COLOR } from "./settings";
import { Dropdown } from "react-native-element-dropdown";
import { DefaultFaceBackgroundColor, FacePreview, FacePreviewSize } from "./edit-dice";
import { FaceInfo, getTempFileName } from "./profile";
import { SelectFromGallery } from "./image-select";
import { CameraOverlay } from "./CameraOverlay";
import { SearchImage } from "./search-image";
import { playAudio, RecordButton } from "./audio";
import { EditImage } from "./edit-image";

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
    intialAudioUri?: string;

    onDone: (faceInfo: FaceInfo) => void;
    onClose: () => void;
    width: number;
    size: number;


}
interface ColorPickerProps {
    color: string;
    onSelect: (color: string) => void;
}

interface FontPickerProps {
    fontName: string | undefined;
    onSelect: (fontName: string | undefined) => void;
}

import { TabView, TabBar } from 'react-native-tab-view';
import { FontPicker, FONTS } from "./font-picker";

const routes = [
    { key: 'bg', title: translate('FaceBackgroundTab') },
    { key: 'text', title: translate('FaceTextTab') },
    { key: 'audio', title: translate('FaceAudioTab') },
];

const routesRtl = routes.map((_, i) => routes[routes.length - i - 1])



export const EditFace: React.FC<EditFaceProps> = ({
    initialFaceText,
    intialAudioUri,
    initialBackgroundColor,
    initialBackgroundImage, onDone, onClose, width, size,
}) => {
    const [tabIndex, setTabIndex] = React.useState<number>(isRTL() ? routes.length - 1 : 0);

    const [text, setText] = useState<string>(initialFaceText?.text || "");
    const [fontName, setFontName] = useState<string | undefined>(initialFaceText?.fontName || undefined);

    const [fontSize, setFoneSize] = useState(initialFaceText?.fontSize || 30);
    const [isBold, setIsBold] = useState(initialFaceText?.fontBold !== undefined ? initialFaceText.fontBold : false);
    const [color, setColor] = useState(initialFaceText?.color || "black");
    const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
    const [openColorPicker, setOpenColorPicker] = useState<ColorPickerProps | undefined>();
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>(initialBackgroundImage);
    const [audioUri, setAudioUri] = useState<string | undefined>(intialAudioUri);
    const [openCamera, setOpenCamera] = useState<boolean>(false);
    const [openSearch, setOpenSearch] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [editImage, setEditImage] = useState<boolean>(false);
    const [KBHeight, setKBHeight] = useState<number>(0);
    const [showFonts, setShowFonts] = useState<FontPickerProps | undefined>();



    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e: { endCoordinates: { height: number } }) => {
            setKBHeight(e.endCoordinates.height);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKBHeight(0));

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        }

    }, []);


    if (openCamera) {
        return <CameraOverlay onClose={() => {
            setOpenCamera(false)
            setBusy(false);
        }} onDone={(uri) => {
            setBackgroundImage(uri);
            setBackgroundColor(undefined)
            setOpenCamera(false);
            setBusy(false);
        }} />
    }

    if (openSearch) {
        const filePath = getTempFileName("jpg");
        return <SearchImage
            onSelectImage={(uri) => {
                setBackgroundImage(uri);
                setBackgroundColor(undefined)
                setOpenSearch(false);
                setBusy(false);
            }}
            onClose={() => {
                setOpenSearch(false);
                setBusy(false);
            }} width={width}
            targetFile={filePath}
        />
    }

    if (editImage && backgroundImage) {
        return <EditImage uri={backgroundImage} onClose={() => {
            setEditImage(false)
        }} onDone={(uri) => {
            setBackgroundImage(uri);
            setEditImage(false);
        }} />
    }


    return (
        // <FadeInView height={550 + KBHeight}
        <View
            style={[styles.container]}>

            <Text allowFontScaling={false} style={styles.title}>{translate("EditFace")}</Text>

            <View style={{ marginBottom: 10 }}>
                {busy && <View style={styles.busy}>
                    <ActivityIndicator />
                </View>}
                <FacePreview size={size}
                    backgroundColor={backgroundColor}
                    backgroundImage={backgroundImage}
                    faceText={{
                        fontName: fontName,
                        fontBold: isBold,
                        fontSize: fontSize,
                        text: text || "",
                        color,
                    }}
                    audioUri={audioUri}
                    onAudioPress={() => audioUri && playAudio(audioUri)}
                />
                {backgroundImage && <View style={styles.cropButton}>
                    <IconIonic size={35} name="crop" onPress={() => {
                        setEditImage(true);
                    }} /></View>}
            </View>


            <MyColorPicker title={translate("SelectColor")} allowCustom={true} color={openColorPicker ? openColorPicker.color : "white"}
                height={300} width={width} isScreenNarrow={true} onClose={() => setOpenColorPicker(undefined)}
                onSelect={(color) => {
                    openColorPicker && openColorPicker.onSelect(color);
                    setOpenColorPicker(undefined);
                }} open={openColorPicker != undefined}
            />

            <FontPicker open={showFonts != undefined} height={400} onClose={() => setShowFonts(undefined)}
                onSelect={fontName => {
                    showFonts?.onSelect(fontName);
                    setShowFonts(undefined);
                }}
                currentFont={fontName}
            />

            <View style={{ height: 250, width: "100%", flexDirection: isRTL() ? "row-reverse" : "row", alignItems: "center", justifyContent: "center" }}>

                <TabView
                    direction={isRTL() ? "ltr" : "ltr"}

                    renderTabBar={props => (
                        <TabBar
                            {...props}
                            indicatorStyle={{ backgroundColor: 'black', height: 4 }}
                            style={{ backgroundColor: 'transparent' }}
                            activeColor="black"
                            inactiveColor="gray"
                            options={{
                                bg: { labelStyle: styles.tabLabel },
                                text: { labelStyle: styles.tabLabel },
                                audio: { labelStyle: styles.tabLabel },
                            }}
                        />)}

                    navigationState={{ index: tabIndex, routes: isRTL() ? routesRtl : routes }}
                    renderScene={({ route, jumpTo }) => {
                        switch (route.key) {
                            case 'bg':
                                return <FaceBackgroud
                                    backgroundColor={backgroundColor}
                                    setBackgroundColor={setBackgroundColor}
                                    setBackgroundImage={setBackgroundImage}
                                    setBusy={setBusy}
                                    onOpenSearch={() => setOpenSearch(true)}
                                    onOpenCamera={() => setOpenCamera(true)}
                                    onOpenColorPicker={(props: ColorPickerProps) => setOpenColorPicker(props)} />;
                            case 'text':
                                return <FaceText size={size} text={text} setText={setText} fontName={fontName} setFontName={setFontName}
                                    isBold={isBold} setIsBold={setIsBold} fontSize={fontSize} setFoneSize={setFoneSize}
                                    color={color} setColor={setColor} setOpenColorPicker={setOpenColorPicker}
                                    setOpenFontPicker={(props: FontPickerProps) => setShowFonts(props)} />;
                            case 'audio':
                                return <FaceAudio setAudioUri={setAudioUri} />;
                        }
                    }}
                    onIndexChange={setTabIndex}
                    initialLayout={{ width: width }}
                />
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
                        audioUri,
                    } as FaceInfo
                    onDone(faceInfo);

                }} />
                <IconButton width={80} text={translate("Cancel")} onPress={onClose} />
            </View>
        </View>
    );
};



function FaceBackgroud({ setBackgroundImage, setBusy, setBackgroundColor, onOpenSearch, onOpenCamera, onOpenColorPicker, backgroundColor }:
    {
        onOpenSearch: () => void;
        setBackgroundColor: (color: string | undefined) => void;
        setBackgroundImage: (uri: string | undefined) => void;
        setBusy: (busy: boolean) => void;
        onOpenCamera: () => void;
        onOpenColorPicker: (props: ColorPickerProps) => void;
        backgroundColor: string | undefined;
    }) {

    return <View style={[styles.faceEditSection, { flexDirection: isRTL() ? "row-reverse" : "row", justifyContent: "space-around" }]}>

        <LabeledIconButton icon="view-gallery-outline" type="MCI" label={translate("SrcFromGallery")} onPress={() => {
            const filePath = getTempFileName("jpg")
            setBusy(true);
            SelectFromGallery(filePath).then(() => {
                console.log("set bg image from galery", filePath)
                setBackgroundImage(filePath);
                setBackgroundColor(undefined)
            })
                .catch(e => console.log("eee", e))
                .finally(() => setBusy(false));
        }} />

        <LabeledIconButton icon="image-search-outline" type="MCI" label={translate("SrcFromSearch")} onPress={() => {
            setBusy(true);
            onOpenSearch()
        }} />

        <LabeledIconButton icon="camera-plus-outline" type="MCI" label={translate("SrcFromCamera")} onPress={() => {
            setBusy(true);
            onOpenCamera()
        }} />

        <LabeledIconButton icon="circle" type="MCI" label={translate("FaceBackgroundColor")}
            color={backgroundColor}
            onPress={() => onOpenColorPicker({
                color: backgroundColor && backgroundColor != "" ? backgroundColor : DefaultFaceBackgroundColor,
                onSelect: c => {
                    setBackgroundColor(c)
                    setBackgroundImage(undefined);
                }

            })}
            size={40}
        />

        <LabeledIconButton icon="close-outline" type="Ionicon" label={translate("NoBackground")}
            color="red"
            onPress={() => {
                setBackgroundImage(undefined);
                setBackgroundColor(undefined)
            }
            } />
    </View>
}




function FaceText({ fontSize, fontName, isBold, color, text, setText, setColor, setFoneSize, setFontName, setOpenFontPicker, setIsBold, setOpenColorPicker }:
    {
        fontSize: number;
        size: number;
        text: string;
        fontName?: string;
        color: string;
        isBold: boolean;
        setText: (text: string) => void;
        setFontName: (fontName: string | undefined) => void;
        setColor: (color: string) => void;
        setIsBold: (isBold: boolean) => void;
        setFoneSize: (fontSize: number) => void;
        setOpenColorPicker: (props: ColorPickerProps) => void;
        setOpenFontPicker: (props: FontPickerProps) => void;
    }
) {
    return <View style={[styles.faceEditSection, { direction: isRTL() ? "rtl" : "ltr" }]} >

        <TextInput
            style={[
                styles.input,
                { width: "30%", marginTop: 10 },

            ]}
            placeholderTextColor="gray"
            multiline={true}
            value={text}
            autoCapitalize="none"
            autoCorrect={false}

            onChangeText={(newText) => {
                setText(newText);
            }}
            autoFocus
            allowFontScaling={false}
        />
        <View style={{ flexDirection: "row" }}>
            <View style={[styles.stylesHost, { width: "60%" }]}>
                {/* Font Selection */}
                <View style={styles.colorSelectHost}>
                    <Text allowFontScaling={false} style={styles.styleLabel}>{translate("FontName")}</Text>
                    <Pressable style={{flexDirection:"row", width:300, alignItems:"center", justifyContent:"flex-start"}}
                    
                    onPress={() => setOpenFontPicker({
                        fontName, onSelect: (fontName) => setFontName(fontName)
                    })}>
                        <Icon name="edit" size={30} />
                        <Text allowFontScaling={false}
                            style={{ fontFamily: fontName, fontSize: 22, marginInlineStart:15 }}
                        >{fontName ? FONTS.find(f => f.value === fontName)?.label :
                            translate("NoFont")}</Text>
                        
                    </Pressable>


                </View>

                {/* Font Size Selection */}
                <NumberSelector min={10} max={60} title={translate("FontSize")} value={fontSize} style={styles.fontSelector}
                    onDown={() => setFoneSize(fontSize - 2)}
                    onUp={() => setFoneSize(fontSize + 2)}
                    titleStyle={styles.styleLabel}
                />
            </View>
            <View style={styles.verticalSeperator} />
            <View style={[styles.stylesHost, { width: "25%" }]}>

                <TouchableOpacity style={styles.colorSelectHost}
                    onPress={() => setOpenColorPicker(({ color, onSelect: c => setColor(c) }))} >
                    <Text allowFontScaling={false} style={styles.styleLabel}>{translate("TextColor")}</Text>
                    <View style={[styles.colorCircle, { backgroundColor: color }]} />
                </TouchableOpacity>

                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", marginEnd: 15, width: "33%" }}
                    onPress={() => setIsBold(!isBold)}>
                    {isBold ?
                        <IconMCI name="checkbox-outline" style={{ fontSize: 30, color: BTN_COLOR, marginEnd: 5, width: 30 }} /> :
                        <IconMCI name="checkbox-blank-outline" style={{ fontSize: 30, color: BTN_COLOR, marginEnd: 5, width: 30 }} />
                    }
                    <Text allowFontScaling={false} style={styles.styleLabel} >{translate("Bold")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>

}


function FaceAudio({ setAudioUri }: {
    setAudioUri: (uri: string | undefined) => void;
}) {
    return <View style={[styles.faceEditSection, { flexDirection: isRTL() ? "row-reverse" : "row", justifyContent: "center" }]}>
        <View style={{ width: 100, alignItems: "center" }}>
            <View style={styles.roundButton}>
                <RecordButton
                    size={60}
                    recordingProgressCallback={(state) => {
                        console.log("recording state", state);
                        //setRecordingState(state);
                    }}
                    onStartRecord={() => { }}
                    onStopRecord={() => { }}
                    onNewAudio={(filePath) => setAudioUri(filePath)}
                />
            </View>
            <Text allowFontScaling={false} style={{ fontSize: 18 }}>{translate("RecordAudio")}</Text>
        </View>
        <LabeledIconButton icon="close-outline" type="Ionicon" label={translate("NoBackground")}
            color="red"
            onPress={() => setAudioUri(undefined)}
            size={65}
        />
    </View>

}

// Styles
const styles = StyleSheet.create({

    container: {
        position: "absolute",
        top: 0, bottom: 0, left: 0, right: 0,
        padding: 20,
        backgroundColor: "white",
        alignItems: "center",
        zIndex: 1200,
        shadowColor: '#171717',
        shadowOffset: { width: 3, height: -6 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
    },
    faceEditSection: {
        height: 200,
        width: "100%",
        borderColor: "lightgray",
        margin: 3,
        alignItems: "center"
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
        fontSize: 20,
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
        marginTop: 10,
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
        justifyContent: "flex-end",
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
        textAlign: "left",
        fontSize: 20,
        width: 80,
        fontWeight: "bold",
    },
    picker: {
        height: 50,
        // backgroundColor: "green",
        width: '100%',
        zIndex: 1900
    },
    busy: {
        position: "absolute",
        left: -FacePreviewSize / 2,
        top: FacePreviewSize / 3,
    },
    cropButton: {
        position: "absolute",
        right: -40,
        bottom: 0,
    },
    playButton: {
        position: "absolute",
        right: 0,
        top: 0,
    },
    roundButton: {
        margin: 10,
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: "lightgray",
        justifyContent: "center",
        alignItems: "center"
    },
    dropdown: {
        width: 240,
        direction: isRTL() ? "rtl" : "ltr",
        marginStart: 10,
    },
    itemContainer: {
        padding: 10,
        flexDirection: "row",
        alignItems: "center",

    },
    itemText: {
        fontSize: 20,
    },
    tabLabel: {
        fontSize: 18,
        fontWeight: "bold"
    },
    verticalSeperator: {
        height: "100%",
        width: 3,
        backgroundColor: "lightgray",
        margin: 7,

    }

});

