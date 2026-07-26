import React from 'react';
import { ImageSourcePropType, Platform } from 'react-native';
import Svg, { G, Rect, Image as SvgImage, Defs, ClipPath, Text as SvgText } from 'react-native-svg';
import { FaceInfo } from './models';
import { ensureAndroidCompatible } from './utils';

interface SvgCubePreviewProps {
    facesInfo: FaceInfo[] | ImageSourcePropType;
    size: number;
}

// ViewBox derived from bounding box of transformed faces (computed for size=100)
// Exact bounding box: x[-29,108] y[-10,93], made square with padding
// Cube bounding box: x[-29,108] y[-10,93]
// Center: x=39.5, y=41.5 — use square viewBox centered on cube with padding
const CX = 39.5, CY = 41.5, HALF = 58;
const VB_X = CX - HALF, VB_Y = CY - HALF, VB_W = HALF * 2, VB_H = HALF * 2;

export function IsoCubePreview({ facesInfo, size }: SvgCubePreviewProps) {
    // All geometry computed at size=100, SVG viewBox scales to fit
    const S = 100;
    const faceSize = S / 2;
    const halfSize = S / 4;

    const imageUri = !Array.isArray(facesInfo)
        ? (facesInfo as any)?.uri as string | undefined
        : undefined;

    const getFaceColor = (index: number): string => {
        if (Array.isArray(facesInfo)) {
            return (facesInfo[index] as FaceInfo)?.backgroundColor ?? '#E7E7E7';
        }
        return '#E7E7E7';
    };

    const getFaceImageUri = (index: number): string | undefined => {
        if (!Array.isArray(facesInfo)) {
            return imageUri;
        }
        const uri = (facesInfo[index] as FaceInfo)?.backgroundUri;
        return uri ? ensureAndroidCompatible(uri, true) : undefined;
    };

    const getFaceText = (index: number) => {
        if (!Array.isArray(facesInfo)) return undefined;
        return (facesInfo[index] as FaceInfo)?.text;
    };

    const faces = [
        { left: S / 2, top: S / 2, rotate: 210, imgDx: -3 * halfSize, imgDy: 0 },
        { left: S / 2, top: S / 2, rotate: -30, imgDx: -halfSize,     imgDy: -2 * halfSize },
        { left: S / 2, top: S / 2, rotate:  90, imgDx: -3 * halfSize, imgDy: -2 * halfSize },
    ];

    return (
        <Svg
            width={size} height={size}
            preserveAspectRatio="xMidYMid meet"
            viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        >
            <Defs>
                {faces.map((_, i) => (
                    <ClipPath key={i} id={`fc${i}`}>
                        <Rect x={0} y={0} width={faceSize} height={faceSize} />
                    </ClipPath>
                ))}
            </Defs>

            {faces.map(({ left, top, rotate, imgDx, imgDy }, index) => {
                const t = `translate(${left},${top}) rotate(${rotate}) skewX(-30) scale(1,0.864)`;
                const faceImgUri = getFaceImageUri(index);
                // For per-face images: fill the whole face rect (0,0,faceSize,faceSize)
                // For single texture (preset): use preset offsets
                const isSingleTexture = !Array.isArray(facesInfo) && !!imageUri;
                return (
                    <G key={index} transform={t} clipPath={`url(#fc${index})`}>
                        <Rect
                            x={0} y={0}
                            width={faceSize} height={faceSize}
                            fill={getFaceColor(index)}
                            stroke="gray" strokeWidth={2}
                        />
                        {faceImgUri && isSingleTexture && (
                            <SvgImage
                                href={{ uri: faceImgUri }}
                                x={imgDx} y={imgDy}
                                width={S * 2} height={S * 2}
                                preserveAspectRatio="xMinYMin meet"
                            />
                        )}
                        {faceImgUri && !isSingleTexture && (
                            <SvgImage
                                href={{ uri: faceImgUri }}
                                x={0} y={0}
                                width={faceSize} height={faceSize}
                                preserveAspectRatio="xMidYMid slice"
                            />
                        )}
                        {!faceImgUri && (() => {
                            const ft = getFaceText(index);
                            if (!ft?.text) return null;
                            return (
                                <SvgText
                                    x={faceSize / 2} y={faceSize / 2}
                                    fontSize={ft.fontSize * 0.6}
                                    fontWeight={ft.fontBold ? 'bold' : 'normal'}
                                    fontFamily={ft.fontName ?? undefined}
                                    fill={ft.color ?? '#000'}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                >{ft.text}</SvgText>
                            );
                        })()}
                    </G>
                );
            })}
        </Svg>
    );
}
