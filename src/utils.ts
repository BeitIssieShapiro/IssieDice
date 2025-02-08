import { Platform, PermissionsAndroid } from "react-native";

export function joinPaths(...segments:string[]) {
    return segments
        .map((seg) => seg.replace(/\/+$/, ""))
        .join("/");
}

export function ensureAndroidCompatible(path:string, forceFilePrefix?:boolean):string {
    if ((forceFilePrefix || Platform.OS === 'android') && !path.startsWith("file")) {
        return "file://" + path
    }
    return path
}


export async function requestAudioPermission() {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permission to use audio recorder',
          message: 'We need your permission to record audio.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can use the recorder');
        return true;
      } else {
        console.log('RECORD_AUDIO permission denied');
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true; // iOS auto-allows if you declared NSMicrophoneUsageDescription
}