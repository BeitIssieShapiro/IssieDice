import React, { useEffect } from 'react';
import { ViewProps } from 'react-native';
import { Camera, DefaultLight, EntitySelector, FilamentScene, FilamentView, Float3, Model, useBuffer } from 'react-native-filament';
import { DiceModel } from './diceScene';
import { ensureAndroidCompatible } from './utils';

export function DiePreview({ imageSrc, size, style, autoRotate = false }:
    { imageSrc: string | undefined, style: ViewProps, size: number, autoRotate: boolean }) {
    const [rotate, setRotate] = React.useState<Float3>([.5, .2, 1])

    useEffect(() => {
        if (!autoRotate) return;

        let state = 0
        const intervalobj = setInterval(() => {
            setRotate([state * 0.02, state * 0.02, state * 0.02]);
            state = state == 0 ? 1 : 0
        }, 25);
        return () => clearInterval(intervalobj);
    }, [autoRotate])

    const texture = imageSrc && imageSrc.length > 0 ?
        useBuffer({ source: { uri: ensureAndroidCompatible(imageSrc, true) } }) :
        //undefined:
        undefined;

    return <FilamentScene>
        <FilamentView style={[{ backgroundColor: 'transparent' }, style, { flex: 0, width: size, height: size }]}  >
            <DefaultLight />
            <Model source={DiceModel} rotate={rotate}>
                {texture && <EntitySelector byName="Cube"
                    textureMap={{ materialName: "Material", textureSource: texture }} />}
            </Model>
            <Camera cameraPosition={[0, 2.8, 2.8]} cameraTarget={[0, 0, 0]} />
        </FilamentView>
    </FilamentScene>
}

