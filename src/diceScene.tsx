import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LogBox, View } from "react-native";
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
    FrameInfo,
    BoxShape,
    Skybox,
    useBuffer,
    useDisposableResource,
    useWorkletCallback,
    useWorkletMemo,
    useEntityInScene,
    Model,
    FilamentModel,
    Entity,
    EntitySelector,
    Light,
    EnvironmentalLight
} from "react-native-filament";

import * as CANNON from "cannon-es";
import { useSharedValue } from "react-native-worklets-core"
import { Dice, getCustomTypePath, Profile, Templates, templatesList } from "./profile";
import { computeFloorBounds, computeVerticalFov, getFaceAndQuaternionDelta, WinSize } from "./utils";
import { FilamentBuffer } from "react-native-filament/lib/typescript/src/native/FilamentBuffer";


const DiceModel = require("../assets/dice-empty.glb");
const DotModel = require("../assets/dot-dice.glb");
const TransparentShadowMaterial = require('../assets/transparent_shadow_material.filamat');

LogBox.ignoreLogs(["has already"]);


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


export const DiceScene = forwardRef(({ initialImpulse, initialTorque, profile, windowSize }: DiceSceneProps, ref: any) => {
    const [currWindowSize, setCurrWindowSize] = useState<WinSize>(windowSize);
    const [bounds, setBounds] = useState<{ left: number; right: number; bottom: number; top: number }>(
        computeFloorBounds(windowSize, cameraHeight, fov, 0)
    );
    const [diceInfo, setDiceInfo] = useState<Dice[]>(profile.dice);
    const diceInfoRef = useRef<Dice[]>(profile.dice);
    const [diceSize, setDiceSize] = useState<number>(profile.size);
    const [revision, setRevision] = useState<number>(0);

    const { engine, renderableManager, scene, transformManager } = useFilamentContext()

    const generalDiceModel: FilamentModel[] = [
        useModel(DiceModel),
        useModel(DiceModel),
        useModel(DiceModel),
        useModel(DiceModel)
    ];

    const dotDiceModel: FilamentModel[] = [
        useModel(DotModel),
        useModel(DotModel),
        useModel(DotModel),
        useModel(DotModel)
    ]
    const generalDiceAsset = generalDiceModel.map(d => getAssetFromModel(d));
    const generalEntity = generalDiceAsset.map(de => de?.getRenderableEntities()[0]);

    const dotDiceAsset = dotDiceModel.map(d => getAssetFromModel(d));
    const dotEntity = dotDiceAsset.map(de => de?.getRenderableEntities()[0]);


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
        [engine, shadowMaterialBuffer]
    )

    // Create Shadow plane
    const shadowPlane = useWorkletMemo(() => {
        'worklet'
        if (shadowMaterial == null) return undefined

        const entity = renderableManager.createPlane(shadowMaterial, 10, 0.0001, 10)
        renderableManager.setReceiveShadow(entity, true)
        return entity
    }, [renderableManager, shadowMaterial])

    useEntityInScene(scene, shadowPlane)


    const worldRef = useRef<CANNON.World | null>(null);
    if (!worldRef.current) {
        const world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
        });
        // Optional: set broadphase and solver iterations
        world.broadphase = new CANNON.NaiveBroadphase();
        world.solver.iterations = 20;
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
    const isDotDice = useSharedValue([false, false, false, false]);

    useImperativeHandle(ref, (): DiceSceneMethods => ({
        rollDice: () => {
            worldDiceRef.current?.map((die, i) => {
                // Reset any existing velocities
                die.body.velocity.setZero();
                die.body.angularVelocity.setZero();

                // Optionally, reset position if desired.
                die.body.position.set(getDieX(i, diceInfo.length, 1), 8, -5);
                //die.body.position.set(getDieX(i, diceInfo.length, 1), 2, 0);


                const fz = (Math.random() * 10 + .3);
                const fy = -(Math.random() * 5 + .3);

                // Random angular velocity for all dice
                const avx = Math.random() * 5;
                const avy = Math.random() * 5;
                const avz = Math.random() * 5;
                const imp = [0, fy, fz];
                const trq = [avx, avy, avz];
                const randomRotation = () => Math.floor(360 * Math.random()) - 180;

                die.body.quaternion.setFromEuler(randomRotation(), randomRotation(), randomRotation());

                // Apply the linear impulse.
                // initialImpulse is a number array, e.g. [x, y, z]
                const impulse = new CANNON.Vec3(...imp);

                // Applying the impulse at the center of mass:
                die.body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));

                // For an angular impulse, you can simply set the angularVelocity.
                // initialTorque is a number array, e.g. [x, y, z].
                die.body.angularVelocity.set(trq[0], trq[1], trq[2]);
            })
        },
        update: (profile) => {
            setDiceSize(profile.size);
            const info = profile.dice
            setDiceInfo(info)
            diceInfoRef.current = info;
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
        const b = computeFloorBounds(currWindowSize, cameraHeight, fov, 0);
        setBounds(b)
    }, [currWindowSize])


    useEffect(() => {
        const scale = diceSize * .5 / 2;
        const isDotArray: boolean[] = [false, false, false, false]
        worldDiceRef.current = diceInfoRef.current
            .filter(die => die.active)
            .map((die, i) => {
                // Create a dynamic dice body (a 1x1x1 box)
                const body = new CANNON.Body({
                    mass: 1,
                    shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
                });
                // Initial position above ground.
                //body.quaternion.setFromEuler(0,45,90)

                body.position.set(getDieX(i, diceInfoRef.current.length, 1), 1.5, 0);
                body.sleepSpeedLimit = 0.1;
                body.sleepTimeLimit = 1;
                body.allowSleep = true;


                body.addEventListener("sleep", () => {
                    // Compute the face and correction delta
                    const r = new CANNON.Vec3()
                    body.quaternion.toEuler(r) // YZX by default
                    console.log("settled", [r.x * 180 / Math.PI, r.y * 180 / Math.PI, r.z * 180 / Math.PI])
                    const { face, delta } = getFaceAndQuaternionDelta([r.y, r.z, r.x]);

                    console.log("Dice settled with face:", face);

                    // Apply the delta to correct the orientation:
                    // body.quaternion.setFromEuler(delta[0], delta[1], delta[2])
                });
                world.addBody(body);

                isDotArray[i] = die.template == Templates.Dots;



                return {
                    body,
                    // todo dot or not?
                };
            });
        diceCount.value = worldDiceRef.current.length;
        isDotDice.value = isDotArray;

        // Create a ground as a large static box.
        const ground = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(50, 1, 50)),
        });

        // Position so that the top surface is at y = 0.
        ground.position.set(0, -1, 0);
        world.addBody(ground);


        const backWall = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(50, 50, wallThickness)),
        });

        backWall.position.set(0, 0, bounds.top / scale);
        world.addBody(backWall);

        const leftWall = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(wallThickness, 50, 50)),
        });

        leftWall.position.set(bounds.left / scale, 0, 0);
        world.addBody(leftWall);

        const rightWall = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(wallThickness, 50, 50)),
        });

        rightWall.position.set(bounds.right / scale, 0, 0);
        world.addBody(rightWall);

        const frontWall = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(50, 50, wallThickness)),
        });

        frontWall.position.set(0, 0, bounds.bottom / scale);
        world.addBody(frontWall);

        return () => {
            worldDiceRef.current?.map(die => world.removeBody(die.body));
            world.removeBody(ground);
            world.removeBody(backWall);
            world.removeBody(rightWall);
            world.removeBody(leftWall);
            world.removeBody(frontWall);
        };
    }, [world, bounds, diceInfo, worldDiceRef]);

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

    const activeDice = diceInfo.filter(die=>die.active);
    const texture = [0,1,2,3]
        //.filter(die => die.active)
        .map(i => {
            //if (die.template == Templates.Dots) return undefined;
            let template = i< activeDice.length ? activeDice[i].template : Templates.Dots;
            let textureSource
            switch (template) {
                case Templates.Numbers:
                case Templates.Dots:
                case Templates.Colors:
                    const asset = templatesList.find(t => t.key == template)?.image;
                    textureSource = { source: asset }
                    break;
                default:
                    const uri = "file://" + getCustomTypePath(template) + "/dice.jpg";
                    textureSource = { source: { uri } };
                    //await getRandomFile(getCustomTypePath(template) + "/dice.jpg", "jpg")
                    break;
            }
            return useBuffer(textureSource);
        });


    useEffect(() => {
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
    }, [world]);



    const renderCallback: RenderCallback = useCallback(() => {
        "worklet"

        const scale = .5 * diceSize / 2;
        const hideTransform = transformManager.createIdentityMatrix().translate([-1000, 0, 0]);
        for (let i = 0; i < 4; i++) {
            const entity = generalEntity[i]; //isDotDice.value[i] ? dotEntity[i] : generalEntity[i];
            const otherEntity = dotEntity[i]; //isDotDice.value[i] ? generalEntity[i] : dotEntity[i];

            if (entity) {
                //console.log("type", entity, otherEntity)
                const pos = [dicePosition[i].value[0], dicePosition[i].value[1], dicePosition[i].value[2]] as Float3
                const angle = diceRotation[i].value.angle;
                const axis = [diceRotation[i].value.axis[0], diceRotation[i].value.axis[1], diceRotation[i].value.axis[2]] as Float3;
                //console.log("transform", pos,  angle, axis)


                if (i < diceCount.value) {
                    let transform = transformManager.createIdentityMatrix();
                    transform = transform.rotate(angle, axis);
                    transform = transform.translate(pos);
                    transform = transform.scaling([scale, scale, scale]);
                    transformManager.setTransform(entity, transform);
                } else {
                    transformManager.setTransform(entity, hideTransform);
                }

                // hide the other type's model
                if (otherEntity) transformManager.setTransform(otherEntity, hideTransform);
            }
        }

    }, [dicePosition, diceRotation, generalEntity, dotEntity, transformManager, diceCount, isDotDice, diceSize])



    console.log("bounds", bounds)

    return (

        <FilamentView style={{ flex: 1 }} renderCallback={renderCallback} >
            <DefaultLight />
            {/* <EnvironmentalLight source={{ uri: 'RNF_default_env_ibl.ktx' }} /> */}
            {/* <Light type="point" intensity={100_000} colorKelvin={6_500} castShadows={true} 
            falloffRadius={bounds.right}
            position={[0,10,0]} //direction={[0,0,0]}
            /> */}

            <Skybox colorInHex={profile.tableColor} showSun={false} />


            {activeDice
                .filter(die => die.active)
                .map((dieInfo, i) => (worldDiceRef.current &&
                    <ModelRenderer key={i + "-" + isDotDice.value[i]}
                        model={false ? dotDiceModel[i] : generalDiceModel[i]}
                        castShadow={true} receiveShadow={true}

                    >
                        {texture[i] && <EntitySelector byName="Cube"
                            textureMap={{ materialName: "Material", textureSource: texture[i] }} />}
                    </ModelRenderer>
                ))}

            {/* <Model source={DiceModel}
                translate={[bounds.left, 0, bounds.top]}

            />
            <Model source={DiceModel}
                translate={[bounds.right, 0, bounds.bottom]}

            /> */}
            <Camera cameraPosition={[0, cameraHeight, bounds.bottom]} cameraTarget={[0, 0, 0]} focalLengthInMillimeters={focalLength} />
        </FilamentView>

    );
});