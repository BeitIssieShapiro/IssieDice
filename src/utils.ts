import { Platform, PermissionsAndroid } from "react-native";
import Quaternion from "quaternion";

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



/**
 * Returns the minimal difference between two angles (in degrees) in the range [-180, 180].
 */
function minimalAngleDiff(current: number, target: number): number {
  let diff = target - current;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

/**
 * Given Euler angles in degrees [rx, ry, rz] (using "XYZ" order),
 * returns an object with:
 *   - face: one of "Top", "Bottom", "Front", "Back", "Right", or "Left",
 *   - delta: a Quaternion representing the minimal rotation that, when applied to the current orientation,
 *            yields the canonical orientation for that face.
 */
export function getFaceAndQuaternionDelta(
  euler: [number, number, number]
): { face: "Top" | "Bottom" | "Front" | "Back" | "Right" | "Left"; delta: Quaternion } {
  const toRad = Math.PI / 180;

  // Create the current orientation quaternion from Euler angles.
  // Using "XYZ" order (adjust if your model uses a different order).
  const currentQuat = Quaternion.fromEuler(euler[0] , euler[1] , euler[2] , "XYZ");

  // Compute the "up" vector by rotating the world up vector [0,1,0] with currentQuat.
  const up = currentQuat.rotateVector([0, 1, 0]); // returns an array [x, y, z]

  // Determine which axis is most aligned with up.
  const absX = Math.abs(up[0]);
  const absY = Math.abs(up[1]);
  const absZ = Math.abs(up[2]);
  let face: "Top" | "Bottom" | "Front" | "Back" | "Right" | "Left";
  if (absY >= absX && absY >= absZ) {
    face = up[1] >= 0 ? "Top" : "Bottom";
  } else if (absX >= absZ) {
    face = up[0] >= 0 ? "Right" : "Left";
  } else {
    face = up[2] >= 0 ? "Front" : "Back";
  }
  return { face, delta: getRotationDeltaForTopFace(face, euler) }
}
/**
 * Given the dice’s original Euler rotation (in degrees) and the detected top face,
 * returns a delta rotation vector [Δx, Δy, Δz] (in degrees) that adjusts only the one axis
 * associated with that face.
 *
 * The targets are defined as follows:
 * - Top: change only roll (Z) to 0°.
 * - Bottom: change only roll to ±180° (whichever is closer).
 * - Front: change only pitch (X) to 90°.
 * - Back: change only pitch to -90°.
 * - Right: change only yaw (Y) to 90°.
 * - Left: change only yaw to -90°.
 */
export function getRotationDeltaForTopFace(
  face: "Top" | "Bottom" | "Front" | "Back" | "Right" | "Left",
  orig: [number, number, number]
): [number, number, number] {
  const [rx, ry, rz] = orig;
  let target: [number, number, number] = [rx, ry, rz];
  switch (face) {
    case "Top": // 4
      // Correct only the roll (Z) to 0°.
      target = [rx, rz > 0 ? rz - 180 : rz + 180, rz];//y should be same as z axis
      break;
    case "Bottom": // 2
      // Correct roll to ±180° (choose the one with minimal difference)
      target = [rx, rz, rz]; //y should be same as z axis
      break;
    case "Front": // 5
      // Correct pitch (X) to 90°.
      target = [rx, 90, rz];
      break;
    case "Back": // 1
      // Correct pitch to -90°.
      target = [rx, -90, rz];
      break;
    case "Right": // 6
      // Correct yaw (Y) to 90°.
      target = [0, ry, rz];
      break;
    case "Left": // 3
      // Correct yaw (Y) to -90°.
      target = [180, ry, rz];
      break;
    default:
      target = [rx, ry, rz];
  }
  return [
    minimalAngleDiff(rx, target[0]),
    minimalAngleDiff(ry, target[1]),
    minimalAngleDiff(rz, target[2])
  ];
}



/**
 * Computes the axis-aligned visible bounds on the floor given the camera parameters.
 * 
 * @param currWindowSize - the screen size in pixels, e.g. { width: number, height: number }
 * @param cameraHeight - the vertical distance from the camera to the floor (e.g. 20)
 * @param fov - the camera's vertical field-of-view in radians (e.g. 45° = Math.PI/4)
 * @param rotation - the camera's rotation around the vertical axis in radians.
 *                   (If the camera rotates, the visible rectangle rotates; we return the AABB.)
 * @returns An object with the horizontal boundaries on the floor:
 *          left/right correspond to X, and bottom/top correspond to Z.
 */
export function computeFloorBounds(
  currWindowSize: { width: number; height: number },
  cameraHeight: number,
  fov: number,
  rotation: number
): { left: number; right: number; bottom: number; top: number } {
  // Compute the aspect ratio (width / height)
  const aspect = currWindowSize.width / currWindowSize.height;
  
  // The half-height (in world units) of the visible region on the floor (assuming the camera looks straight down)
  const halfHeight = cameraHeight * Math.tan(fov / 2);
  // The half-width in world units
  const halfWidth = halfHeight * aspect;
  
  // Without any rotation, the visible floor region would be:
  // x in [-halfWidth, halfWidth] and z in [-halfHeight, halfHeight].
  // If the scene is rotated by 'rotation' (about the vertical axis),
  // the axis-aligned bounding box of the rotated rectangle becomes:
  const cosTheta = Math.abs(Math.cos(rotation));
  const sinTheta = Math.abs(Math.sin(rotation));
  
  const boundX = halfWidth * cosTheta + halfHeight * sinTheta;
  const boundZ = halfWidth * sinTheta + halfHeight * cosTheta;
  
  return {
    left: -boundX,
    right: boundX,
    bottom: -boundZ,
    top: boundZ,
  };
}

/**
 * Computes the vertical field-of-view (in radians) from a focal length and sensor height.
 *
 * @param focalLength - Focal length in millimeters.
 * @param sensorHeight - Sensor height in millimeters (default is 24mm).
 * @returns vertical FOV in radians.
 */
export function computeVerticalFov(focalLength: number, sensorHeight: number = 24): number {
  return 2 * Math.atan((sensorHeight / 2) / focalLength);
}