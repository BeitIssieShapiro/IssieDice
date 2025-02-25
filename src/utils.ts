import { Platform, PermissionsAndroid } from "react-native";
import { useEffect, useState } from "react";
import { Viro3DPoint } from "@reactvision/react-viro/dist/components/Types/ViroUtils";

export function joinPaths(...segments: string[]) {
  return segments
    .map((seg) => seg.replace(/\/+$/, ""))
    .join("/");
}

export function ensureAndroidCompatible(path: string, forceFilePrefix?: boolean): string {
  if ((forceFilePrefix || Platform.OS === 'android') && !path.startsWith("file")) {
    return "file://" + path
  }
  return path
}

export interface WinSize {
  width: number;
  height: number;
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

export const ignore = () => { };

export const isSamePoint = (p1: Viro3DPoint, p2: Viro3DPoint) => p1[0] == p2[0] && p1[1] == p2[1] && p1[1] == p2[1];
const normalizeRotation = (n: number) => {
  const approx = (targetNum: number): boolean => n <= targetNum + .01 && n >= targetNum - .01;


  if (approx(-180) || approx(0)) {
    return "0";
  }
  if (approx(-90)) return "-90";
  if (approx(90)) return "90";
  if (approx(180)) return "180"
  return "X";
}


const faceMap: { [key: string]: number } = {
  "X|0|-90": 0,
  "0|X|0": 1,
  "-90|X|0": 2,
  "90|X|0": 3,
  "0|X|180": 4,
  "X|0|90": 5
}
// export const getFaceIndex = (r: Viro3DPoint): number => {
//   const key = normalizeRotation(r[0]) + "|" + normalizeRotation(r[1]) + "|" + normalizeRotation(r[2]);
//   console.log("getFaceIndex", key)
//   return faceMap[key] as number;
// }

// Determines which face is facing upwards based on the rotation values
//export const getFaceIndex = (rotation: [number, number, number]): number => {
/**
 * Given Euler angles [rx, ry, rz] in degrees (using an "XYZ" rotation order),
 * this function computes the effective "up" vector (the result of rotating [0,1,0])
 * and returns which face is most aligned with up.
 *
 * It assumes that when no rotation is applied the "Top" face is up.
 */
export function getFaceIndex(euler: [number, number, number]): string {
  // Convert degrees to radians.
  const [rx, ry, rz] = euler.map(deg => (deg * Math.PI) / 180);

  // Compute sine and cosine values.
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

  // For an "XYZ" rotation, the combined rotation matrix R = Rz * Ry * Rx,
  // and the rotated up vector v' = R * [0, 1, 0] is given by the second column of R.
  // The formula for that (derived from Three.js's Euler conversion) is:
  //    up_x = -cosY * sinZ
  //    up_y = cosX * cosZ - sinX * sinY * sinZ
  //    up_z = sinX * cosZ + cosX * sinY * sinZ
  const upX = -cosY * sinZ;
  const upY = cosX * cosZ - sinX * sinY * sinZ;
  const upZ = sinX * cosZ + cosX * sinY * sinZ;

  // Determine which component (X, Y, or Z) has the greatest absolute value.
  const absX = Math.abs(upX);
  const absY = Math.abs(upY);
  const absZ = Math.abs(upZ);

  if (absY >= absX && absY >= absZ) {
    return upY >= 0 ? "Top" : "Bottom";
  } else if (absX >= absZ) {
    return upX >= 0 ? "Right" : "Left";
  } else {
    return upZ >= 0 ? "Front" : "Back";
  }
}

/**
 * Returns a rotation correction (as an [x, y, z] Euler in degrees) so that the face that’s up
 * will be oriented similarly to the default “Top” orientation.
 *
 * These correction values are heuristic and depend on the dice’s model.
 */
export function getRotationCorrectionForTopFace(topFace: "Top" | "Bottom" | "Front" | "Back" | "Right" | "Left",
  origRotation: [number, number, number]
): [number, number, number] {
  switch (topFace) {
    case "Top": //4
      return [origRotation[0], 0, origRotation[2]];
    case "Bottom": //2
      return [origRotation[0], 180, origRotation[2]];
    case "Front": //5
      return [origRotation[0], 90, origRotation[2]];
    case "Back": //1
      return [origRotation[0], -90, origRotation[2]];
    case "Right": //6
      return [0, origRotation[1], origRotation[2]];
    case "Left": //3
      return [-180, origRotation[1], origRotation[2]];

    default:
      return [0, 0, 0];
  }
}
