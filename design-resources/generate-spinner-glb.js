/*
 * Generates a sevivon (dreidel) model:
 *
 *   node design-resources/generate-spinner-glb.js  -> assets/spinner.glb
 *
 * Geometry (model units, Y is the spin axis):
 *   - body: box with half extents 1, centered at the origin
 *   - soft (beveled) edges everywhere - flat top with a handle with a domed top up to
 *     y = HandleTop; pyramid below the body with a rounded tip whose lowest point is y = TipY.
 *     Only the flat part of each side face is textured (see beveledBody())
 *
 * The 4 side faces use material "Material" and are UV-mapped to faces 0..3 of
 * the regular dice texture layout (see DiceLayout in src/edit-dice.tsx), so any
 * die texture can be used for the spinner as-is:
 *   face 0 -> +z, face 1 -> +x, face 2 -> -z, face 3 -> -x
 * Images are upright, i.e. image top is towards the handle (+y).
 *
 * The handle uses material "Handle", all other parts use material "Body" (solid colors, no texture),
 * so the app can color each.
 *
 * Keep the constants below in sync with src/scene-elements.ts.
 */
const fs = require("fs");
const path = require("path");

const HandleTop = 1.9;
const ShoulderTop = 1;
const HandleRadius = 0.2;
const TipY = -1.6;
// soft edges
const Corner = 0.25;     // radius of the vertical edges (horizontal cuts are rounded squares)
const BevelTop = 0.25;   // radius of the edge between the top and the sides
const BevelBottom = 0.6;  // radius of the edge between the sides and the pyramid
const BevelTip = 0.12;   // radius of the tip
const TipCorner = 0.04;   // where the pyramid would meet the floor, if its tip were not rounded
const ProfileArcSteps = 8;
const CornerSteps = 6;

