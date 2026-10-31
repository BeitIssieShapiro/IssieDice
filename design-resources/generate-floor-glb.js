/*
 * Generates the floor of the spinner scene - a plane with a soft felt-like texture,
 * so the camera's move from the spinning view to the top view is visible:
 *
 *   node design-resources/generate-floor-glb.js  -> assets/floor.glb
 *
 * Geometry (model units, same as the spinner - its body is 2 wide): the plane lies at y = 0,
 * spanning -FloorHalf..FloorHalf in x and z; the texture repeats every TileSize units.
 * Material "Floor" is unlit; its texture is nearly white (soft shading and grain), and its
 * color is set at runtime from the table color.
 *
 * Also writes assets/shadow.glb - a soft round shadow under the spinner or a die: a quad spanning
 * -1..1 in x and z (at y = 0), black with a blurred-edge transparency, stretched at runtime to the
 * object's shadow on the floor (see src/table-elements.ts).
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const FloorHalf = 400;
const TileSize = 8;
const TexSize = 256;
const ShadowTexSize = 64;
const ShadowOpacity = 0.4;

// ---- Texture: tileable felt - soft cloudy shading + fine grain, in 0..1 (1 = the table color) ----
let seed = 12345;
function random() { // deterministic, so the file only changes when the design does
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
}

// value noise with `cells` cells per tile, wrapping around (tileable)
function noiseLayer(cells) {
    const grid = Array.from({ length: cells * cells }, () => random());
    const at = (i, j) => grid[((j + cells) % cells) * cells + ((i + cells) % cells)];
    const smooth = (t) => t * t * (3 - 2 * t);
    return (x, y) => { // x, y in 0..1
        const fx = x * cells, fy = y * cells;
        const i = Math.floor(fx), j = Math.floor(fy);
        const tx = smooth(fx - i), ty = smooth(fy - j);
        const a = at(i, j) + (at(i + 1, j) - at(i, j)) * tx;
        const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
        return a + (b - a) * ty;
    };
}
const clouds = [[noiseLayer(4), 0.5], [noiseLayer(8), 0.3], [noiseLayer(16), 0.2]];
const fibers = noiseLayer(64);

const pixels = Buffer.alloc(TexSize * TexSize * 3);
for (let y = 0; y < TexSize; y++) {
    for (let x = 0; x < TexSize; x++) {
        const u = x / TexSize, v = y / TexSize;
        const cloud = clouds.reduce((sum, [layer, weight]) => sum + layer(u, v) * weight, 0);
        const grain = fibers(u, v) * 0.6 + random() * 0.4;
        const value = 1 - 0.07 * cloud - 0.05 * grain;
        const c = Math.round(Math.max(0, Math.min(1, value)) * 255);
        pixels.fill(c, (y * TexSize + x) * 3, (y * TexSize + x) * 3 + 3);
    }
}

function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) {
        c ^= b;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
}
function encodePng(w, h, pixels, channels = 3) {
    const row = w * channels;
    const raw = Buffer.alloc((row + 1) * h);
    for (let y = 0; y < h; y++) pixels.copy(raw, y * (row + 1) + 1, y * row, (y + 1) * row);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = channels == 4 ? 6 : 2; // RGBA / RGB
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        pngChunk("IHDR", ihdr),
        pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
        pngChunk("IEND", Buffer.alloc(0)),
    ]);
}
const png = encodePng(TexSize, TexSize, pixels);

// ---- Shadow texture: black, transparent towards the edge ----
const shadowPixels = Buffer.alloc(ShadowTexSize * ShadowTexSize * 4);
for (let y = 0; y < ShadowTexSize; y++) {
    for (let x = 0; x < ShadowTexSize; x++) {
        const dx = (x + 0.5) / ShadowTexSize * 2 - 1, dy = (y + 0.5) / ShadowTexSize * 2 - 1;
        // full inside half the radius, then fading out smoothly
        const t = Math.max(0, Math.min(1, (1 - Math.hypot(dx, dy)) / 0.5));
        shadowPixels[(y * ShadowTexSize + x) * 4 + 3] = Math.round(ShadowOpacity * t * t * (3 - 2 * t) * 255);
    }
}
const shadowPng = encodePng(ShadowTexSize, ShadowTexSize, shadowPixels, 4);

// ---- GLB with one unlit quad at y = 0, counter clockwise when looking from above (+y) ----
function writeQuadGlb({ file, name, half, uvHalf, uvOffset, png, sampler, material }) {
    const pos = [[-half, 0, -half], [half, 0, -half], [half, 0, half], [-half, 0, half]];
    const nrm = pos.map(() => [0, 1, 0]);
    const uv = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [uvOffset + u * uvHalf, uvOffset + v * uvHalf]);
    const idx = [0, 2, 1, 0, 3, 2];

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

    function addFloatAccessor(arr, type) {
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

    function addIndexAccessor(idx) {
        const buf = Buffer.alloc(idx.length * 2);
        idx.forEach((v, i) => buf.writeUInt16LE(v, i * 2));
        accessors.push({ bufferView: addBuffer(buf, 34963), componentType: 5123, count: idx.length, type: "SCALAR" });
        return accessors.length - 1;
    }

    const primitive = {
        attributes: { POSITION: addFloatAccessor(pos, "VEC3"), NORMAL: addFloatAccessor(nrm, "VEC3"), TEXCOORD_0: addFloatAccessor(uv, "VEC2") },
        indices: addIndexAccessor(idx),
        material: 0,
    };
    const imageView = addBuffer(png);

    const gltf = {
        asset: { generator: "IssieDice generate-floor-glb.js", version: "2.0" },
        extensionsUsed: ["KHR_materials_unlit"],
        scene: 0,
        scenes: [{ name: "Scene", nodes: [0] }],
        nodes: [{ mesh: 0, name }],
        materials: [{
            name,
            pbrMetallicRoughness: { baseColorTexture: { index: 0 }, baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 },
            extensions: { KHR_materials_unlit: {} },
            ...material,
        }],
        meshes: [{ name, primitives: [primitive] }],
        textures: [{ sampler: 0, source: 0 }],
        images: [{ bufferView: imageView, mimeType: "image/png", name }],
        samplers: [sampler],
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

    const out = path.join(__dirname, "../assets", file);
    fs.writeFileSync(out, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
    console.log("written", out, "texture bytes:", png.length);
}

// the texture repeats (10497), linear with mipmaps
writeQuadGlb({
    file: "floor.glb", name: "Floor", half: FloorHalf, uvHalf: FloorHalf / TileSize, uvOffset: 0, png,
    sampler: { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 },
});
// the texture spans the quad once (clamp to edge: 33071)
writeQuadGlb({
    file: "shadow.glb", name: "Shadow", half: 1, uvHalf: 0.5, uvOffset: 0.5, png: shadowPng,
    sampler: { magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 },
    material: { alphaMode: "BLEND" },
});
if (process.argv[2] == "--png") fs.writeFileSync(process.argv[3], png); // to look at the texture

