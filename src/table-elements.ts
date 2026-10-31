import { Float3 } from "react-native-filament";
import { getAssetLocalPath } from "./assets";

// The table shared by the dice and spinner scenes (see design-resources/generate-floor-glb.js):
// a soft textured floor taking the table's color, and soft shadows of a low light
export const FloorModel = { uri: getAssetLocalPath("floor.glb", true) };
export const ShadowModel = { uri: getAssetLocalPath("shadow.glb", true) };
// the floor's texture repeats every this (model units)
export const FloorTileSize = 8;

// a low light, from 10 o'clock towards 5 o'clock of the screen (when looking down)
const LightElevation = 30 * Math.PI / 180;
const LightClock = 5;                   // the direction the shadow goes, on the clock
const ShadowMargin = 0.4;               // model units - the soft edge around the shadow

export function toLinear(srgb: number[]): [number, number, number, number] {
    const linear = srgb.map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return [linear[0], linear[1], linear[2], 1];
}

/** the 8 corners of a box */
export function boxCorners(halfX: number, halfY: number, halfZ: number): Float3[] {
    return [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => [x * halfX, y * halfY, z * halfZ] as Float3)));
}

/**
 * How far (x, z) on the floor the shadow of a point moves per unit of its height, for a camera
 * looking down with `cameraUp` (the top of the screen) - looking down, screen right is (-up.z, up.x)
 */
export function shadowDirection(cameraUp: Float3): [number, number] {
    const a = LightClock / 12 * 2 * Math.PI;
    const length = 1 / Math.tan(LightElevation);
    return [
        (Math.cos(a) * cameraUp[0] - Math.sin(a) * cameraUp[2]) * length,
        (Math.cos(a) * cameraUp[2] + Math.sin(a) * cameraUp[0]) * length,
    ];
}

/**
 * Where to put the shadow quad (ShadowModel) of an object - its `points` rotated by angle/axis and moved
 * to `pos` - cast on the floor at floorY by a light moving a point's shadow by (dx, dz) per unit of height.
 * Returns [halfX, halfZ, yaw, x, z]: the quad scaled by (halfX, 1, halfZ), turned by yaw around the up axis
 * and moved to (x, floorY, z).
 */
export function shadowPlacement(points: Float3[], angle: number, axis: Float3, pos: Float3,
    floorY: number, dx: number, dz: number): [number, number, number, number, number] {
    "worklet"
    // the points rotated (Rodrigues) and moved along the light down to the floor
    const [kx, ky, kz] = axis;
    const sa = Math.sin(angle), ca = Math.cos(angle);
    const xs: number[] = [], zs: number[] = [];
    let cx = 0, cz = 0;
    for (let i = 0; i < points.length; i++) {
        const [px, py, pz] = points[i];
        const kp = kx * px + ky * py + kz * pz;
        const wx = px * ca + (ky * pz - kz * py) * sa + kx * kp * (1 - ca) + pos[0];
        const wy = py * ca + (kz * px - kx * pz) * sa + ky * kp * (1 - ca) + pos[1];
        const wz = pz * ca + (kx * py - ky * px) * sa + kz * kp * (1 - ca) + pos[2];
        const h = Math.max(0, wy - floorY);
        xs.push(wx + dx * h);
        zs.push(wz + dz * h);
        cx += wx + dx * h;
        cz += wz + dz * h;
    }
    cx /= xs.length;
    cz /= zs.length;
    // the main direction of the points, and their extent along it and across
    let sxx = 0, szz = 0, sxz = 0;
    for (let i = 0; i < xs.length; i++) {
        sxx += (xs[i] - cx) ** 2;
        szz += (zs[i] - cz) ** 2;
        sxz += (xs[i] - cx) * (zs[i] - cz);
    }
    const yaw = 0.5 * Math.atan2(2 * sxz, szz - sxx);  // from +z towards +x
    const ux = Math.sin(yaw), uz = Math.cos(yaw);
    let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
    for (let i = 0; i < xs.length; i++) {
        const u = (xs[i] - cx) * ux + (zs[i] - cz) * uz;
        const v = (xs[i] - cx) * uz - (zs[i] - cz) * ux;
        uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
        vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
    }
    const uc = (uMin + uMax) / 2, vc = (vMin + vMax) / 2;
    // the quad's local z is along (ux, uz), its local x along (uz, -ux)
    return [(vMax - vMin) / 2 + ShadowMargin, (uMax - uMin) / 2 + ShadowMargin, yaw,
        cx + ux * uc + uz * vc, cz + uz * uc - ux * vc];
}
