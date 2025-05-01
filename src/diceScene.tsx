import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { GestureResponderEvent, LogBox, Text, View } from "react-native";
import {
    FilamentView,
    DefaultLight,
    Camera,
    Float3,
    RenderCallback,
    useFilamentContext,
    useModel,
    ModelRenderer,
    getAssetFromModel,
    useBuffer,
    useDisposableResource,
    useWorkletCallback,
    useWorkletMemo,
    useEntityInScene,
    FilamentModel,
    EntitySelector,
    Float4
} from "react-native-filament";

import * as CANNON from "cannon-es";
import { useSharedValue } from "react-native-worklets-core"
import { Dice, Profile, Templates, templatesList } from "./models";
import { animateYaw, computeFloorBounds, computeVerticalFov, darkenHexColor, getTopFace, hexToSrgb, safeColor, WinSize } from "./utils";
import { createDieShape, createFloor, createWall } from "./scene-elements";
import { playAudio, playBundledAudio, Sounds } from "./audio";


const DiceModel = require("../assets/dice-empty.glb");
//const FloorModel = require("../assets/floor.glb");
const TransparentShadowMaterial = require('../assets/transparent_shadow_material.filamat');


LogBox.ignoreLogs([
    //"has already", 
    "Failed to load asset",
    "Missing required parameter"
]);


function quaternionToAngleAxis(q: CANNON.Quaternion): { angle: number; axis: [number, number, number] } {
    const angle = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);
    let axis: [number, number, number];
    if (s < 0.001) {
        // If s is close to zero, use a default axis (here, the X axis)
        axis = [1, 0, 0];
    } else {
        axis = [q.x / s, q.y / s, q.z / s];
    }
    return { angle, axis };
}

interface DiceSceneProps {
    initialImpulse: number[];
    initialTorque: number[];
    profile: Profile;
    windowSize: WinSize;
    freeze: boolean;
    setInRecovery: (inRecovery: boolean) => void;
}
export interface DiceSceneMethods {
    rollDice: () => void;
    update: (profile: Profile) => void;
    updateWindowSize: (winSize: WinSize) => void;
    updateCamera: (tilt: number) => void;
}

interface DieRotation {
    angle: number;
    axis: Float3
}

const DefaultRotation = {
    angle: 0,
    axis: [1, 0, 0] as Float3,
};

function getDieX(i: number, count: number, offset: number): number {
    return (i < count / 2 ?
        -(i + 1) * offset :
        (i + 1) * offset);
}

const cameraHeight = 20;
const focalLength = 35;
const fov = computeVerticalFov(focalLength);
const wallThickness = 0.01;
const FaceUpInit = [-1, -1, -1, -1];
const canonicalYaw = [Math.PI / 2, Math.PI, 0, 0, -Math.PI / 2, Math.PI]


