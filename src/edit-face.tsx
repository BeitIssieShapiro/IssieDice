import React, { useEffect, useState } from "react";
import {

    View,
    Text,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Keyboard,
    Pressable,

} from "react-native";
import { isRTL, translate } from "./lang";
import { ColumnChip, getInsetsLimit, IconButton, LabeledIconButton, MyIcon, NumberSelector, ScreenTitle, Section, Spacer } from "./components";
import { MyColorPicker } from "./color-picker";
import IconIonic from 'react-native-vector-icons/Ionicons';
import { DefaultFaceBackgroundColor, FacePreview, FacePreviewSize } from "./edit-dice";
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
    windowSize: WinSize;
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
import { FaceInfo } from "./models";
import { getTempFileName } from "./disk";
import { colors, gStyles } from "./common-style";
import { WinSize } from "./utils";
import { Switch } from "@rneui/themed";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const routes = [
    { key: 'bg', title: translate('FaceBackgroundTab') },
    { key: 'text', title: translate('FaceTextTab') },
    { key: 'audio', title: translate('FaceAudioTab') },
];

const routesRtl = routes.map((_, i) => routes[routes.length - i - 1])



export const EditFace: React.FC<EditFaceProps> = ({
    windowSize,
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
    const [textMode, setTextMode] = useState<boolean>(false);

    const insets = useSafeAreaInsets();

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
    const markEditMode = (tMode: boolean) => {
        console.log("mark edit mode", tMode)
        setTimeout(() => setTextMode(tMode))
    }

    const isLandscape = windowSize.height < windowSize.width;
    const editingWidth = (isLandscape ? windowSize.height : windowSize.width)
    const isMobileLandscape = windowSize.height < 500;
    const editingHeight = isMobileLandscape ? 180 : 250;
    const isNarrow = editingWidth < 450;
    console.log("edit face", isLandscape, windowSize)

    return (
        <View style={[gStyles.screenContainer]}>
            <View style={[gStyles.screenTitle, { justifyContent: "center" }, isNarrow && { height: 140 }]}>
                <Text allowFontScaling={false} style={gStyles.screenTitleText}>{translate("EditFace")}</Text>
                <View style={[styles.buttons, isNarrow && { bottom: -5, left: 10, alignItems: "center" }]}>
                    <IconButton text={translate("Save")} onPress={() => {
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

                    }} backgroundColor={colors.titleButtonsBG}
                        icon={{ name: "check" }}
                    />
                    <IconButton text={translate("Cancel")} onPress={onClose} backgroundColor={colors.titleButtonsBG}
                        icon={{ name: "close" }}
                    />
                </View>
            </View>

            <View style={[isLandscape ?
                { flexDirection: "row", justifyContent: "space-between", } :
                { flexDirection: "column", justifyContent: "center" },
            { alignItems: isMobileLandscape ? "flex-start" : "center" }]}>
                {/* Preview  */}
                <View style={{
                    flexDirection: "column",
                    padding: 10,
                    width: (isLandscape ? windowSize.width - editingWidth - insets.left - insets.right : "100%"),
                    alignItems: "center",
                }}>
                    {busy && <View style={styles.busy}>
                        <ActivityIndicator />
                    </View>}
                    <View>
                        {backgroundImage && <View style={styles.cropButton}>
                            <IconIonic size={35} name="crop" onPress={() => {
                                setEditImage(true);
                            }} />
                        </View>}
                        <FacePreview size={size}
                            backgroundColor={backgroundColor}
                            backgroundImage={backgroundImage}
                            onTextEdit={textMode ? (text) => {
                                setText(text);
                            } : undefined}
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
                    </View>
                    <Text allowFontScaling={false} style={styles.label}>{translate("FacePreview")}</Text>
                </View>

                {isLandscape ?
                    <View style={gStyles.verticalSeperator} /> :
                    <View style={gStyles.horizontalSeperator} />
                }

                {/**Edit tabs */}
                <View style={{
                    height: 350, width: isLandscape ? windowSize.height : "100%",
                    flexDirection: isRTL() ? "row-reverse" : "row",
                    //alignItems: "center", justifyContent: "center" 
                    //padding: 10,
                }}>
                    <TabView
                        direction={isRTL() ? "ltr" : "ltr"}

                        renderTabBar={props => (
                            <TabBar
                                {...props}
                                indicatorStyle={{ backgroundColor: 'black', height: 4 }}
                                style={{ backgroundColor: 'white' }}
                                activeColor="black"
                                inactiveColor="gray"
                                options={{
                                    bg: { labelStyle: styles.tabLabel },
                                    text: { labelStyle: styles.tabLabel },
                                    audio: { labelStyle: styles.tabLabel },
                                }}
                                onTabPress={(scene => scene.route.key == 'text' ? setTextMode(true) : setTextMode(false))}
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
                                        onOpenColorPicker={(props: ColorPickerProps) => {
                                            setOpenColorPicker(props)
                                        }}
                                        height={editingHeight}
                                    />;
                                case 'text':
                                    return <FaceText size={size} text={text} setText={setText} fontName={fontName} setFontName={setFontName}
                                        isBold={isBold} setIsBold={setIsBold} fontSize={fontSize} setFoneSize={setFoneSize}
                                        color={color} setColor={setColor}
                                        setOpenColorPicker={(props: ColorPickerProps) => {
                                            setOpenColorPicker(props);
                                            setShowFonts(undefined)
                                            Keyboard.dismiss();
                                        }}
                                        setOpenFontPicker={(props: FontPickerProps) => {
                                            setShowFonts(props)
                                            setOpenColorPicker(undefined);
                                            Keyboard.dismiss();
                                        }}
                                        isNarrow={isNarrow}
                                        height={editingHeight}
                                    />;
                                case 'audio':
                                    return <FaceAudio setAudioUri={setAudioUri} audioUri={audioUri} height={editingHeight} />;
                                default:
                                    return <View />;
                            }
                        }}
                        onIndexChange={setTabIndex}
                        initialLayout={{ width }}
                    />
                </View>
            </View>
            <View style={gStyles.horizontalSeperator} />


            <MyColorPicker title={translate("SelectColor")} allowCustom={true} color={openColorPicker ? openColorPicker.color : "white"}
                height={300} width={width} isScreenNarrow={true} onClose={() => setOpenColorPicker(undefined)}
                onSelect={(color) => {
                    openColorPicker && openColorPicker.onSelect(color);
                    setOpenColorPicker(undefined);
                }} open={openColorPicker != undefined}
            />

            <FontPicker height={showFonts != undefined ? 400 : 0} onClose={() => setShowFonts(undefined)}
                onSelect={fontName => {
                    showFonts?.onSelect(fontName);
                    setShowFonts(undefined);
                }}
                currentFont={fontName}
            />
        </View >
    );
};



