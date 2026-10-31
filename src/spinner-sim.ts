import * as CANNON from "cannon-es";
import { createFloor, createSpinnerShape, createWall, SpinnerHandleTop, SpinnerTipY } from "./scene-elements";
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

export type SpinnerPhase = "idle" | "rising" | "spinning" | "falling" | "settling";

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

const RiseDuration = 0.6;       // sec - standing up from lying, and starting to turn
const SpinDurationMin = 3;      // sec
const SpinDurationMax = 5;      // sec
const SpinDirection = -1;       // 1: counterclockwise seen from above, -1: clockwise
const OmegaStart = 14;          // rad/sec
const RiseTurn = SpinDirection * OmegaStart * RiseDuration / 2;  // rad - turning while rising, speeding up to OmegaStart
const OmegaEnd = 3;             // rad/sec - spin speed when handing over to physics
const TiltStart = 0.03;         // rad
const TiltEnd = 0.3;            // rad
const PrecessionFactor = 25;    // precession speed = PrecessionFactor / omega
const FallTiltSpeed = 1.5;      // rad/sec - extra push to fall when handing over to physics
const SettleDuration = 0.4;     // sec
const FallTimeout = 6;          // sec - force settle if physics does not go to sleep
const WallMargin = 1.2;         // keep the spinning spinner away from walls (body half size is 1)
const LyingHalfLength = (SpinnerHandleTop - SpinnerTipY) / 2;  // half the length from tip to handle top
const MaxFallJitter = 35 * Math.PI / 180;         // random deviation of the fall direction
const LyingTolerance = 0.25;    // |up component| of the spinner's axis, to consider it lying on a side
const NudgeSpeed = 8;           // rad/sec - push to fall on a side, when resting on the tip's pyramid
const MaxNudges = 10;
const LeanAccel = 20;           // rad/sec^2 - tips a slow spinner leaning on its tip's pyramid over to a side
const LeanMaxSpeed = 3;         // rad/sec - only while it turns slower than this (it is not falling by itself)
const FallSpinFactor = 0.5;      // part of the spin kept when physics takes over

function axisAngle(axis: CANNON.Vec3, angle: number) {
    return new CANNON.Quaternion().setFromAxisAngle(axis, angle);
}

/**
 * Orientation of the spinner lying on its side with `face` looking up, and the handle
 * pointing to the top of the screen: +z rotated by `viewYaw` around the up axis.
 */
