import { Platform, PermissionsAndroid } from "react-native";
import Quaternion from "quaternion";
import { defaultFloorColor } from "./color-picker";
import * as CANNON from "cannon-es";

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




/**
 * Returns the minimal difference between two angles (in degrees) in the range [-180, 180].
 */
function minimalAngleDiff(current: number, target: number): number {
  let diff = target - current;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

type Face = -1 | 1 | 2 | 3 | 4 | 5 | 6




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

export function safeColor(color: string | undefined | null): string {
  if (!color || !color.startsWith("#")) return defaultFloorColor;
  return color
}


export function getTopFace(body: CANNON.Body): { face: Face, euler: CANNON.Vec3 } {
  const euler = new CANNON.Vec3();
  body.quaternion.toEuler(euler);

  const eps = .1;
  let isZero = (angle: number) => Math.abs(angle) < eps;
  let isHalfPi = (angle: number) => Math.abs(angle - .5 * Math.PI) < eps;
  let isMinusHalfPi = (angle: number) => Math.abs(.5 * Math.PI + angle) < eps;
  let isPiOrMinusPi = (angle: number) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);

  let result: Face = -1;
  if (isZero(euler.z)) {
    if (isZero(euler.x)) {
      result = 4;
    } else if (isHalfPi(euler.x)) {
      result = 5;
    } else if (isMinusHalfPi(euler.x)) {
      result = 1;
    } else if (isPiOrMinusPi(euler.x)) {
      result = 2;
    } else {
      // landed on edge => wait to fall on side and fire the event again
      body.allowSleep = true;
    }
  } else if (isHalfPi(euler.z)) {
    result = 3;
  } else if (isMinusHalfPi(euler.z)) {
    result = 6;
  } else {
    // landed on edge => wait to fall on side and fire the event again
    body.allowSleep = true;
  }

  return { face: result, euler };
}

// A simple ease-in-out quadratic function.
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function animateYaw(body: CANNON.Body, x: number, z: number, startYaw: number, targetYaw: number, duration: number = 300) {
  // Extract the current Euler angles in "YZX" order.

  const deltaYaw = minimalAngleDiff(startYaw, targetYaw);
  const startTime = Date.now();

  function update() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1); // t in [0,1]
    const easedT = easeInOutQuad(t);
    const newYaw = startYaw + deltaYaw * easedT;

    // Update the body's orientation using the constant pitch (x) and roll (z), and the new yaw.
    body.quaternion.setFromEuler(x, newYaw, z, "YZX");

    if (t < 1) {
      setTimeout(update, 16); // roughly 60 FPS
    }
  }
  update();
}


export function hexToSrgb(hex: string): [number, number, number, number] {
  // Remove the hash symbol if present
  hex = hex.replace(/^#/, '');
  // Handle short form (#abc -> #aabbcc)
  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('');
  }
  // Parse the hex string into an integer
  const intVal = parseInt(hex, 16);
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return [r / 255, g / 255, b / 255, 1];
}

export function darkenHexColor(hex: string, factor: number): string {
  // Remove the hash if present.
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.floor(r * factor);
  g = Math.floor(g * factor);
  b = Math.floor(b * factor);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}