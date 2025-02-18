import React, { useRef } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import { CropView } from 'react-native-image-crop-tools';
import { IconButton } from './components';
import { translate } from './lang';

interface EditImageProps {
    uri: string;
    onClose: () => void;
    onDone: (url: string) => void;
}

export const EditImage: React.FC<EditImageProps> = ({ uri, onClose, onDone }) => {
    const cropViewRef = useRef<any>(null);

    // Handler to trigger image saving.
    // The first parameter (true) means "export as base64" or similar depending on the API,
    // and the second is the image quality percentage.
    const handleDone = () => {
        if (cropViewRef.current) {
            cropViewRef.current.saveImage(true, 90);
        }
    };

    // Handler to rotate the image clockwise.
    const handleRotate = () => {
        if (cropViewRef.current) {
            cropViewRef.current.rotateImage(true);
        }
    };

    return (
        <View style={styles.container}>
            <CropView
                sourceUrl={"file://"+uri}
                style={styles.cropView}
                ref={cropViewRef}
                keepAspectRatio
                aspectRatio={{ width: 1, height: 1 }}
                onImageCrop={(result: { uri: string }) => {
                    // When cropping is done, pass the result URL to the onDone callback.
                    onDone(result.uri);
                }}
            />
            <View style={styles.buttonContainer}>
                <IconButton icon="check" text={translate("DoneBtn")} onPress={handleDone}/>
                <IconButton icon="reload1" text={translate("Rotate")} onPress={handleRotate}/>
                <IconButton icon="close" text={translate("CancelBtn")} onPress={onClose}/>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "absolute",
        top: 0, left: 0,
        width: "100%", height: "100%",
        backgroundColor: "lightgray",
        zIndex: 1100
    },
    cropView: {
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
    },
});