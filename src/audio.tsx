import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    useAnimatedReaction,
} from 'react-native-reanimated';
import { audioRecorderPlayer } from '../index.js';
import { Alert, Image, PermissionsAndroid, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AudioEncoderAndroidType, OutputFormatAndroidType, RecordBackType } from 'react-native-audio-recorder-player';
import Sound from 'react-native-sound';
Sound.setCategory('Playback');
import * as RNFS from 'react-native-fs';
import path from 'path';

export interface AudioAsset { name: string, asset: any, sound?: Sound }


interface RecordButtonProps {
    size: number,
    onNewAudio: (audioUri: string) => void,
    recordingProgressCallback: (recordingMeta: RecordBackType) => void,
    onStartRecord: () => void,
    onStopRecord: () => void,
}

export async function playAudio(uri: string, volume?: number) {
    try {
        // Start player and handle potential errors
        await audioRecorderPlayer.stopPlayer();
        // uri = "content://com.issiedice.provider/custom-dice/android 1/face_4$$12682.mp4"
        // await audioRecorderPlayer.startPlayer( uri);
        if (!uri.startsWith("file://")) {
            uri = "file://" + uri;
        }
        await audioRecorderPlayer.startPlayer(uri);

        console.log('Player started', uri);

        return true;
    } catch (error) {
        console.error("Error in playRecording:", error);
        return false;
    }
}

export async function playBundledAudio(asset: AudioAsset, volume: number = 1.0) {
    try {
        // Stop any previous playback
        await audioRecorderPlayer.stopPlayer();
        // if (!asset.sound) {
        //     const fileName = "file://" + path.join(RNFS.TemporaryDirectoryPath, asset.name + ".mp3");
        //     const src = Image.resolveAssetSource(asset.asset);
        //     let downloadInfo = await RNFS.downloadFile({
        //         fromUrl: src.uri,
        //         toFile: fileName
        //     });
        //     await downloadInfo.promise;
        //     const soundLoads = new Promise<void>((resolve, reject) => {
        //         asset.sound = new Sound(fileName, undefined, (error) => {
        //             if (error) {
        //                 console.log("Error loading sound", error);
        //             }
        //             resolve();
        //         })
        //     })

        //     await soundLoads;
        // }
        if (asset.sound) {
            // Set the playback volume (0.0 to 1.0).
            asset.sound.setVolume(volume);

            // Play the sound without stopping any other sound.
            asset.sound.play();
        }
    } catch (error) {
        console.error("Error playing bundled audio:", error);
        return false;
    }
}

export const RecordButton = ({
    size,
    onNewAudio,
    recordingProgressCallback,
    onStartRecord,
    onStopRecord,
}: RecordButtonProps) => {
    // Shared value to track the button state (0: not recording, 1: recording)
    const progress = useSharedValue<number>(0);

    // Shared value for blinking opacity
    const blinkOpacity = useSharedValue<number>(1);

    // Define the initial and final sizes
    const INITIAL_SIZE = size - 15;
    const FINAL_SIZE = (size - 15) / 5;

    // Function to start recording
    const _startRecording = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            ]);

            if (!granted) {
                Alert.alert("Permissions not granted")
                return;
            }
        }
        try {
            await audioRecorderPlayer.startRecorder(undefined, {
                AudioEncoderAndroid: AudioEncoderAndroidType.AAC, // or AMR_WB
                OutputFormatAndroid: OutputFormatAndroidType.MPEG_4, // or THREE_GPP
                AudioSourceAndroid: 1, // MIC
                AudioSamplingRateAndroid: 44100,     // 🔼 bump to 44.1kHz
                AudioChannelsAndroid: 1,
                AudioEncodingBitRateAndroid: 96000, // or 128000
            });
            console.log("Recording started...");
            audioRecorderPlayer.addRecordBackListener(recordingProgressCallback);
        } catch (err) {
            console.log("Failed to start recording...", err);
            throw err;
        }
    };

    // Function to stop recording
    const _stopRecording = async () => {
        try {
            const fileName = await audioRecorderPlayer.stopRecorder();
            audioRecorderPlayer.removeRecordBackListener();
            return fileName;
        } catch (err) {
            console.log("Failed to stop recording...", err);
            throw err;
        }
    };

    // Function to handle button press
    const _onPress = async () => {
        if (progress.value === 0) {
            // Start recording
            progress.value = withTiming(1, {
                duration: 500,
                easing: Easing.out(Easing.ease),
            });
            _startRecording();
            onStartRecord();
        } else {
            // Stop recording
            progress.value = withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.ease),
            });
            try {
                const fileName = await _stopRecording();
                onNewAudio(fileName);
                onStopRecord();
            } catch (err) {
                // Handle error as needed
            }
        }
    };

    // Animated style for the outer circle
    const animatedCircleStyle = useAnimatedStyle(() => {
        const currentSize = INITIAL_SIZE - INITIAL_SIZE * progress.value;

        // const backgroundColor = interpolateColor(
        //     progress.value,
        //     [0, 1],
        //     ['#FF0000', '#000000'] // Red to Black
        // );

        return {
            width: currentSize,
            height: currentSize,
            borderRadius: currentSize / 2,
            backgroundColor: "red",
            justifyContent: 'center',
            alignItems: 'center',
        };
    });

    // Animated style for the square
    const animatedSquareStyle = useAnimatedStyle(() => {
        return {
            opacity: blinkOpacity.value,
        };
    });

    // React to changes in progress.value to start/stop blinking
    useAnimatedReaction(
        () => progress.value,
        (current, previous) => {
            if (current === 1 && previous !== 1) {
                // Start blinking
                blinkOpacity.value = withRepeat(
                    withTiming(0.4, {
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    -1, // Infinite repeats
                    true // Reverse each time (yoyo)
                );
            } else if (current === 0 && previous !== 0) {
                // Stop blinking and reset opacity
                blinkOpacity.value = withTiming(1, {
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                });
            }
        }
    );

    return (
        <Pressable
            onPress={_onPress}
            style={{
                alignItems: "center",
                justifyContent: "center",
            }}>
            <View style={[styles.circle, {
                position: "absolute",
                width: size,
                height: size,
                borderRadius: size / 2,
            }]} />

            <Animated.View style={[animatedCircleStyle]}>
                <Animated.View
                    style={[
                        styles.square,
                        {
                            width: FINAL_SIZE * 2,
                            height: FINAL_SIZE * 2,
                        },
                        animatedSquareStyle,
                    ]}
                />
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    circle: {
        backgroundColor: "black",
        borderWidth: 5,
        borderColor: "white",

    },
    square: {
        backgroundColor: "red",
        borderRadius: 6,
    },
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderStyle: "solid",
        borderLeftWidth: 15,
        borderRightWidth: 15,
        borderBottomWidth: 25,
        left: 3,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "white",
        transform: [{ rotate: "90deg" }],
    },
    pause: {
        height: 25,
        width: 25,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderColor: "white",

    },
    playIcon: {
        position: 'absolute',
        fontSize: 30,
        color: "white"
    },
    container: {
        backgroundColor: "#173D73",
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: "50%",
    },
    animatedBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        borderColor: 'transparent',
        borderWidth: 5,
        borderRadius: 999, // Large radius to ensure it's circular
        width: '100%',
        height: '100%',
        borderTopColor: 'red', // Only top border visible for progress effect
    },
    iconContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
});