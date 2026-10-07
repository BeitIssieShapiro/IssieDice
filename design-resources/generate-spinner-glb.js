/*
 * Generates a sevivon (dreidel) model:
 *
 *   node design-resources/generate-spinner-glb.js          -> assets/spinner.glb (classic)
 *   node design-resources/generate-spinner-glb.js rounded  -> assets/spinner-rounded.glb
 *
 * Geometry (model units, Y is the spin axis):
 *   - body: box with half extents 1, centered at the origin
 *   - classic: small shoulder + handle cylinder above the body, up to y = HandleTop;
 *     pyramid below the body, down to y = TipY
 *   - rounded (like the wooden ones): flat top with a thin handle up to y = HandleTop;
 *     below the body a rounded bottom down to y = TipY - its horizontal cuts are squares
 *     whose half size follows a quarter ellipse (see roundedBottomRing in src/scene-elements.ts)
 *
 * The 4 side faces use material "Material" and are UV-mapped to faces 0..3 of
 * the regular dice texture layout (see DiceLayout in src/edit-dice.tsx), so any
 * die texture can be used for the spinner as-is:
 *   face 0 -> +z, face 1 -> +x, face 2 -> -z, face 3 -> -x
 * Images are upright, i.e. image top is towards the handle (+y).
 *
 * All other parts use material "Body" (solid color, no texture).
 *
 * Keep the constants below in sync with src/spinner-scene.tsx.
 */
const fs = require("fs");
const path = require("path");

const Rounded = process.argv[2] == "rounded";

const HandleTop = 2.2;
const ShoulderTop = Rounded ? 1 : 1.25;
const ShoulderHalf = 0.35;
const HandleRadius = Rounded ? 0.14 : 0.18;
const TipY = -2.2;
const TipHalf = 0.06;
const RoundedRings = 12;

// face index -> cell (in a 4x4 grid) of the dice texture layout
const FaceCells = [[1.5, 0], [0.5, 1], [1.5, 1], [2.5, 1]];
const UvInset = 0.115; // half size of the face in UV units (cell half is 0.125)

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(...a); return a.map(x => x / l); }

class Prim {
    constructor() { this.pos = []; this.nrm = []; this.uv = []; this.idx = []; }
    // flat convex polygon with optional per-vertex uvs; winding is fixed to face outwards
    poly(verts, uvs) {
        let n = norm(cross(sub(verts[1], verts[0]), sub(verts[2], verts[0])));
        const c = [0, 1, 2].map(k => verts.reduce((sum, v) => sum + v[k], 0) / verts.length);
        const out = [c[0], c[1] > 1 ? 1 : c[1] < -1 ? -1 : 0, c[2]];
        if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) {
            verts = [...verts].reverse();
            if (uvs) uvs = [...uvs].reverse();
            n = n.map(x => -x);
        }
        const base = this.pos.length;
        verts.forEach((v, i) => {
            this.pos.push(v);
            this.nrm.push(n);
            this.uv.push(uvs ? uvs[i] : [0, 0]);
        });
        for (let i = 1; i < verts.length - 1; i++) this.idx.push(base, base + i, base + i + 1);
    }
    // smooth quad strip (for cylinder sides)
    smoothQuad(verts, normals) {
        const base = this.pos.length;
        verts.forEach((v, i) => { this.pos.push(v); this.nrm.push(normals[i]); this.uv.push([0, 0]); });
        this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // smooth quad, winding fixed to agree with the given normals (may be degenerate: a triangle)
    smoothQuadOriented(verts, normals) {
        const n = cross(sub(verts[2], verts[0]), sub(verts[3], verts[1]));
        const avg = [0, 1, 2].map(k => normals.reduce((sum, v) => sum + v[k], 0));
        if (n[0] * avg[0] + n[1] * avg[1] + n[2] * avg[2] < 0) {
            verts = [...verts].reverse();
            normals = [...normals].reverse();
        }
        this.smoothQuad(verts, normals);
    }
}

const faces = new Prim();
const body = new Prim();

