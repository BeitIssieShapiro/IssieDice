import { StyleSheet } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import RNFS from 'react-native-fs';

export function doNothing() { }

export async function SelectFromGallery(targetFolder: string, fileName: string, cacheBusterPrefix: string | undefined): Promise<string> {
    const options: any = {
        mediaType: 'photo',
        selectionLimit: 1,
    };
    return new Promise((resolve, reject) => {
        launchImageLibrary(options, async (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
                resolve("");
            } else if (response.errorCode) {
                console.log('Image Picker Error: ', response.errorCode);
            } else if (response.assets) {
                const selectedImageUri = response.assets[0].uri;

                // Copy the image to the app's document folder
                if (selectedImageUri) {
                    try {
                        resolve(copyFileToFolder(selectedImageUri, targetFolder, fileName, true, cacheBusterPrefix));
                    } catch (error) {
                        reject(error)
                    }
                }
                return resolve("");
            }
        });
    });

}

export const copyFileToFolder = async (sourcePath: string, targetPath: string, fileName: string, overwrite = true, cacheBusterPrefix: string | undefined = undefined) => {


    const destPath = `${RNFS.DocumentDirectoryPath}/${targetPath}`;
    await RNFS.mkdir(destPath);
    const targetFilePath = `${destPath}/${fileName}`;

    if (overwrite) {
        if (!cacheBusterPrefix) {
            await RNFS.unlink(targetFilePath).catch(doNothing);
        } else {
            const files = await RNFS.readDir(destPath);
            for (const file of files) {
                if (file.name.indexOf(cacheBusterPrefix) > 0) {
                    await RNFS.unlink(file.path);
                }
            }
        }
    }
    // Copy the file from the sourcePath to the destinationPath
    await RNFS.copyFile(sourcePath, targetFilePath);

    return targetFilePath;
};

export const deleteFile = async (filePath: string) => {
    if (filePath.length == 0 || filePath.startsWith("http")) return;
    try {
        // Check if the file exists before attempting to delete it
        const fileExists = await RNFS.exists(filePath);

        if (fileExists) {
            await RNFS.unlink(filePath); // Delete the file
            console.log(`File deleted: ${filePath}`);
        } else {
            console.log('File does not exist');
        }
    } catch (e: any) {
        console.log("error deleting file", filePath, e.message);
    }
}



const styles = StyleSheet.create({
    closeButton: {
        position: "absolute",
        right: 10,
        top: 30,
        zIndex: 100
    },
    pickerTitle: {
        margin: 25,
        fontSize: 25,

    },

    pickerView: {
        flexDirection: 'column',
        backgroundColor: 'white',
        zIndex: 999,
        // width:"100%",
        // height:"100%",
        flex: 1,
        borderColor: 'gray',
        //borderBottomColor: "transparent",
        //borderWidth: 1,
        borderRadius: 20,
        //paddingTop: 2,
        alignItems: 'center',
        overflow: "hidden"
    },

    searchRoot: {
        alignItems: 'center',
        width: '100%',
    },
    searchTextAndBtnContainer: {
        position: "relative",
        flexDirection: 'row',
        marginTop: 30,
        width: '80%',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#E2E2E2',
        borderRadius: 15,
        paddingHorizontal: 20,
        fontSize: 18,
        height: 35,
        color: '#1A1A1A',
    },
    cleanSearchX: {
        right: 3,
        position: 'absolute',
        top: 0,
    },
    cleanXText: {
        fontSize: 25,
        color: 'gray',
    },
    searchImageBtn: {
        backgroundColor: '#5c7e9d',
        borderRadius: 18,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginLeft: 10,
    },
    searchBtnText: {
        color: 'white',
        fontSize: 20,
    },
    resultContainer: {
        flexDirection: "row",
        flex: 1,
        flexWrap: "wrap",
        padding: 15,
        paddingTop: 30,
    },
    foundItem: {
        height: 70,
        width: 70,
        margin: 10,
    },
    noResultMsg: {
        fontSize: 35,
        marginTop: '10%',
        textAlign: 'center',
    },
});
