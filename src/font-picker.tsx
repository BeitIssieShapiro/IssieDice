import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { isRTL, translate } from './lang';
import { FadeInView } from './components';
import IconIonic from 'react-native-vector-icons/Ionicons';
export const FONTS = [
    { label: "NoFont", value: undefined },
    { label: "Alef - אלף", value: "Alef-regular" },
    { label: "Gveret Levin - גברת לוין", value: "Gveret Levin AlefAlefAlef" },
    { label: "Daba Yad - דנה יד", value: "DanaYadAlefAlefAlef-Normal" },
    { label: "David Libre - דויד ליבר", value: "DavidLibre-Regular" },
    { label: "Arial - אריאל", value: "Ariel Regular" },
];

export interface FontPickerProps {
    open: boolean;
    height: number;
    onClose: () => void;
    onSelect: (fontName: string | undefined) => void;
    currentFont: string | undefined;
}

export const FontPicker: React.FC<FontPickerProps> = ({
    open,
    height,
    onClose,
    onSelect,
    currentFont,

}) => {

    const [fonts] = useState<any[]>(FONTS
        .map(f => ({ ...f, label: translate(f.label) })));


    return (
        <FadeInView
            height={open ? height : 0}
            style={[styles.container, { bottom: 0, left: 0, right: 0 }]}
        >
            <Pressable onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={45} color="black" />
            </Pressable>
            <View style={styles.header}>
                <Text allowFontScaling={false} style={styles.title}>{translate("SelectFont")}</Text>

            </View>
            <ScrollView style={styles.scroll}>
                {fonts.map((item) => (
                    <Pressable key={item.value || item.label} onPress={() => onSelect(item.value)}>
                        <View style={styles.itemContainer}>
                            {currentFont === item.value && (
                                <IconIonic name="checkmark-outline" color="blue" size={20} />
                            )}
                            <Text
                                style={[
                                    styles.itemText,
                                    { fontFamily: item.value },
                                    currentFont === item.value && styles.selectedText,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {item.label}
                            </Text>

                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </FadeInView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        position: 'absolute',
        backgroundColor: "white",
        zIndex: 99999,
        left: 0,
        borderColor: 'gray',
        borderBottomColor: "transparent",
        borderWidth: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 2,
        alignItems: 'center',
        shadowColor: 'black',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.35,
        shadowRadius: 3.84,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
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