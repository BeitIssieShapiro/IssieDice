import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from 'react-native-vector-icons/AntDesign';
import ColorPicker from 'react-native-wheel-color-picker'
import { Settings } from './setting-storage';
import { ColorButton, FadeInView } from "./components";
import { SettingsKeys } from "./settings-storage";

export const defaultFloorColor = '#0F870D' //deep green

export const availableColorPicker = [
    '#000000', '#FEE100', defaultFloorColor, "#5db7dd", '#2958AF', '#D62796', '#E7E7E7', '#DA3242'
]



const MAX_LAST_COLORS = 4;
interface MyColorPickerProps {
    open: boolean;
    color: string;
    title: string;
    width: number;
    height: number;
    isScreenNarrow: boolean;
    onSelect: (color: string) => void;
    onClose: () => void;
    allowCustom: boolean
}
export function MyColorPicker({ open, color, title, width, height, isScreenNarrow, onSelect, onClose, allowCustom }: MyColorPickerProps) {
    const [openMore, setOpenMore] = useState(false);
    const [composedColor, setComposedColor] = useState(color);
    const [lastColors, setLastColors] = useState<string[]>([]);


    useEffect(() => {
        //load last colors
        const lastC = Settings.getArray<string>(SettingsKeys.LastColors, "string", []);
        if (lastC?.length > 0) {
            setLastColors(lastC)
        }
    }, [])

    let colorButtonSize = (width) / ((availableColorPicker.length + 1) * 1.4);
    if (!isScreenNarrow) {
        colorButtonSize *= 2;
    }
    const actHeight = open ? height : 0;

    // useEffect(() => {
    //     props.onHeightChanged(height);
    // }, [openMore, props.open]);


    const _handleSelect = useCallback(() => {
        console.log("Selected color", composedColor)
        onSelect(composedColor)
        if (lastColors.find(lc => lc === composedColor)) {
            return
        }
        //save the last three colors
        const lastC = [composedColor, ...lastColors];
        while (lastC.length > MAX_LAST_COLORS) {
            lastC.pop()
        }
        Settings.setArray(SettingsKeys.LastColors, lastC)
        setLastColors(lastC)

    }, [composedColor, lastColors]);


    if (actHeight === 0) {
        return null;
    }

    //trace("last colors", lastColors)
    //trace("color", props.color, "composed", composedColor)
    return <FadeInView height={actHeight + (openMore ? 270 : 0)}
        style={[styles.pickerView, { bottom: 0, left: 0, right: 0 }]}>
        <Text allowFontScaling={false} style={{ fontSize: 25, margin: 25 }}>{title}</Text>
        <View style={styles.closeButton}>
            <Icon name="close" size={45} onPress={() => onClose()} />
        </View>


        <View
            style={{
                flexDirection: 'row',
                width: '100%',
                margin: 70,
                height: colorButtonSize,
                justifyContent: 'space-evenly', alignItems: 'center'
            }}>
            {availableColorPicker.map((c, i) => <ColorButton
                key={i}
                callback={() => onSelect(c)}
                color={c}
                size={colorButtonSize}
                icon={c == color ? "check" : undefined}
                iconType="FontAwaesome"
                index={i} />
            )}
            {/* More color button */}
            {allowCustom && <ColorButton
                callback={() => setOpenMore(val => !val)}
                color={"white"}
                size={colorButtonSize}
                icon={openMore ? "chevron-up" : "chevron-down"}
                iconColor="black"
                type="MCI"
            />}

        </View>
        {openMore && <View style={{ flex: 1, top: 0, left: 0, height: 300, width: "90%", alignItems: "center" }}>
            <View style={{
                position: "absolute",
                top: 30, left: -12,
                //height: colorButtonSize * 3 + 30,
                width: colorButtonSize * 2 + 30,
                flexWrap: "wrap",
                zIndex: 1000, flexDirection: "row",
            }} >
                {lastColors.map((c, i) => <View key={i} style={{ padding: 5 }}>
                    <ColorButton
                        callback={() => onSelect(c)}
                        color={c}
                        size={colorButtonSize}
                        icon={c == color ? "check" : undefined}
                        index={i} 
                        iconType="MCI"
                        />
                </View>
                )}



            </View>

            <View style={{
                position: "absolute",
                justifyContent: "flex-end",
                top: 95, right: isScreenNarrow ? 0 : "15%",
                width: colorButtonSize * 2 + 30,
                flexWrap: "wrap",
                zIndex: 1000, flexDirection: "row",
            }} >
                {
                    composedColor && composedColor != color && !lastColors.find(lc => lc === composedColor) &&
                    <View style={{ padding: 5 }}>
                        <ColorButton
                            callback={_handleSelect}
                            color={composedColor}
                            size={colorButtonSize}
                            iconType="MCI"
                        //false)}
                        />
                    </View>
                }
            </View>
            <View style={{ width: "90%", height: "100%" }}>
                <ColorPicker
                    color={composedColor}
                    onColorChangeComplete={(color) => {
                        if (open) {
                            setComposedColor(color)
                        }
                    }}
                    onColorChange={(color) => {
                        if (open) {
                            setComposedColor(color)
                        }
                    }}

                    sliderSize={20}
                    noSnap={true}
                    row={false}
                    gapSize={10}
                    thumbSize={25}
                    autoResetSlider={true}
                    swatches={false}
                />
            </View>

        </View>
        }

    </FadeInView>
}

export function increaseColor(hexColor: string, amount: number) {
    if (!hexColor) {
        return "white"
    }
    // Convert hexadecimal color to RGB components
    var r = parseInt(hexColor.substring(1, 3), 16);
    var g = parseInt(hexColor.substring(3, 5), 16);
    var b = parseInt(hexColor.substring(5, 7), 16);

    // Increase each component by the specified amount
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);

    // Convert RGB components back to hexadecimal color
    var result = '#' +
        (r < 16 ? '0' : '') + r.toString(16) +
        (g < 16 ? '0' : '') + g.toString(16) +
        (b < 16 ? '0' : '') + b.toString(16);

    return result;
}

const styles = StyleSheet.create({
    closeButton: {
        position: "absolute",
        right: 10,
        top: "4%",
        zIndex: 100
    },
    pickerView: {
        flexDirection: 'column',
        position: 'absolute',
        backgroundColor: '#FAFAFA',
        zIndex: 99999,
        left: 0,
        borderColor: 'gray',
        borderBottomColor: "transparent",
        borderWidth: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 2,
        alignItems: 'center',
    }
});