// face index -> cell (in a 4x4 grid) of the dice texture layout
const FaceCells = [[1.5, 0], [0.5, 1], [1.5, 1], [2.5, 1]];
const UvInset = 0.115; // half size of the face in UV units (cell half is 0.125)

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(...a); return a.map(x => x / l); }
function sub2(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function norm2(a) { const l = Math.hypot(...a); return [a[0] / l, a[1] / l]; }

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
const handle = new Prim();

beveledBody();

/*
 * Spinner with soft (beveled) edges: a sweep whose horizontal cuts are rounded squares,
 * with half size r(s) along a 2D profile (r, y) whose corners are rounded with fillet arcs:
 * flat top -> body side -> pyramid -> rounded tip. The flat part of each side face is textured.
 */
function beveledBody() {
    const lines = [[0, 1], [1, 1], [1, -1], [TipCorner, TipY], [0, TipY]];
    const fillets = [BevelTop, BevelBottom, BevelTip]; // radius at lines[1..3]

    // profile segments: { kind: "line", a, b } or { kind: "arc", c, r, a0, a1 }
    const segs = [];
    let prev = lines[0];
    for (let i = 1; i < lines.length - 1; i++) {
        const p = lines[i], d0 = norm2(sub2(p, lines[i - 1])), d1 = norm2(sub2(lines[i + 1], p));
        const turn = Math.acos(Math.max(-1, Math.min(1, d0[0] * d1[0] + d0[1] * d1[1])));
        const t = fillets[i - 1] * Math.tan(turn / 2); // distance from the corner to the tangent points
        const p0 = [p[0] - d0[0] * t, p[1] - d0[1] * t], p1 = [p[0] + d1[0] * t, p[1] + d1[1] * t];
        // the profile turns clockwise (in r, y) at every corner, so the center is to the right of d0
        const c = [p0[0] + d0[1] * fillets[i - 1], p0[1] - d0[0] * fillets[i - 1]];
        segs.push({ kind: "line", a: prev, b: p0, panel: i == 2 });
        let a0 = Math.atan2(p0[1] - c[1], p0[0] - c[0]), a1 = Math.atan2(p1[1] - c[1], p1[0] - c[0]);
        if (a1 > a0) a1 -= 2 * Math.PI;
        segs.push({ kind: "arc", c, r: fillets[i - 1], a0, a1 });
        prev = p1;
    }
    segs.push({ kind: "line", a: prev, b: lines[lines.length - 1] });

    // profile samples (r, y); panelRow is the row from the body side's straight part top to its bottom
    const profile = [];
    let panelRow = -1;
    segs.forEach((g, gi) => {
        if (g.panel) panelRow = profile.length - 1;
        const n = g.kind == "arc" ? ProfileArcSteps : g.a[0] == 0 || g.b[0] == 0 ? 3 : 1;
        for (let k = gi == 0 ? 0 : 1; k <= n; k++) {
            const f = k / n;
            profile.push(g.kind == "arc" ?
                { r: g.c[0] + g.r * Math.cos(g.a0 + (g.a1 - g.a0) * f), y: g.c[1] + g.r * Math.sin(g.a0 + (g.a1 - g.a0) * f) } :
                { r: g.a[0] + (g.b[0] - g.a[0]) * f, y: g.a[1] + (g.b[1] - g.a[1]) * f });
        }
    });

    // cross section: rounded square; below the body its corners get rounder towards the tip
    // (the bottom turns into a cone), and the corner radius shrinks with r on the top
    const cornerOf = (r, y) => {
        const f = Math.max(0, Math.min(1, (-1 - y) / (-1 - TipY)));
        return Math.min(r * 0.6, Corner) + (r - Math.min(r * 0.6, Corner)) * Math.pow(f, 0.6);
    };
    // per side: start of the straight edge, end of it, then the corner arc; side i faces sideDirs[i]
    const sideDirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // (x, z)
    const cross2 = (i, k, r, y) => { // k: 0..CornerSteps+1 within side i
        const rc = cornerOf(r, y), d = sideDirs[i], e = [d[1], -d[0]]; // e: along the side, towards the next side
        const inner = r - rc;
        if (k <= 1) {
            const s = k == 0 ? -inner : inner;
            return { p: [d[0] * r + e[0] * s, d[1] * r + e[1] * s], m: d };
        }
        const a = ((k - 1) / CornerSteps) * Math.PI / 2;
        const m = [d[0] * Math.cos(a) + e[0] * Math.sin(a), d[1] * Math.cos(a) + e[1] * Math.sin(a)];
        return { p: [(d[0] + e[0]) * inner + m[0] * rc, (d[1] + e[1]) * inner + m[1] * rc], m };
    };
    const ringCols = [];
    for (let i = 0; i < 4; i++) for (let k = 0; k <= CornerSteps; k++) ringCols.push([i, k]); // k == CornerSteps + 1 is the next side's start
    const point = (row, col) => {
        const { r, y } = profile[row];
        const [i, k] = ringCols[col % ringCols.length];
        const c = cross2(i, k, r, y);
        return [c.p[0], y, c.p[1]];
    };

    // normals: from neighbouring grid points (central differences), +-y on the axis
    const normal = (row, col) => {
        const n = ringCols.length;
        const pu = point(Math.max(0, row - 1), col), pd = point(Math.min(profile.length - 1, row + 1), col);
        const pl = point(row, (col + n - 1) % n), pr = point(row, (col + 1) % n);
        let v = cross(sub(pd, pu), sub(pr, pl));
        if (Math.hypot(...v) < 1e-9 || profile[row].r < 1e-6) return [0, profile[row].y > 0 ? 1 : -1, 0];
        v = norm(v);
        // straight edges: exact side normals, so the panels are flat
        const [i, k] = ringCols[col % n];
        const m = cross2(i, k, profile[row].r, profile[row].y).m;
        return k == 0 || k == 1 ? norm([m[0] * Math.hypot(v[0], v[2]), v[1], m[1] * Math.hypot(v[0], v[2])]) : v;
    };
    const n = ringCols.length;
    for (let row = 0; row < profile.length - 1; row++) {
        for (let col = 0; col < n; col++) {
            const quad = [[row, col], [row, (col + 1) % n], [row + 1, (col + 1) % n], [row + 1, col]];
            const verts = quad.map(([r, c]) => point(r, c)), nrms = quad.map(([r, c]) => normal(r, c));
            const [side, k] = ringCols[col];
            if (row == panelRow && k == 0) {
                // flat textured panel: image top towards the handle
                const [cx, cy] = FaceCells[side];
                const uc = (cx + 0.5) / 4, vc = (cy + 0.5) / 4;
                const u0 = uc - UvInset, u1 = uc + UvInset, v0 = vc - UvInset, v1 = vc + UvInset;
                faces.poly(verts, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
            } else {
                body.smoothQuadOriented(verts, nrms);
            }
        }
    }
}

// Handle: cylinder with a dome on top
const Segs = 16;
const DomeRings = 5;
const CylinderTop = HandleTop - HandleRadius;
const handleRing = (k) => { // k = 0 is the cylinder's bottom, 1 its top, then the dome's rings
    if (k == 0) return { y: ShoulderTop, r: HandleRadius, ny: 0 };
    const a = ((k - 1) / DomeRings) * Math.PI / 2;
    return { y: CylinderTop + HandleRadius * Math.sin(a), r: HandleRadius * Math.cos(a), ny: Math.sin(a) };
};
for (let k = 0; k <= DomeRings; k++) {
    const r0 = handleRing(k), r1 = handleRing(k + 1);
    for (let i = 0; i < Segs; i++) {
        const a0 = (i / Segs) * 2 * Math.PI, a1 = ((i + 1) / Segs) * 2 * Math.PI;
        const p = (a, q) => [q.r * Math.cos(a), q.y, -q.r * Math.sin(a)];
        const n = (a, q) => { const h = Math.sqrt(1 - q.ny * q.ny); return [h * Math.cos(a), q.ny, -h * Math.sin(a)]; };
        handle.smoothQuad([p(a0, r0), p(a1, r0), p(a1, r1), p(a0, r1)], [n(a0, r0), n(a1, r0), n(a1, r1), n(a0, r1)]);
    }
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

const primitives = [primitive(faces, 0), primitive(body, 1), primitive(handle, 2)];

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
        {
            name: "Handle",
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

const out = path.join(__dirname, "../assets/spinner.glb");
fs.writeFileSync(out, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
console.log("written", out, "faces vertices:", faces.pos.length, "body vertices:", body.pos.length, "handle vertices:", handle.pos.length);
