/*
 * Generates the spinner scene's backdrop - a photo studio's cove, so the side view looks like a room:
 *
 *   node design-resources/generate-backdrop-glb.js  -> assets/backdrop.glb
 *
 * Model units (same as the spinner - its body is 2 wide), centered on the camera's target, the camera
 * looking towards +z. Both primitives are unlit, take the table's color at runtime (baseColorFactor), and
 * have it darkened by their vertex colors:
 *  - "Fade" (blended, at y = 0, just above the floor): clear around the center, turning into the backdrop's
 *    color further away - like a pool of light on the floor, with no horizon.
 *  - "Wall" (opaque): behind the center (+z), curving up from the floor into a wall, darker towards its top
 *    and sides.
 */
const fs = require("fs");
const path = require("path");

const LitRadius = 7;        // the floor is fully lit up to here
const WallDistance = 18;    // the wall starts curving up from the floor here
const CoveRadius = 5;       // the curve from the floor up to the wall
const WallHeight = 60;
const WallSpan = 75 * Math.PI / 180;   // to each side of +z
const FarRadius = 400;      // the floor's size
const Segments = 96;        // around
const BaseShade = 0.6;      // the backdrop's color (times the table's color) at the floor
const TopShade = 0.35;      // ... at the wall's top
const SideShade = 0.7;      // ... times this at the wall's sides

const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
// darker away from the back (+z): angle from +z
const sideShade = (a) => 1 - (1 - SideShade) * smooth(Math.abs(a) / WallSpan);

// ---- Fade: rings around the center ----
function fade() {
    const radii = [0, LitRadius];
    for (let i = 1; i <= 12; i++) radii.push(LitRadius + (WallDistance - LitRadius) * i / 12);
    radii.push(WallDistance + CoveRadius, 60, FarRadius);
    const pos = [], col = [], idx = [];
    radii.forEach(r => {
        for (let k = 0; k <= Segments; k++) {
            const a = (k / Segments * 2 - 1) * Math.PI;
            pos.push([Math.sin(a) * r, 0, Math.cos(a) * r]);
            const s = BaseShade * sideShade(a);
            col.push([s, s, s, smooth((r - LitRadius) / (WallDistance - LitRadius))]);
        }
    });
    const row = Segments + 1;
    for (let i = 0; i + 1 < radii.length; i++) {
        for (let k = 0; k < Segments; k++) {
            const a = i * row + k, b = a + 1, c = a + row, d = c + 1;
            idx.push(a, c, b, b, c, d);
        }
    }
    return { pos, col, idx };
}

// ---- Wall: a quarter circle up from the floor, then straight up ----
function wall() {
    const profile = []; // [distance from the center, height]
    for (let i = 0; i <= 12; i++) {
        const t = i / 12 * Math.PI / 2;
        profile.push([WallDistance + Math.sin(t) * CoveRadius, (1 - Math.cos(t)) * CoveRadius]);
    }
    [10, 20, WallHeight].forEach(h => profile.push([WallDistance + CoveRadius, h]));
    const segs = Math.round(Segments * WallSpan / Math.PI);
    const pos = [], col = [], idx = [];
    profile.forEach(([r, h]) => {
        for (let k = 0; k <= 2 * segs; k++) {
            const a = (k / segs - 1) * WallSpan;
            pos.push([Math.sin(a) * r, h, Math.cos(a) * r]);
            const s = (BaseShade + (TopShade - BaseShade) * smooth(h / 20)) * sideShade(a);
            col.push([s, s, s, 1]);
        }
    });
    const row = 2 * segs + 1;
    for (let i = 0; i + 1 < profile.length; i++) {
        for (let k = 0; k < 2 * segs; k++) {
            const a = i * row + k, b = a + 1, c = a + row, d = c + 1;
            idx.push(a, b, c, b, d, c);
        }
    }
    return { pos, col, idx };
}

// ---- GLB ----
const chunks = [], bufferViews = [], accessors = [];
let offset = 0;
function addBuffer(buf, target) {
    const pad = (4 - (buf.length % 4)) % 4;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, target });
    chunks.push(Buffer.concat([buf, Buffer.alloc(pad)]));
    offset += buf.length + pad;
    return bufferViews.length - 1;
}
function addFloats(arr, type) {
    const flat = arr.flat();
    const buf = Buffer.alloc(flat.length * 4);
    flat.forEach((v, i) => buf.writeFloatLE(v, i * 4));
    const acc = { bufferView: addBuffer(buf, 34962), componentType: 5126, count: arr.length, type };
    if (type == "VEC3") {
        acc.min = [0, 1, 2].map(k => Math.min(...arr.map(v => v[k])));
        acc.max = [0, 1, 2].map(k => Math.max(...arr.map(v => v[k])));
    }
    accessors.push(acc);
    return accessors.length - 1;
}
function addIndices(idx) {
    const buf = Buffer.alloc(idx.length * 4);
    idx.forEach((v, i) => buf.writeUInt32LE(v, i * 4));
    accessors.push({ bufferView: addBuffer(buf, 34963), componentType: 5125, count: idx.length, type: "SCALAR" });
    return accessors.length - 1;
}
function primitive({ pos, col, idx }, material) {
    return {
        attributes: { POSITION: addFloats(pos, "VEC3"), NORMAL: addFloats(pos.map(() => [0, 1, 0]), "VEC3"), COLOR_0: addFloats(col, "VEC4") },
        indices: addIndices(idx),
        material,
    };
}

const material = (name, extra) => ({
    name,
    pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 },
    extensions: { KHR_materials_unlit: {} },
    doubleSided: true,
    ...extra,
});
const gltf = {
    asset: { generator: "IssieDice generate-backdrop-glb.js", version: "2.0" },
    extensionsUsed: ["KHR_materials_unlit"],
    scene: 0,
    scenes: [{ name: "Scene", nodes: [0] }],
    nodes: [{ mesh: 0, name: "Backdrop" }],
    materials: [material("Fade", { alphaMode: "BLEND" }), material("Wall")],
    meshes: [{ name: "Backdrop", primitives: [primitive(fade(), 0), primitive(wall(), 1)] }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
};

let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const bin = Buffer.concat(chunks);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(json.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(bin.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);

const out = path.join(__dirname, "../assets/backdrop.glb");
fs.writeFileSync(out, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
console.log("written", out, "bytes:", 12 + 8 + json.length + 8 + bin.length);
