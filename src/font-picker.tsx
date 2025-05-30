import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { isRTL, translate } from './lang';
import { FadeInView } from './components';
import IconIonic from 'react-native-vector-icons/Ionicons';
import { gStyles } from './common-style';
export const FONTS = [
    { label: "NoFont", value: undefined },
    { label: "AlefFont", value: "Alef-regular" },
    { label: "GveretLevinFont", value: "Gveret Levin AlefAlefAlef" },
    { label: "DabaYadFont", value: "DanaYadAlefAlefAlef-Normal" },
    { label: "DavidLibreFont", value: "DavidLibre-Regular" },
    { label: "ArialFont", value: "Ariel Regular" },
];

export interface FontPickerProps {
    height: number;
    onClose: () => void;
    onSelect: (fontName: string | undefined) => void;
    currentFont: string | undefined;
}

export const FontPicker: React.FC<FontPickerProps> = ({
    height,
    onClose,
    onSelect,
    currentFont,

}) => {

    const [fonts] = useState<any[]>(FONTS
        .map(f => ({ ...f, label: translate(f.label) })));


    return (
        <FadeInView
            height={height}
            style={[gStyles.pickerView]}
        >

            <View style={gStyles.pickerTitleHost}>
                <Icon name="close" size={45} color="black" onPress={onClose} style={styles.closeButton} />
                <Text allowFontScaling={false} style={gStyles.pickerTitleText}>{translate("SelectFont")}</Text>
            </View>
            <View style={gStyles.horizontalSeperator} />

            <ScrollView style={styles.scroll}>
                {fonts.map((item) => {
                    const fontFamily = item.value;

                    return (
                    <Pressable key={fontFamily || item.label} onPress={() => onSelect(fontFamily)}>
                        <View style={styles.itemContainer}>
                            {currentFont === fontFamily && (
                                <IconIonic name="checkmark-outline" color="blue" size={20} />
                            )}
                            <Text
                                style={[
                                    styles.itemText,
                                    { fontFamily },
                                    currentFont === fontFamily && styles.selectedText,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {item.label}
                            </Text>

                        </View>
                    </Pressable>
                )})}
            </ScrollView>
        </FadeInView>
    );
};

const styles = StyleSheet.create({
    closeButton: {
        position: "absolute",
        right: 10,
        top: 10,
        zIndex: 100
    },
    scroll: {
        marginTop: 20,
        width: '100%',
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    itemText: {
        textAlign: "center",
        fontSize: 20,
    },
    selectedText: {
        fontWeight: 'bold',
        // color: 'blue',
    },
});