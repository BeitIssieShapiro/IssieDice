import * as CANNON from "cannon-es";
import { createFloor, createSpinnerShape, createWall, SpinnerTipY } from "./scene-elements";
import type { Bounds } from "./models";

/*
 * Spinner (sevivon) simulation.
 *
 * A spin is made of two phases:
 *  - spinning: scripted (kinematic) motion - spin around its axis that slows down, with a growing
 *    wobble (precession). cannon-es does not simulate gyroscopic effects, so a physically simulated
 *    top would simply fall over immediately.
 *  - falling: once slow enough, the body becomes dynamic with the current pose and velocities, and
 *    physics decides on which side it falls.
 * When the body sleeps, the face looking up is the result, and the spinner is smoothly aligned so
 * the face is flat and readable (handle pointing to the top of the screen).
 */

export type SpinnerPhase = "idle" | "spinning" | "falling" | "settling";

// local outward normals of the 4 faces (see design-resources/generate-spinner-glb.js)
const FaceNormals = [
    new CANNON.Vec3(0, 0, 1),
    new CANNON.Vec3(1, 0, 0),
    new CANNON.Vec3(0, 0, -1),
    new CANNON.Vec3(-1, 0, 0),
];

const FloorY = -1;
const UpAxis = new CANNON.Vec3(0, 1, 0);
const TipToCenter = new CANNON.Vec3(0, -SpinnerTipY, 0);

const SpinDurationMin = 3;      // sec
const SpinDurationMax = 5;      // sec
const OmegaStart = 30;          // rad/sec
const OmegaEnd = 4;             // rad/sec - spin speed when handing over to physics
const TiltStart = 0.03;         // rad
const TiltEnd = 0.3;            // rad
const PrecessionFactor = 25;    // precession speed = PrecessionFactor / omega
const FallTiltSpeed = 1.5;      // rad/sec - extra push to fall when handing over to physics
const DriftSpeed = 0.4;         // units/sec - the tip slowly wanders on the floor
const SettleDuration = 0.4;     // sec
const FallTimeout = 6;          // sec - force settle if physics does not go to sleep
const WallMargin = 3;           // keep tip away from walls (spinner half length is ~2.2)

function axisAngle(axis: CANNON.Vec3, angle: number) {
    return new CANNON.Quaternion().setFromAxisAngle(axis, angle);
}

/**
 * Orientation of the spinner lying on its side with `face` looking up, and the handle
 * pointing to +z (which is the top of the screen).
 */
export function restingQuaternion(face: number): CANNON.Quaternion {
    const qa = new CANNON.Quaternion().setFromVectors(FaceNormals[face], UpAxis);
    const handleDir = qa.vmult(UpAxis);
    const qb = axisAngle(UpAxis, Math.atan2(-handleDir.x, handleDir.z));
    return qb.mult(qa);
}

export function getUpFace(q: CANNON.Quaternion): number {
    let best = 0;
    let bestY = -Infinity;
    FaceNormals.forEach((n, i) => {
        const y = q.vmult(n).y;
        if (y > bestY) {
            bestY = y;
            best = i;
        }
    });
    return best;
}

export class SpinnerSim {
    world: CANNON.World;
    body: CANNON.Body;
    phase: SpinnerPhase = "idle";
    face = 0;
    onSettled?: (face: number) => void;
    onCollide?: (impactVelocity: number) => void;

    private walls: CANNON.Body[] = [];
    private bounds: Bounds = { left: -10, right: 10, bottom: -10, top: 10 };
    private time = 0;
    private phaseStart = 0;
    private spinDuration = 0;
    private spinAngle = 0;
    private precessionAngle = 0;
    private tip = new CANNON.Vec3();
    private driftAngle = 0;
    private settleFrom = new CANNON.Quaternion();
    private settleTo = new CANNON.Quaternion();
    private settleFromPos = new CANNON.Vec3();
    private random: () => number;