function FaceBackgroud({ setBackgroundImage, setBusy, setBackgroundColor, onOpenSearch, onOpenCamera, onOpenColorPicker, backgroundColor, height }:
    {
        onOpenSearch: () => void;
        setBackgroundColor: (color: string | undefined) => void;
        setBackgroundImage: (uri: string | undefined) => void;
        setBusy: (busy: boolean) => void;
        onOpenCamera: () => void;
        onOpenColorPicker: (props: ColorPickerProps) => void;
        backgroundColor: string | undefined;
        height: number;
    }) {

    return <View style={[styles.faceEditSection, { height, flexDirection: isRTL() ? "row-reverse" : "row", justifyContent: "space-around" }]}>

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
            color={backgroundColor && backgroundColor != "" ? backgroundColor : DefaultFaceBackgroundColor}
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




function FaceText({ fontSize, fontName, isBold, color, text,
    setText, setColor, setFoneSize, setFontName, setOpenFontPicker, setIsBold, setOpenColorPicker, isNarrow, height }:
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
        isNarrow: boolean;
        height: number;
    }
) {


    const editFontName = <ColumnChip title={translate("FontName")} component={
        <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", borderWidth: 1, borderRadius: 5 }}
            onPress={() => setOpenFontPicker({
                fontName, onSelect: (fontName) => setFontName(fontName)
            })}>
            <MyIcon info={{ name: "down", type: "AntDesign", size: 25 }} />

            <Text allowFontScaling={false}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ fontFamily: fontName, fontSize: 22, marginInlineStart: 5, textAlign: "left", width: 160, }}

            >{fontName ? translate(FONTS.find(f => f.value === fontName)?.label || "") :
                translate("NoFont")}
            </Text>

        </Pressable>}
    />

    const editFontSize = <ColumnChip title={translate("FontSize")} component={
        <NumberSelector min={10} max={60} value={fontSize}
            onDown={() => setFoneSize(fontSize - 2)}
            onUp={() => setFoneSize(fontSize + 2)}
        />}
    />

    const editColor = <ColumnChip title={translate("Color")} component={
        <Pressable style={[styles.colorCircle, { backgroundColor: color, margin: 0, marginEnd: 0 }]}
            onPress={() => setOpenColorPicker(({ color, onSelect: c => setColor(c) }))} />}
    />

    const editBold = <ColumnChip title={translate("Bold")} component={
        <Switch value={isBold} onValueChange={(isBold) => setIsBold(isBold)} />}
    />

    return <View style={[styles.faceEditSection, { direction: isRTL() ? "rtl" : "ltr" }]} >

        <View style={[styles.faceEditSection, { height, flexDirection: isNarrow ? "column" : "row", justifyContent: "space-around"}, { paddingLeft:30,paddingRight:30 }]}>
            {isNarrow && <View style={styles.faceEditSectionRow}>
                {editFontName}
                {editFontSize}
            </View>
            }


            {isNarrow && <View style={styles.faceEditSectionRow}>
                {editColor}
                {editBold}
            </View>
            }

            {!isNarrow && editFontName}
            {!isNarrow && editFontSize}
            {!isNarrow && editColor}
            {!isNarrow && editBold}


        </View>
        {/* </View> */}
    </View >

}


