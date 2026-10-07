import React from 'react';
import { ImageSourcePropType } from 'react-native';
import Svg, { G, Rect, Polygon, Image as SvgImage, Defs, ClipPath, Text as SvgText } from 'react-native-svg';
import { FaceInfo, SpinnerShape } from './models';
import { ensureAndroidCompatible } from './utils';
import { DefaultFaceBackgroundColor, FontFactor } from './edit-dice';
import { roundedBottomRing } from './scene-elements';

interface SpinnerPreviewProps {
    facesInfo: FaceInfo[] | ImageSourcePropType;
    size: number;
    shape?: SpinnerShape;
}

// Model dimensions - same as design-resources/generate-spinner-glb.js (body half size is 1)
const TipY = -2.2;
const HandleTop = 2.2;
const HandleRadius = 0.18;
const RoundedHandleRadius = 0.14;
const RoundedRings = 8;

// Isometric projection, looking from the corner between the +z (face 0) and +x (face 1) faces
const Unit = 25;
const Cos30 = Math.cos(Math.PI / 6);
const Elevation = 0.3; // lower than true isometric (0.5), so the tip is visible
function project(x: number, y: number, z: number): [number, number] {
    return [(x - z) * Cos30 * Unit, (-y + (x + z) * Elevation) * Unit];
}
function points(...pts: [number, number, number][]) {
    return pts.map(p => project(...p).join(",")).join(" ");
}

// face cells (in a 4x4 grid) of the texture layout (see DiceLayout in edit-dice.tsx)
const FaceCells = [[1.5, 0], [0.5, 1]];

// visible side faces: top-left corner, and the right/down edge vectors (in model units)
const VisibleFaces = [
    { index: 0, topLeft: [-1, 1, 1], right: [2, 0, 0] },   // +z
    { index: 1, topLeft: [1, 1, 1], right: [0, 0, -2] },   // +x
];

const FaceUnits = 100; // a face is drawn in a 100x100 local coordinate system

const BodyColor = "#D99E40";
const BodyColorDark = "#B07A25";
const BodyColorLight = "#EBBD6A";

/**
 * A static 2D preview of the spinner (sevivon) showing faces 1 and 2.
 */
export function SpinnerPreview({ facesInfo, size, shape }: SpinnerPreviewProps) {
    const singleImageUri = !Array.isArray(facesInfo) ? (facesInfo as any)?.uri as string | undefined : undefined;
    const faces = Array.isArray(facesInfo) ? facesInfo as FaceInfo[] : undefined;

    const handleBase = project(0, 1.1, 0);
    const handleTopPt = project(0, HandleTop, 0);
    const handleWidth = 2 * (shape == "rounded" ? RoundedHandleRadius : HandleRadius) * Unit;

    // the rounded bottom of the 2 visible sides: down the left edge to the tip, and back up the right edge
    const rings = Array.from({ length: RoundedRings + 1 }, (_, k) => roundedBottomRing(k, RoundedRings));
    const roundedSide = (edge: (h: number) => [[number, number], [number, number]]) => [
        ...rings.map(({ y, h }) => [edge(h)[0][0], y, edge(h)[0][1]] as [number, number, number]),
        ...rings.slice().reverse().map(({ y, h }) => [edge(h)[1][0], y, edge(h)[1][1]] as [number, number, number]),
    ];

    return (
        <Svg width={size} height={size} viewBox="-57 -57 114 114">
            <Defs>
                <ClipPath id="spinnerFaceClip">
                    <Rect x={0} y={0} width={FaceUnits} height={FaceUnits} />
                </ClipPath>
            </Defs>

            {/* tip */}
            {shape == "rounded" ? <>
                <Polygon points={points(...roundedSide(h => [[-h, h], [h, h]]))} fill={BodyColor} />
                <Polygon points={points(...roundedSide(h => [[h, h], [h, -h]]))} fill={BodyColorDark} />
            </> : <>
                <Polygon points={points([-1, -1, 1], [1, -1, 1], [0, TipY, 0])} fill={BodyColor} />
                <Polygon points={points([1, -1, 1], [1, -1, -1], [0, TipY, 0])} fill={BodyColorDark} />
            </>}

            {/* top */}
            <Polygon points={points([-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1])} fill={BodyColorLight} />

            {/* handle */}
            <Rect x={handleTopPt[0] - handleWidth / 2} y={handleTopPt[1]}
                width={handleWidth} height={handleBase[1] - handleTopPt[1]}
                rx={handleWidth / 2} fill={BodyColorDark} />

            {/* side faces */}
            {VisibleFaces.map(({ index, topLeft, right }) => {
                const [ox, oy] = project(topLeft[0], topLeft[1], topLeft[2]);
                const [rx, ry] = project(topLeft[0] + right[0], topLeft[1], topLeft[2] + right[2]);
                const [dx, dy] = project(topLeft[0], topLeft[1] - 2, topLeft[2]);
                const matrix = [
                    (rx - ox) / FaceUnits, (ry - oy) / FaceUnits,
                    (dx - ox) / FaceUnits, (dy - oy) / FaceUnits,
                    ox, oy,
                ].join(" ");

                const face = faces?.[index];
                const faceImageUri = face?.backgroundUri ? ensureAndroidCompatible(face.backgroundUri, true) : undefined;
                const [cx, cy] = FaceCells[index];

                return (
                    <G key={index} transform={`matrix(${matrix})`} clipPath="url(#spinnerFaceClip)">
                        <Rect x={0} y={0} width={FaceUnits} height={FaceUnits}
                            fill={face?.backgroundColor || DefaultFaceBackgroundColor}
                            stroke="gray" strokeWidth={3} />
                        {singleImageUri && (
                            // the whole texture, positioned so the face's cell fills the face
                            <SvgImage href={{ uri: singleImageUri }}
                                x={-cx * FaceUnits} y={-cy * FaceUnits}
                                width={4 * FaceUnits} height={4 * FaceUnits}
                                preserveAspectRatio="none" />
                        )}
                        {faceImageUri && (
                            <SvgImage href={{ uri: faceImageUri }}
                                x={0} y={0} width={FaceUnits} height={FaceUnits}
                                preserveAspectRatio="xMidYMid slice" />
                        )}
                        {!faceImageUri && face?.text?.text ? (
                            <SvgText
                                x={FaceUnits / 2} y={FaceUnits / 2}
                                fontSize={face.text.fontSize * FontFactor * FaceUnits / 150}
                                fontWeight={face.text.fontBold ? 'bold' : 'normal'}
                                fontFamily={face.text.fontName ?? undefined}
                                fill={face.text.color ?? '#000'}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                            >{face.text.text}</SvgText>
                        ) : null}
                    </G>
                );
            })}
        </Svg>
    );
}