// Side faces: [normal-side corners] listed as top-left, bottom-left, bottom-right, top-right (seen from outside)
const sides = [
    { tl: [-1, 1, 1], right: [1, 0, 0] },   // +z
    { tl: [1, 1, 1], right: [0, 0, -1] },   // +x
    { tl: [1, 1, -1], right: [-1, 0, 0] },  // -z
    { tl: [-1, 1, -1], right: [0, 0, 1] },  // -x
];
sides.forEach((s, i) => {
    const tl = s.tl;
    const bl = [tl[0], -1, tl[2]];
    const br = [bl[0] + 2 * s.right[0], -1, bl[2] + 2 * s.right[2]];
    const tr = [br[0], 1, br[2]];
    const [cx, cy] = FaceCells[i];
    const uc = (cx + 0.5) / 4, vc = (cy + 0.5) / 4;
    const u0 = uc - UvInset, u1 = uc + UvInset, v0 = vc - UvInset, v1 = vc + UvInset;
    faces.poly([tl, bl, br, tr], [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
});

// square ring helper: corners of a square at height y, half size h, CCW from above
const square = (y, h) => [[-h, y, h], [h, y, h], [h, y, -h], [-h, y, -h]];

if (Rounded) {
    body.poly(square(1, 1)); // flat top

    // rounded bottom: square rings at y = -1 - depth * sin(a), half size cos(a)
    const depth = -1 - TipY;
    const ring = (k) => {
        const a = (k / RoundedRings) * Math.PI / 2;
        return { y: -1 - depth * Math.sin(a), h: Math.cos(a), a };
    };
    // outward horizontal direction of each side, in the order of square()'s edges
    const sideDirs = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]];
    // normal of the side surface at the ring with angle a (the profile is an ellipse)
    const normal = (d, a) => norm([d[0] * depth * Math.cos(a), -Math.sin(a), d[2] * depth * Math.cos(a)]);
    for (let k = 0; k < RoundedRings; k++) {
        const r0 = ring(k), r1 = ring(k + 1);
        const q0 = square(r0.y, r0.h), q1 = square(r1.y, r1.h);
        for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4;
            const n0 = normal(sideDirs[i], r0.a), n1 = normal(sideDirs[i], r1.a);
            body.smoothQuadOriented([q0[i], q0[j], q1[j], q1[i]], [n0, n0, n1, n1]);
        }
    }
} else {
    // Shoulder (frustum from body top to the handle base) + its top cap
    const s0 = square(1, 1), s1 = square(ShoulderTop, ShoulderHalf);
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        body.poly([s0[i], s0[j], s1[j], s1[i]]);
    }
    body.poly(s1); // top cap

    // Tip (frustum from body bottom down to a small flat tip)
    const t0 = square(-1, 1), t1 = square(TipY, TipHalf);
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        body.poly([t0[j], t0[i], t1[i], t1[j]]);
    }
    body.poly(t1); // bottom cap
}

// Handle cylinder
const Segs = 16;
for (let i = 0; i < Segs; i++) {
    const a0 = (i / Segs) * 2 * Math.PI, a1 = ((i + 1) / Segs) * 2 * Math.PI;
    const p = (a, y) => [HandleRadius * Math.cos(a), y, -HandleRadius * Math.sin(a)];
    const n = (a) => [Math.cos(a), 0, -Math.sin(a)];
    body.smoothQuad([p(a0, ShoulderTop), p(a1, ShoulderTop), p(a1, HandleTop), p(a0, HandleTop)], [n(a0), n(a1), n(a1), n(a0)]);
}
const capVerts = [];
for (let i = 0; i < Segs; i++) {
    const a = (i / Segs) * 2 * Math.PI;
    capVerts.push([HandleRadius * Math.cos(a), HandleTop, -HandleRadius * Math.sin(a)]);
}
body.poly(capVerts);

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

function addFloatAccessor(arr, type) {
    const flat = arr.flat();
    const buf = Buffer.alloc(flat.length * 4);
    flat.forEach((v, i) => buf.writeFloatLE(v, i * 4));
    const comps = type == "VEC3" ? 3 : 2;
    const acc = { bufferView: addBuffer(buf, 34962), componentType: 5126, count: arr.length, type };
    if (comps == 3) {
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

function primitive(p, material) {
    return {
        attributes: {
            POSITION: addFloatAccessor(p.pos, "VEC3"),
            NORMAL: addFloatAccessor(p.nrm, "VEC3"),
            TEXCOORD_0: addFloatAccessor(p.uv, "VEC2"),
        },
        indices: addIndexAccessor(p.idx),
        material,
    };
}

const primitives = [primitive(faces, 0), primitive(body, 1)];

// Reuse the placeholder texture image embedded in the dice model, so the
// "Material" has a baseColorMap that can later be replaced via textureMap.
const diceGlb = fs.readFileSync(path.join(__dirname, "../assets/dice-empty.glb"));
const diceJsonLen = diceGlb.readUInt32LE(12);
const diceJson = JSON.parse(diceGlb.slice(20, 20 + diceJsonLen).toString());
const diceBin = diceGlb.slice(20 + diceJsonLen + 8);
const imgView = diceJson.bufferViews[diceJson.images[0].bufferView];
const imageView = addBuffer(diceBin.slice(imgView.byteOffset, imgView.byteOffset + imgView.byteLength));

const gltf = {
    asset: { generator: "IssieDice generate-spinner-glb.js", version: "2.0" },
    scene: 0,
    scenes: [{ name: "Scene", nodes: [0] }],
    nodes: [{ mesh: 0, name: "Spinner" }],
    materials: [
        {
            doubleSided: true, name: "Material",
            pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.5 },
        },
        {
            name: "Body",
            pbrMetallicRoughness: { baseColorFactor: [0.85, 0.62, 0.25, 1], metallicFactor: 0, roughnessFactor: 0.45 },
        },
    ],
    meshes: [{ name: "Spinner", primitives }],
    textures: [{ sampler: 0, source: 0 }],
    images: [{ bufferView: imageView, mimeType: diceJson.images[0].mimeType, name: "placeholder" }],
    samplers: [{ magFilter: 9729, minFilter: 9987 }],
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

const out = path.join(__dirname, Rounded ? "../assets/spinner-rounded.glb" : "../assets/spinner.glb");
fs.writeFileSync(out, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
console.log("written", out, "faces vertices:", faces.pos.length, "body vertices:", body.pos.length);