function FaceAudio({ setAudioUri, audioUri, height }: {
    audioUri: string | undefined;
    setAudioUri: (uri: string | undefined) => void;
    height: number;
}) {
    return <View style={[styles.faceEditSection, { height, flexDirection: isRTL() ? "row-reverse" : "row", justifyContent: "space-around" }]}>
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
        {audioUri && <LabeledIconButton icon="play-outline" type="Ionicon" label={translate("PlayAudio")}
            color={colors.sectionIconColor}
            onPress={() => playAudio(audioUri)}
            size={65}
        />}

        <LabeledIconButton icon="close-outline" type="Ionicon" label={translate("NoAudio")}
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
    titleContainer: {
        backgroundColor: "lightgrey",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 80,
        fontSize: 25,
        borderRadius: 5,
        margin: 10,
        width: "95%"
    },
    title: {
        width: "100%",
        textAlign: "center",
        fontSize: 35,
    },
    buttons: {
        position: "absolute",
        right: 10,
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 10,
    },
    button: {
        padding: 10,
        backgroundColor: "#ddd",
        borderRadius: 5,
        width: 150,
        alignItems: "center",
    },
    faceEditSection: {
        height: 250,
        width: "100%",
        borderColor: "lightgray",
        margin: 3,
        alignItems: "center"
    },
    faceEditSectionRow: {
        flexDirection: "row",
        width: "100%",
        borderColor: "lightgray",
        margin: 3,
        alignItems: "center",
        justifyContent: "space-around"
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

    roundButton: {
        margin: 10,
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: "lightgray",
        justifyContent: "center",
        alignItems: "center"
    },



    tabLabel: {
        fontSize: 20,
        fontWeight: "bold"
    }

});