export function restingQuaternion(face: number, viewYaw: number = 0): CANNON.Quaternion {
    const qa = new CANNON.Quaternion().setFromVectors(FaceNormals[face], UpAxis);
    const handleDir = qa.vmult(UpAxis);
    const qb = axisAngle(UpAxis, Math.atan2(-handleDir.x, handleDir.z) + viewYaw);
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
    // rotation (around the up axis) of the camera's view direction, from +z
    viewYaw = 0;
    // when settled, turn the camera so the face is upright (not needed for faces that read the same at any angle)
    turnToReadable = true;
    // the camera's turn around the vertical axis through the settled spinner, that shows its face upright
    viewTurn = 0;
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
    private tipStart = new CANNON.Vec3();
    private tipTarget = new CANNON.Vec3();
    private fallAngle = 0; // direction of the fall: (sin, 0, cos)
    private settleFrom = new CANNON.Quaternion();
    private settleTo = new CANNON.Quaternion();     // face up, flat - same heading as when it stopped
    private nudges = 0;
    private settleFromPos = new CANNON.Vec3();
    private riseFrom = new CANNON.Quaternion();
    private riseTo = new CANNON.Quaternion();       // the spin's start pose, without the turn while rising
    private riseFromPos = new CANNON.Vec3();
    private riseToPos = new CANNON.Vec3();
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

    setViewYaw(viewYaw: number) {
        this.viewYaw = viewYaw;
        if (this.phase == "idle") {
            this.setRestPose(this.face, this.body.position.x, this.body.position.z);
        }
    }

    setRestPose(face: number, x: number, z: number) {
        this.face = face;
        this.phase = "idle";
        this.body.type = CANNON.Body.KINEMATIC;
        this.body.velocity.setZero();
        this.body.angularVelocity.setZero();
        this.body.quaternion.copy(restingQuaternion(face, this.viewYaw));
        this.body.position.set(x, FloorY + 1, z);
    }

    spin() {
        this.riseFrom.copy(this.body.quaternion);
        this.riseFromPos.copy(this.body.position);
        this.phase = "rising";
        this.phaseStart = this.time;
        this.spinDuration = SpinDurationMin + (SpinDurationMax - SpinDurationMin) * this.random();
        this.spinAngle = this.random() * 2 * Math.PI;
        this.planFall();
        // start the precession so it ends exactly in the fall direction
        // (the total precession is the integral of PrecessionFactor / omega, omega decreasing linearly)
        const totalPrecession = SpinDirection * PrecessionFactor * this.spinDuration / (OmegaEnd - OmegaStart) * Math.log(OmegaEnd / OmegaStart);
        this.precessionAngle = this.fallAngle - totalPrecession;
        this.tipStart.set(this.clampX(this.body.position.x), FloorY, this.clampZ(this.body.position.z));
        this.tip.copy(this.tipStart);

        this.body.type = CANNON.Body.KINEMATIC;
        this.body.velocity.setZero();
        this.body.angularVelocity.setZero();
        this.body.wakeUp();

        // where the spin starts: a fixed pose, so it does not flip on the way (as a moving target could)
        const q = this.spinQuaternion(TiltStart);
        this.riseToPos.copy(this.tip.vadd(q.vmult(TipToCenter)));
        q.mult(axisAngle(UpAxis, -RiseTurn), this.riseTo);
        this.updateRisePose();
    }

    /** stands up from lying, to the pose the spin starts with, while starting to turn around its own axis */
    private updateRisePose() {
        const t = Math.min(1, (this.time - this.phaseStart) / RiseDuration);
        const e = t * t * (3 - 2 * t);
        // the turn speeds up to the spin's (RiseTurn in total)
        this.riseFrom.slerp(this.riseTo, e).mult(axisAngle(UpAxis, RiseTurn * t * t), this.body.quaternion);
        const from = this.riseFromPos;
        const targetPos = this.riseToPos;
        this.body.position.set(
            from.x + (targetPos.x - from.x) * e,
            // a bit up on the way, so the tip does not go through the floor
            from.y + (targetPos.y - from.y) * e + Math.sin(Math.PI * e) * 0.5,
            from.z + (targetPos.z - from.z) * e);
    }

    /** advance simulation by dt seconds */
    step(dt: number) {
        this.time += dt;
        switch (this.phase) {
            case "rising":
                if (this.time - this.phaseStart >= RiseDuration) {
                    // the spin started when rising ended - in this step
                    this.phase = "spinning";
                    this.phaseStart += RiseDuration;
                    this.updateSpinPose(this.time - this.phaseStart);
                } else {
                    this.updateRisePose();
                }
                break;
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
                this.tipOverIfLeaning(dt);
                this.world.step(1 / 60, dt, 3);
                if (this.phase == "falling" && this.time - this.phaseStart > FallTimeout) {
                    this.handleSleep();
                }
                break;
            case "settling": {
                const t = Math.min(1, (this.time - this.phaseStart) / SettleDuration);
                const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                // lay the face flat (a small roll)
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

    /**
     * Once the camera turned by `yaw` around (x, z): moves the spinner to where it is seen from the camera's
     * default view - turned by -yaw around (x, z), which moves to the center. Then the camera can go back
     * to its default view. By default the full viewTurn, around the spinner.
     */
    applyViewTurn(yaw = this.viewTurn, x = this.body.position.x, z = this.body.position.z) {
        const turn = axisAngle(UpAxis, -yaw);
        const p = turn.vmult(new CANNON.Vec3(this.body.position.x - x, 0, this.body.position.z - z));
        this.body.position.set(p.x, this.body.position.y, p.z);
        this.body.quaternion.copy(turn.mult(this.body.quaternion));
        this.viewTurn = 0;
    }

    /**
     * Chooses the fall direction and where the tip should be when it falls, so the spinner lying on its
     * side fits between the walls: mostly along the longer side of the table, with some randomness.
     */
    private planFall() {
        const b = this.bounds;
        const roomX = b.right - b.left, roomZ = b.top - b.bottom;
        const alongX = roomX > roomZ;
        const sideRoom = alongX ? roomZ : roomX;
        const maxJitter = Math.min(MaxFallJitter, Math.asin(Math.min(1, Math.max(0, (sideRoom - 2 * WallMargin) / (2 * LyingHalfLength)))));
        const base = (alongX ? Math.PI / 2 : 0) + (this.random() < 0.5 ? Math.PI : 0);
        this.fallAngle = base + (this.random() * 2 - 1) * maxJitter;

        // the lying spinner spans from the tip to tip + 2 * LyingHalfLength in the fall direction - center it,
        // with a random offset sideways
        const dir = new CANNON.Vec3(Math.sin(this.fallAngle), 0, Math.cos(this.fallAngle));
        const side = new CANNON.Vec3(dir.z, 0, -dir.x);
        const sideOffset = (this.random() * 2 - 1) * Math.max(0, sideRoom / 2 - 2 * WallMargin);
        const cx = (b.left + b.right) / 2, cz = (b.bottom + b.top) / 2;
        this.tipTarget.set(
            this.clampX(cx - dir.x * LyingHalfLength + side.x * sideOffset),
            FloorY,
            this.clampZ(cz - dir.z * LyingHalfLength + side.z * sideOffset));
    }

    private clampX(x: number) {
        return Math.min(this.bounds.right - WallMargin, Math.max(this.bounds.left + WallMargin, x));
    }
    private clampZ(z: number) {
        return Math.min(this.bounds.top - WallMargin, Math.max(this.bounds.bottom + WallMargin, z));
    }

    private spinState() {
        const t = Math.min(1, (this.time - this.phaseStart) / this.spinDuration);
        const omega = SpinDirection * (OmegaStart + (OmegaEnd - OmegaStart) * t);
        const precessionSpeed = PrecessionFactor / omega;  // same direction as the spin
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

        // the tip travels smoothly to where it should be when falling
        const t = Math.min(1, (this.time - this.phaseStart) / this.spinDuration);
        const e = t * t * (3 - 2 * t);
        this.tip.set(
            this.tipStart.x + (this.tipTarget.x - this.tipStart.x) * e,
            FloorY,
            this.tipStart.z + (this.tipTarget.z - this.tipStart.z) * e);

        const q = this.spinQuaternion(tilt);
        this.body.quaternion.copy(q);
        this.body.position.copy(this.tip.vadd(q.vmult(TipToCenter)));
    }

    private startFalling() {
        const { omega, tilt } = this.spinState();
        // correct the small numeric drift of the precession, so it falls in the planned direction
        this.precessionAngle = this.fallAngle;
        const q = this.spinQuaternion(tilt);

        // angular velocity: some of the own spin + a push in the direction of the tilt.
        // The precession is not kept: whirling around the vertical axis while falling makes it fall in a
        // random direction - possibly against a wall, where it stays leaning on its tip
        const tiltAxis = axisAngle(UpAxis, this.precessionAngle).vmult(new CANNON.Vec3(1, 0, 0));
        const w = q.vmult(UpAxis).scale(omega * FallSpinFactor)
            .vadd(tiltAxis.scale(FallTiltSpeed));

        this.body.type = CANNON.Body.DYNAMIC;
        this.body.angularVelocity.copy(w);
        // rotating around the tip which touches the floor
        this.body.velocity.copy(w.cross(this.body.position.vsub(this.tip)));
        this.body.wakeUp();

        this.phase = "falling";
        this.phaseStart = this.time;
        this.nudges = 0;
    }

    /** the direction to turn, so a spinner leaning on its tip's pyramid falls on a side - undefined when lying */
    private tipOverAxis(): CANNON.Vec3 | undefined {
        const axis = this.body.quaternion.vmult(UpAxis);
        if (Math.abs(axis.y) <= LyingTolerance) return undefined;
        const lean = new CANNON.Vec3(axis.x, 0, axis.z);
        if (lean.length() < 1e-3) lean.set(1, 0, 0);
        const w = UpAxis.cross(lean);
        w.normalize();
        return w.scale(Math.sign(axis.y));
    }

    /** don't let it stop half way, leaning on its tip and a face's bottom edge: keep tipping it over */
    private tipOverIfLeaning(dt: number) {
        if (this.body.angularVelocity.length() > LeanMaxSpeed) return;
        const w = this.tipOverAxis();
        if (!w) return;
        this.body.angularVelocity.vadd(w.scale(LeanAccel * dt), this.body.angularVelocity);
        this.body.wakeUp();
    }

    private handleSleep() {
        if (this.phase != "falling") return;
        const q = this.body.quaternion;

        // Resting on the tip's pyramid (leaning, not lying on a side)? push it further in the direction it leans
        const w = this.tipOverAxis();
        if (w && this.nudges < MaxNudges) {
            this.nudges++;
            this.body.angularVelocity.copy(w.scale(NudgeSpeed));
            this.body.wakeUp();
            return;
        }

        this.face = getUpFace(q);
        this.body.type = CANNON.Body.KINEMATIC;
        this.body.velocity.setZero();
        this.body.angularVelocity.setZero();

        this.settleFrom.copy(q);
        // the smallest rotation that makes the face look straight up
        const faceNormal = q.vmult(FaceNormals[this.face]);
        new CANNON.Quaternion().setFromVectors(faceNormal, UpAxis).mult(q, this.settleTo);
        // take the short way
        if (this.settleFrom.x * this.settleTo.x + this.settleFrom.y * this.settleTo.y +
            this.settleFrom.z * this.settleTo.z + this.settleFrom.w * this.settleTo.w < 0) {
            this.settleTo.set(-this.settleTo.x, -this.settleTo.y, -this.settleTo.z, -this.settleTo.w);
        }
        // the camera then turns around it, so the handle points to the top of the screen (if needed)
        const handle = this.settleTo.vmult(UpAxis);
        let yaw = this.viewYaw - Math.atan2(handle.x, handle.z);
        while (yaw > Math.PI) yaw -= 2 * Math.PI;
        while (yaw < -Math.PI) yaw += 2 * Math.PI;
        this.viewTurn = this.turnToReadable ? -yaw : 0;
        this.settleFromPos.copy(this.body.position);
        this.phase = "settling";
        this.phaseStart = this.time;
    }
}

/**
 * An axis aligned rectangle on the floor (at floorY), centered at the origin, fully visible by a
 * (possibly tilted) camera looking at the origin: `base` (the top-down bounds) is scaled to the largest
 * size that fits in the visible floor area - the 4 screen corner rays intersected with the floor.
 */
export function computeVisibleFloorBounds(cameraPosition: number[], verticalFov: number, aspect: number,
    floorY: number, base: Bounds): Bounds {
    const tanV = Math.tan(verticalFov / 2);
    const tanH = tanV * aspect;

    const [px, py, pz] = cameraPosition;
    const len = Math.hypot(px, py, pz);
    const f = [-px / len, -py / len, -pz / len];   // forward (towards the origin)
    const rLen = Math.hypot(f[0], f[2]);
    const r = [-f[2] / rLen, 0, f[0] / rLen];       // right = forward x up
    const u = [                                     // up = right x forward
        r[1] * f[2] - r[2] * f[1],
        r[2] * f[0] - r[0] * f[2],
        r[0] * f[1] - r[1] * f[0],
    ];

    const quad = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([nx, ny]) => {
        const d = [0, 1, 2].map(k => f[k] + r[k] * nx * tanH + u[k] * ny * tanV);
        // a ray above the horizon never reaches the floor - treat it as very far
        const t = d[1] < -1e-3 ? (floorY - py) / d[1] : 1000;
        return [px + d[0] * t, pz + d[2] * t];
    });
    const isVisible = (x: number, z: number) => {
        const sides = quad.map((a, i) => {
            const b = quad[(i + 1) % 4];
            return Math.sign((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]));
        });
        return sides.every(s => s >= 0) || sides.every(s => s <= 0);
    };

    let lo = 0, hi = 2;
    for (let i = 0; i < 20; i++) {
        const k = (lo + hi) / 2;
        const fits = [[base.left, base.bottom], [base.right, base.bottom], [base.right, base.top], [base.left, base.top]]
            .every(([x, z]) => isVisible(x * k, z * k));
        if (fits) lo = k; else hi = k;
    }
    return { left: base.left * lo, right: base.right * lo, bottom: base.bottom * lo, top: base.top * lo };
}