export const DiceScene = forwardRef(({ initialImpulse, initialTorque, profile, windowSize, freeze, setInRecovery }: DiceSceneProps, ref: any) => {
    const [currWindowSize, setCurrWindowSize] = useState<WinSize>(windowSize);

    const [bounds, setBounds] = useState<{ left: number; right: number; bottom: number; top: number }>(
        computeFloorBounds(windowSize, cameraHeight, fov, 0)
    );
    const [diceInfo, setDiceInfo] = useState<Dice[]>(profile.dice);
    const diceInfoRef = useRef<Dice[]>(profile.dice);
    const [diceSize, setDiceSize] = useState<number>(profile.size);

    const [revision, setRevision] = useState<number>(-1);
    const [sceneActive, setSceneActive] = useState<number>(0);
    const [log, setLog] = useState<string>("")
    const { engine, renderableManager, scene, transformManager, view } = useFilamentContext()
    const [faceUp, setFaceUp] = useState<number[]>(FaceUpInit)

    const sceneActiveRef = useRef<number>(sceneActive);


    const getDiceScale = useCallback(() => {
        "worklet"
        const winSizeFactor = 900 / currWindowSize.height;
        let scale = .5 * winSizeFactor * (diceSize + 2) / 2;

        const width = Math.min(currWindowSize.height, currWindowSize.width);
        if (width < 600) {
            scale = scale * (width / 900);
        }
        return scale;
    }, [currWindowSize, diceSize]);

    // useEffect(() => {
    //     setTimeout(() => setSceneActive(0), 1000)
    // }, [])

    const generalDiceModel: FilamentModel[] = [
        useModel(DiceModel),
        useModel(DiceModel),
        useModel(DiceModel),
        useModel(DiceModel)
    ];
    // const floorModel = useModel(FloorModel);
    // const floorAsset = getAssetFromModel(floorModel);
    // const floorEntity = floorAsset?.getRenderableEntities()[0];
    // const matInstance = floorEntity && renderableManager.getMaterialInstanceAt(floorEntity, 0);

    const generalDiceAsset = generalDiceModel.map(d => getAssetFromModel(d));
    const generalEntity = generalDiceAsset.map(de => de?.getRenderableEntities()[0]).map((e) => {
        if (e) renderableManager.setCastShadow(e, true)
        if (e) renderableManager.setReceiveShadow(e, true)
        return e
    });


    //#region Setup shadow plane
    const shadowMaterialBuffer = useBuffer({ source: TransparentShadowMaterial })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const shadowMaterial = useDisposableResource(
        useWorkletCallback(() => {
            'worklet'
            if (shadowMaterialBuffer == null) return undefined

            const material = engine.createMaterial(shadowMaterialBuffer)
            material.setDefaultFloatParameter('strength', 0.2)
            return material
        }),
        [engine, shadowMaterialBuffer])

    // Create Shadow plane
    const shadowPlane = useWorkletMemo(() => {
        'worklet'
        if (shadowMaterial == null) return undefined
        console.log("shadow plane loaded")
        const entity = renderableManager.createPlane(shadowMaterial, 150, 0.1, 150)
        renderableManager.setReceiveShadow(entity, true)
        return entity
    }, [renderableManager, shadowMaterial])

    useEntityInScene(scene, shadowPlane)


    const worldRef = useRef<CANNON.World | null>(null);
    if (!worldRef.current) {
        const world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -45, 0),
        });
        // Optional: set broadphase and solver iterations
        world.broadphase = new CANNON.NaiveBroadphase();
        //world.solver.iterations = 20;
        // Create a default material/contact material for better collisions.
        const defaultMat = new CANNON.Material("default");
        world.defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMat,
            defaultMat,
            { friction: 0.9, restitution: 0.7 }
        );
        world.allowSleep = true;
        worldRef.current = world;
    }
    const world = worldRef.current!;


    const worldDiceRef = useRef<{ body: CANNON.Body }[]>([]);
    const diceCount = useSharedValue(0);
    const backgroundColorRef = useSharedValue<Float4>([0, 1, 0, 1]);

    useImperativeHandle(ref, (): DiceSceneMethods => ({
        rollDice: () => {
            const scale = getDiceScale();
            worldDiceRef.current?.forEach((die, i) => {
                // Reset any existing velocities
                die.body.velocity.setZero();
                die.body.angularVelocity.setZero();

                die.body.position.set(getDieX(i % 2, Math.min(2, diceInfo.length), scale), 8, i < 2 ? -3 : 0);

                const force = 3 + 7 * Math.random();
                die.body.applyImpulse(
                    new CANNON.Vec3(-force, force, 0),
                    new CANNON.Vec3(0, 0, .2)
                );

                die.body.allowSleep = true;
            })
            setSceneActive(worldDiceRef.current.length);
            sceneActiveRef.current = worldDiceRef.current.length;

            setFaceUp(FaceUpInit);
        },
        update: (profile) => {
            setDiceSize(profile.size);
            const info = profile.dice
            setDiceInfo(info)
            diceInfoRef.current = info;
            backgroundColorRef.value = hexToSrgb(safeColor(profile.tableColor));
            setRevision(prev => prev + 1);
        },
        updateWindowSize: (winSize: WinSize) => {
            console.log("updateWindowSize", winSize)
            setCurrWindowSize(winSize);
        },
        updateCamera: (tilt) => {
            // if (tilt >= 0 && tilt < cameraPos.length) {
            //     console.log("update camera tilt", tilt)
            //     setCameraTilt(tilt);
            // }
        }
    }));

    useEffect(() => {
        const b = computeFloorBounds(currWindowSize, cameraHeight - 2 * getDiceScale(), fov, 0);
        console.log("Bounds calculated", b)
        setBounds(b)
    }, [currWindowSize])

    useEffect(() => {
        const scale = getDiceScale()
        console.log("Scale", scale)

        worldDiceRef.current = diceInfoRef.current
            .filter(die => die.active)
            .map((die, i) => {
                const body = createDieShape();

                // Initial position above ground.
                body.position.set(getDieX(i % 2, Math.min(2, diceInfoRef.current.length), scale) - scale / 2, 1.5, i < 2 ? 0 : scale * 2);
                body.sleepSpeedLimit = 0.1;
                body.sleepTimeLimit = 1;
                body.allowSleep = true;

                body.quaternion.setFromEuler(0, Math.PI, -Math.PI / 2)
                //-Math.PI/2,0,Math.PI/2
                body.addEventListener("sleep", () => {
                    console.log("On dice sleep")
                    if (die.template != Templates.Dots && die.template != Templates.Colors) {

                        const { face, euler } = getTopFace(body);
                        setFaceUp(prev => {
                            return prev.map((orig, cubeIndex) => cubeIndex == i ? face - 1 : orig);
                        })
                        if (face > 0) {
                            const [cx, cy, cz] = [euler.x, euler.y, euler.z];
                            const ty = canonicalYaw[face - 1];
                            // minimalAngleDiff helps with wrap-around, e.g. going from 359° to 0° is only 1°.
                            function minimalAngleDiff(a: number, b: number): number {
                                let diff = b - a;
                                // clamp to -PI..PI or similar
                                while (diff > Math.PI) diff -= 2 * Math.PI;
                                while (diff < -Math.PI) diff += 2 * Math.PI;
                                return diff;
                            }

                            const dy = minimalAngleDiff(cy, ty);

                            animateYaw(body, cx, cz, cy, cy + dy, 400);

                            setTimeout(() => setSceneActive(prev => {
                                sceneActiveRef.current = prev - 1;
                                return prev - 1
                            }), 400);
                            body.allowSleep = true;
                        } else {
                            console.log("face not settles, don't sleep")
                            body.allowSleep = false;
                        }
                    } else {
                        // colors and dots
                        setTimeout(() => setSceneActive(prev => {
                            sceneActiveRef.current = prev - 1;
                            return prev - 1
                        }), 400);
                        body.allowSleep = true;
                    }
                });

                let lastTime = -1
                body.addEventListener('collide', (e: any) => {
                    if (sceneActiveRef.current <= 0) return;
                    if (!profile.soundEnabled) return;

                    const impactVelocity = e.contact.getImpactVelocityAlongNormal();
                    if (impactVelocity >= 2 && (lastTime < 0 || performance.now() - lastTime > 100)) {
                        lastTime = performance.now();
                        const volume = Math.min(1, Math.abs(impactVelocity) / 10);
                        console.log("collide", impactVelocity)
                        playBundledAudio(Sounds.collision, volume)
                    }
                })
                world.addBody(body);

                return {
                    body
                };
            });
        diceCount.value = worldDiceRef.current.length;
        // render all dice at rest
        setSceneActive(worldDiceRef.current.length);
        setTimeout(() => setSceneActive(0), 200)

        const disposeables: CANNON.Body[] = [];

        disposeables.push(createFloor(world));

        disposeables.push(createWall(world, [50, 50, wallThickness], [0, 0, bounds.top / scale])); //back
        disposeables.push(createWall(world, [50, 50, wallThickness], [0, 0, bounds.bottom / scale])); //front
        disposeables.push(createWall(world, [wallThickness, 50, 50], [bounds.left / scale, 0, 0])); //left
        disposeables.push(createWall(world, [wallThickness, 50, 50], [bounds.right / scale, 0, 0])); //right

        return () => {
            worldDiceRef.current?.map(die => world.removeBody(die.body));
            disposeables.map(d => world.removeBody(d));

        };
    }, [world, bounds, diceInfo, worldDiceRef, profile]);


    const dicePosition = [
        useSharedValue<Float3>([0, 0, 0]),
        useSharedValue<Float3>([0, 0, 0]),
        useSharedValue<Float3>([0, 0, 0]),
        useSharedValue<Float3>([0, 0, 0]),
    ];
    const diceRotation = [
        useSharedValue<DieRotation>(DefaultRotation),
        useSharedValue<DieRotation>(DefaultRotation),
        useSharedValue<DieRotation>(DefaultRotation),
        useSharedValue<DieRotation>(DefaultRotation)
    ];

    const activeDice = diceInfo.filter(die => die.active);
    const texture = [0, 1, 2, 3]
        //.filter(die => die.active)
        .map((i) => {
            //if (die.template == Templates.Dots) return undefined;
            let template = i < activeDice.length ? activeDice[i].template : Templates.Dots;
            let textureSource
            switch (template) {
                case Templates.Numbers:
                case Templates.Dots:
                case Templates.Colors:
                    const asset = templatesList.find(t => t.key == template)?.image;
                    textureSource = { source: asset }
                    break;
                default:
                    const uri = diceInfo[i].texture;
                    textureSource = { source: { uri } };
                    break;
            }
            try {
                const t = useBuffer(textureSource);
                return t;
            } catch (e) {
                console.log("Cannot find texture", textureSource)
                return undefined;
            }
        });


    useEffect(() => {
        if (freeze) return;
        let lastTime = performance.now();
        let frameId: number;

        function animate(currentTime: number) {
            const dt = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            const dtClamped = Math.min(dt, 1 / 30);
            world.step(1 / 60, dtClamped, 3);

            worldDiceRef.current?.map((die, i) => {
                const { x, y, z } = die.body.position;
                const { angle, axis } = quaternionToAngleAxis(die.body.quaternion);

                //console.log("World step", [x,y,z])

                dicePosition[i].value = [x, y, z];
                diceRotation[i].value = {
                    angle,
                    axis
                };
            })

            frameId = requestAnimationFrame(animate);
        }
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [world, freeze]);



    const renderCallback: RenderCallback = useCallback(() => {
        "worklet"
        const scale = getDiceScale();
        console.log("render callback", scale, diceSize, currWindowSize)
        const hideTransform = transformManager.createIdentityMatrix().translate([-1000, 0, 0]);
        for (let i = 0; i < 4; i++) {
            const entity = generalEntity[i];

            if (entity) {
                // adding scale to y: to make the bottom of cube be at y=0
                const pos = [dicePosition[i].value[0], dicePosition[i].value[1] + scale, dicePosition[i].value[2]] as Float3
                const angle = diceRotation[i].value.angle;
                const axis = [diceRotation[i].value.axis[0], diceRotation[i].value.axis[1], diceRotation[i].value.axis[2]] as Float3;


                if (i < diceCount.value) {
                    let transform = transformManager.createIdentityMatrix();
                    transform = transform.rotate(angle, axis);
                    transform = transform.translate(pos);
                    transform = transform.scaling([scale, scale, scale]);
                    transformManager.setTransform(entity, transform);
                } else {
                    transformManager.setTransform(entity, hideTransform);
                }

            }
        }

    }, [dicePosition, diceRotation, generalEntity, transformManager, diceCount, diceSize])

    const inRecoveryRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const handleViewClicked = async (e: GestureResponderEvent) => {

        const { locationX, locationY } = e.nativeEvent
        const entity = await view.pickEntity(locationX, locationY)
        if (entity != null) {
            // dice clicked
            const index = generalEntity.findIndex(ent => ent?.id == entity.id);
            if (index >= 0) {
                handleDiceClicked(index);
                return;
            }
        }
        if (inRecoveryRef.current && profile?.recoveryTime) {
            return;
        }

        if (profile && profile.recoveryTime > 0) {
            inRecoveryRef.current = setTimeout(() => {
                if (inRecoveryRef.current != undefined) {
                    clearTimeout(inRecoveryRef.current);
                    inRecoveryRef.current = undefined;
                    setInRecovery(false);
                }
            }, profile?.recoveryTime! * 1000);
            setInRecovery(true);
        }
        ref.current?.rollDice();
    }

    const handleDiceClicked = (index: number) => {
        const dieInfo = diceInfoRef.current[index];
        const body = worldDiceRef.current[index];
        const { face } = getTopFace(body.body);
        console.log("Dice-clicked", index, face)

        if (face > 0) {
            if (dieInfo.faces?.at(face - 1)?.audioUri) {
                playAudio(dieInfo.faces[face - 1]!.audioUri!);
            }
        }
    }

    return (
        <>
            <Text style={{ position: "absolute", top: 100, left: 100, zIndex: 1000 }}>{log}</Text>

            <FilamentView
                style={{
                    flex: 1,
                    backgroundColor: profile.tableColor
                }}
                renderCallback={sceneActive != undefined && sceneActive > 0 && !freeze ? renderCallback : undefined}
                onTouchStart={handleViewClicked}>

                <DefaultLight />
                {/* <EnvironmentalLight source={{ uri: 'RNF_default_env_ibl.ktx' }} /> */}
                {/* <Light type="directional" intensity={100_000} colorKelvin={6_500} castShadows={true}
                    //falloffRadius={bounds.right}
                    position={[0, 10, 100]} //direction={[0,0,0]}
                /> */}




                {activeDice
                    .filter(die => die.active)
                    .map((dieInfo, i) => (worldDiceRef.current &&
                        <ModelRenderer key={i}
                            model={generalDiceModel[i]}
                            castShadow={true} receiveShadow={true}
                        //onPress={() => handleDiceClicked(dieInfo, i)}
                        >
                            {texture[i] && <EntitySelector byName="Cube"
                                textureMap={{ materialName: "Material", textureSource: texture[i] }} />}
                        </ModelRenderer>
                    ))}
                {/* <Model source={FloorModel} receiveShadow={true}>
                  
                </Model> */}

                {/* <Model source={DiceModel}
                    translate={[-1, 1, -.3]}

                /> */}
                {/*}
                <Model source={DiceModel}
                    translate={[bounds.right, 0, bounds.bottom]}

                /> */}
                <Camera cameraPosition={[0, cameraHeight, bounds.bottom / 2]} cameraTarget={[0, 0, 0]} focalLengthInMillimeters={focalLength} />
            </FilamentView>
        </>
    );
});