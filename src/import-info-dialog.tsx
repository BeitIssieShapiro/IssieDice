import React from 'react';
import { Modal, View, Text, StyleSheet, Button, FlatList, ScrollView, ViewStyle } from 'react-native';
import { ImportInfo } from './import-export';
import { isRTL, translate } from './lang';
import { IconButton } from './components';
import { gStyles } from './common-style';

interface Props {
    importInfo: ImportInfo;
    onClose: () => void;
}

export const ImportInfoDialog: React.FC<Props> = ({ importInfo, onClose }) => {
    const txtAlign: any = { textAlign: "left" };


    const renderSection = (title: string, data: string[]) => (
        <View style={[styles.section]}>
            <Text style={[styles.sectionTitle, txtAlign]}>{title} ({data.length})</Text>

            {data.map((item, index) => (
                <Text key={index} style={[styles.item, txtAlign]}>{isRTL() ? `${item} •` : `• ${item}`}</Text>
            ))}

        </View>
    );

    return (
        <Modal visible={true} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={[styles.container,]}>
                    <Text style={styles.title}>{translate("SuccessfulImport")}</Text>
                    <View style={gStyles.horizontalSeperator} />
                    <ScrollView style={[{ maxHeight: 400 }, { direction: isRTL() ? 'rtl' : 'ltr' }]}>
                        {renderSection(translate("ImportedProfiles"), importInfo.importedProfiles)}
                        {importInfo.skippedExistingProfiles.length > 0 && renderSection(translate("SkippedProfiles"), importInfo.skippedExistingProfiles)}
                        {renderSection(translate('ImportedDice'), importInfo.importedDice)}
                        {importInfo.skippedExistingDice.length > 0 && renderSection(translate('SkippedDice'), importInfo.skippedExistingDice)}
                    </ScrollView>
                    {(importInfo.skippedExistingProfiles.length > 0 || importInfo.skippedExistingDice.length > 0) && <Text
                        style={styles.note}
                    >{translate("NoteSkippedItems")}</Text>}

                    {/* <Button title={translate("OK")} onPress={onClose} /> */}
                    <View style={{ width: "100%", alignItems: "center" }}>
                        <View style={{ width: 120, }}>
                            <IconButton icon={{ name: "check" }} onPress={onClose} text={translate("OK")} />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: '#00000088',
        justifyContent: 'center',
        alignItems: 'center'
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: 400,
        maxHeight: '80%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
    },
    section: {
        marginVertical: 10,
    },
    sectionTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    item: {
        fontSize: 16,
        marginLeft: 8,
        marginRight: 8,
    },
    note: {
        fontSize: 17,
        marginLeft: 8,
        marginRight: 8,
    },
    empty: {
        fontStyle: 'italic',
        color: 'gray',
    }
});