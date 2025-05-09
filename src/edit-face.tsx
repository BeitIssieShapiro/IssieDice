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
import { ColumnChip, IconButton, LabeledIconButton, NumberSelector, ScreenTitle, Section, Spacer } from "./components";
import { MyColorPicker } from "./color-picker";
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/AntDesign';
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
    const isLandscape = windowSize.height < windowSize.width;
    console.log("edit face", isLandscape)

    return (
        <View style={[gStyles.screenContainer]}>
            <View style={[gStyles.screenTitle, { justifyContent: "center" }]}>
                <Text allowFontScaling={false} style={gStyles.screenTitleText}>{translate("EditFace")}</Text>
                <View style={styles.buttons}>
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
                    icon="check"
                    />
                    <IconButton text={translate("Cancel")} onPress={onClose} backgroundColor={colors.titleButtonsBG} 
                    icon="close"
                    />
                </View>
            </View>

            <View style={[isLandscape ? { flexDirection: "row", justifyContent: "space-between" } : { flexDirection: "column", justifyContent: "center" }, { alignItems: "center" }]}>
                {/* Preview  */}
                <View style={{
                    flexDirection: "column",
                    padding: 10,
                    width: (isLandscape ? windowSize.width - windowSize.height : "100%"),
                    alignItems: "center",
                }}>
                    {busy && <View style={styles.busy}>
                        <ActivityIndicator />
                    </View>}
                    <View>
                        {backgroundImage && <View style={styles.cropButton}>
                            <IconIonic size={35} name="crop" onPress={() => {
                                setEditImage(true);
                            }} /></View>}
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
            defaultValue={text}
            autoCapitalize="none"
            autoCorrect={false}

            onChangeText={(newText) => {
                setText(newText);
            }}
            autoFocus
            allowFontScaling={false}
        />
        <View style={{ flexDirection: "column", width: 500 }}>
            {/* Font Selection */}
            <Section title={translate("FontName") + ":"}
                marginHorizontal={0}
                component={
                    <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start" }}

                        onPress={() => setOpenFontPicker({
                            fontName, onSelect: (fontName) => setFontName(fontName)
                        })}                    >
                        <Text allowFontScaling={false}
                            style={{ fontFamily: fontName, fontSize: 22, marginInlineStart: 15, width: 250 }}
                        >{fontName ? FONTS.find(f => f.value === fontName)?.label :
                            translate("NoFont")}
                        </Text>
                        <IconIonic name="list" size={30} />

                    </Pressable>}
            />

            <View style={{ flexDirection: "row", height: 150, justifyContent: "space-around", marginTop: 15 }}>
                {/* Font Size */}
                <ColumnChip title={translate("FontSize")} component={
                    <NumberSelector min={10} max={60} value={fontSize}
                        onDown={() => setFoneSize(fontSize - 2)}
                        onUp={() => setFoneSize(fontSize + 2)}
                    />}
                />

                {/** Color */}
                <ColumnChip title={translate("Color")} component={
                    <Pressable style={[styles.colorCircle, { backgroundColor: color, margin: 0, marginEnd: 0 }]}
                        onPress={() => setOpenColorPicker(({ color, onSelect: c => setColor(c) }))} />}
                />

                {/** Bold */}
                <ColumnChip title={translate("Bold")} component={
                    <Switch value={isBold} onValueChange={(isBold) => setIsBold(isBold)} />}
                />

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