    constructor(random: () => number = Math.random) {
        this.random = random;
        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -45, 0) });
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.allowSleep = true;
        const mat = new CANNON.Material("default");
        this.world.defaultContactMaterial = new CANNON.ContactMaterial(mat, mat, { friction: 0.6, restitution: 0.25 });

        createFloor(this.world);

        this.body = createSpinnerShape();
        this.body.angularDamping = 0.3;
        this.body.linearDamping = 0.1;
        this.body.sleepSpeedLimit = 0.1;
        this.body.sleepTimeLimit = 0.5;
        this.body.allowSleep = true;
        this.body.addEventListener("sleep", () => this.handleSleep());
        this.body.addEventListener("collide", (e: any) => {
            if (this.phase == "falling") {
                this.onCollide?.(Math.abs(e.contact.getImpactVelocityAlongNormal()));
            }
        });
        this.world.addBody(this.body);
        this.setRestPose(0, 0, 0);
    }

    /** bounds in physics units (i.e. world bounds / scale) */
    setBounds(bounds: Bounds) {
        this.bounds = bounds;
        this.walls.forEach(w => this.world.removeBody(w));
        const t = 0.01;
        this.walls = [
            createWall(this.world, [50, 50, t], [0, 0, bounds.top]),
            createWall(this.world, [50, 10, t], [0, 0, bounds.bottom]),
            createWall(this.world, [t, 50, 50], [bounds.left, 0, 0]),
            createWall(this.world, [t, 50, 50], [bounds.right, 0, 0]),
        ];
        const p = this.body.position;
        if (p.x < bounds.left || p.x > bounds.right || p.z < bounds.bottom || p.z > bounds.top) {
            this.setRestPose(this.face, 0, 0);
        }
    }

    setRestPose(face: number, x: number, z: number) {
        this.face = face;
        this.phase = "idle";
        this.body.type = CANNON.Body.KINEMATIC;
        this.body.velocity.setZero();
        this.body.angularVelocity.setZero();
        this.body.quaternion.copy(restingQuaternion(face));
        this.body.position.set(x, FloorY + 1, z);
    }

    spin() {
        this.phase = "spinning";
        this.phaseStart = this.time;
        this.spinDuration = SpinDurationMin + (SpinDurationMax - SpinDurationMin) * this.random();
        this.spinAngle = this.random() * 2 * Math.PI;
        this.precessionAngle = this.random() * 2 * Math.PI;
        this.driftAngle = this.random() * 2 * Math.PI;
        this.tip.set(this.clampX(this.body.position.x), FloorY, this.clampZ(this.body.position.z));

        this.body.type = CANNON.Body.KINEMATIC;
        this.body.velocity.setZero();
        this.body.angularVelocity.setZero();
        this.body.wakeUp();
        this.updateSpinPose(0);
    }

    /** advance simulation by dt seconds */
    step(dt: number) {
        this.time += dt;
        switch (this.phase) {
            case "spinning": {
                const t = (this.time - this.phaseStart) / this.spinDuration;
                if (t >= 1) {
                    this.startFalling();
                } else {
                    this.updateSpinPose(dt);
                }
                break;
            }
            case "falling":
                this.world.step(1 / 60, dt, 3);
                if (this.phase == "falling" && this.time - this.phaseStart > FallTimeout) {
                    this.handleSleep();
                }
                break;
            case "settling": {
                const t = Math.min(1, (this.time - this.phaseStart) / SettleDuration);
                const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                this.settleFrom.slerp(this.settleTo, e, this.body.quaternion);
                const p = this.settleFromPos;
                this.body.position.set(p.x, p.y + (FloorY + 1 - p.y) * e, p.z);
                if (t >= 1) {
                    this.phase = "idle";
                    this.onSettled?.(this.face);
                }
                break;
            }
        }
    }

    private clampX(x: number) {
        return Math.min(this.bounds.right - WallMargin, Math.max(this.bounds.left + WallMargin, x));
    }
    private clampZ(z: number) {
        return Math.min(this.bounds.top - WallMargin, Math.max(this.bounds.bottom + WallMargin, z));
    }

    private spinState() {
        const t = Math.min(1, (this.time - this.phaseStart) / this.spinDuration);
        const omega = OmegaStart + (OmegaEnd - OmegaStart) * t;
        const precessionSpeed = PrecessionFactor / omega;
        const tilt = TiltStart + (TiltEnd - TiltStart) * t * t;
        return { omega, precessionSpeed, tilt };
    }

    private spinQuaternion(tilt: number) {
        // precession around world up, then tilt, then the spin around the spinner's own axis
        return axisAngle(UpAxis, this.precessionAngle)
            .mult(axisAngle(new CANNON.Vec3(1, 0, 0), tilt))
            .mult(axisAngle(UpAxis, this.spinAngle));
    }

    private updateSpinPose(dt: number) {
        const { omega, precessionSpeed, tilt } = this.spinState();
        this.spinAngle += omega * dt;
        this.precessionAngle += precessionSpeed * dt;

        this.driftAngle += (this.random() - 0.5) * 4 * dt;
        this.tip.x = this.clampX(this.tip.x + Math.cos(this.driftAngle) * DriftSpeed * dt);
        this.tip.z = this.clampZ(this.tip.z + Math.sin(this.driftAngle) * DriftSpeed * dt);

        const q = this.spinQuaternion(tilt);
        this.body.quaternion.copy(q);
        this.body.position.copy(this.tip.vadd(q.vmult(TipToCenter)));
    }

    private startFalling() {
        const { omega, precessionSpeed, tilt } = this.spinState();
        const q = this.spinQuaternion(tilt);

        // angular velocity: own spin + precession + a push in the direction of the tilt
        const tiltAxis = axisAngle(UpAxis, this.precessionAngle).vmult(new CANNON.Vec3(1, 0, 0));
        const w = q.vmult(UpAxis).scale(omega)
            .vadd(UpAxis.scale(precessionSpeed))
            .vadd(tiltAxis.scale(FallTiltSpeed));

        this.body.type = CANNON.Body.DYNAMIC;
        this.body.angularVelocity.copy(w);
        // rotating around the tip which touches the floor
        this.body.velocity.copy(w.cross(this.body.position.vsub(this.tip)));
        this.body.wakeUp();

        this.phase = "falling";
        this.phaseStart = this.time;
    }

    private handleSleep() {
        if (this.phase != "falling") return;
        this.face = getUpFace(this.body.quaternion);
        this.body.type = CANNON.Body.KINEMATIC;
        this.body.velocity.setZero();
        this.body.angularVelocity.setZero();

        this.settleFrom.copy(this.body.quaternion);
        this.settleTo.copy(restingQuaternion(this.face));
        // take the short way
        if (this.settleFrom.x * this.settleTo.x + this.settleFrom.y * this.settleTo.y +
            this.settleFrom.z * this.settleTo.z + this.settleFrom.w * this.settleTo.w < 0) {
            this.settleTo.set(-this.settleTo.x, -this.settleTo.y, -this.settleTo.z, -this.settleTo.w);
        }
        this.settleFromPos.copy(this.body.position);
        this.phase = "settling";
        this.phaseStart = this.time;
    }
}
