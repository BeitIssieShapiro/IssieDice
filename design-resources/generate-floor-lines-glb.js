/*
 * Generates the floor lines of the spinner scene - a grid of thin flat strips on the floor,
 * so the camera's move from the spinning view to the top view is visible:
 *
 *   node design-resources/generate-floor-lines-glb.js  -> assets/floor-lines.glb
 *
 * Geometry (model units, same as the spinner - its body is 2 wide): the strips lie at y = 0,
 * spanning -GridHalf..GridHalf in x and z, every Spacing units.
 * Material "Lines" is unlit, its color is set at runtime from the table color.
 */
const fs = require("fs");
const path = require("path");

const GridHalf = 30;
const Spacing = 3;
const LineHalfWidth = 0.04;

const pos = [], nrm = [], idx = [];
function quad(x0, z0, x1, z1) {
    const base = pos.length;
    pos.push([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]);
    for (let i = 0; i < 4; i++) nrm.push([0, 1, 0]);
    // counter clockwise when looking from above (+y)
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
}
for (let v = -GridHalf; v <= GridHalf; v += Spacing) {
    quad(v - LineHalfWidth, -GridHalf, v + LineHalfWidth, GridHalf);
    quad(-GridHalf, v - LineHalfWidth, GridHalf, v + LineHalfWidth);
}

// ---- Build GLB ----
const chunks = [];
const bufferViews = [];
const accessors = [];
let offset = 0;

function addBuffer(buf, target) {
    const pad = (4 - (buf.length % 4)) % 4;
    const padded = Buffer.concat([buf, Buffer.alloc(pad)]);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, ...(target ? { target } : {}) });
    chunks.push(padded);
    offset += padded.length;
    return bufferViews.length - 1;
}

function addVec3Accessor(arr) {
    const flat = arr.flat();
    const buf = Buffer.alloc(flat.length * 4);
    flat.forEach((v, i) => buf.writeFloatLE(v, i * 4));
    accessors.push({
        bufferView: addBuffer(buf, 34962), componentType: 5126, count: arr.length, type: "VEC3",
        min: [0, 1, 2].map(k => Math.min(...arr.map(v => v[k]))),
        max: [0, 1, 2].map(k => Math.max(...arr.map(v => v[k]))),
    });
    return accessors.length - 1;
}

function addIndexAccessor(idx) {
    const buf = Buffer.alloc(idx.length * 2);
    idx.forEach((v, i) => buf.writeUInt16LE(v, i * 2));
    accessors.push({ bufferView: addBuffer(buf, 34963), componentType: 5123, count: idx.length, type: "SCALAR" });
    return accessors.length - 1;
}

const gltf = {
    asset: { generator: "IssieDice generate-floor-lines-glb.js", version: "2.0" },
    extensionsUsed: ["KHR_materials_unlit"],
    scene: 0,
    scenes: [{ name: "Scene", nodes: [0] }],
    nodes: [{ mesh: 0, name: "FloorLines" }],
    materials: [
        {
            name: "Lines",
            pbrMetallicRoughness: { baseColorFactor: [0, 0, 0, 1], metallicFactor: 0, roughnessFactor: 1 },
            extensions: { KHR_materials_unlit: {} },
        },
    ],
    meshes: [{
        name: "FloorLines",
        primitives: [{
            attributes: { POSITION: addVec3Accessor(pos), NORMAL: addVec3Accessor(nrm) },
            indices: addIndexAccessor(idx),
            material: 0,
        }],
    }],
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

const out = path.join(__dirname, "../assets/floor-lines.glb");
fs.writeFileSync(out, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
