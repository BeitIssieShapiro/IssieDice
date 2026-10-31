import { computeVisibleFloorBounds, getUpFace, restingQuaternion, SpinnerSim } from "../src/spinner-sim";
import { SpinnerTipY } from "../src/scene-elements";

// deterministic pseudo random
function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

describe("SpinnerSim", () => {
    test("resting orientation shows the requested face up", () => {
        for (let face = 0; face < 4; face++) {
            const q = restingQuaternion(face);
            expect(getUpFace(q)).toBe(face);
            // handle (local +y) points to +z (top of screen)
            const handle = q.vmult({ x: 0, y: 1, z: 0 } as any);
            expect(handle.z).toBeCloseTo(1, 5);
        }
    });

    test("spinner spins, falls and settles on one of the 4 faces", () => {
        const counts = [0, 0, 0, 0];
        const runs = 100;
        for (let run = 0; run < runs; run++) {
            const sim = new SpinnerSim(mulberry32(run + 1));
            // alternate wide bounds and the tight ones of a tilted camera on a tablet
            const bounds = run % 2 ? { left: -12, right: 12, bottom: -9, top: 9 } : { left: -4, right: 4, bottom: -5.8, top: 5.8 };
            sim.setBounds(bounds);
            let settled = -1;
            sim.onSettled = (face) => settled = face;
            sim.spin();
            let t = 0;
            let minTipY = Infinity;
            let prevPhase = sim.phase;
            while (settled < 0 && t < 15) {
                sim.step(1 / 60);
                t += 1 / 60;
                if (prevPhase == "falling" && sim.phase == "settling") {
                    // physics stopped with the spinner lying on a side (not leaning on its tip)
                    const axis = (sim as any).settleFrom.vmult({ x: 0, y: 1, z: 0 });
                    expect(Math.abs(axis.y)).toBeLessThan(0.3);
                }
                prevPhase = sim.phase;
                if (sim.phase == "spinning") {
                    // standing on its tip (the floor is at -1)
                    expect(sim.body.position.y).toBeGreaterThan(-1 - SpinnerTipY - 0.2);
                }
                minTipY = Math.min(minTipY, sim.body.position.y);
            }
            expect(settled).toBeGreaterThanOrEqual(0);
            expect(sim.phase).toBe("idle");
            expect(sim.body.position.y).toBeCloseTo(0, 3);
            expect(getUpFace(sim.body.quaternion)).toBe(settled);
            expect(Math.abs(sim.body.position.x)).toBeLessThan(bounds.right);
            expect(Math.abs(sim.body.position.z)).toBeLessThan(bounds.top);
            // seen from the camera, turned around the spinner
            sim.applyViewTurn();
            // ends exactly in the resting orientation (face flat up, handle to the top of the screen)
            const rest = restingQuaternion(settled);
            const q = sim.body.quaternion;
            expect(Math.abs(q.x * rest.x + q.y * rest.y + q.z * rest.z + q.w * rest.w)).toBeCloseTo(1, 4);
            counts[settled]++;
        }
        console.log("face distribution", counts);
        counts.forEach(c => expect(c).toBeGreaterThan(runs / 10));
    });

    test("resting orientation follows the view direction", () => {
        const yaw = Math.PI / 8;
        for (let face = 0; face < 4; face++) {
            const q = restingQuaternion(face, yaw);
            expect(getUpFace(q)).toBe(face);
            const handle = q.vmult({ x: 0, y: 1, z: 0 } as any);
            expect(handle.x).toBeCloseTo(Math.sin(yaw), 5);
            expect(handle.z).toBeCloseTo(Math.cos(yaw), 5);
        }
    });

    test("visible floor bounds", () => {
        const fov = 2 * Math.atan(12 / 35);
        const base = { left: -6, right: 6, bottom: -8, top: 8 };
        // straight from the top (almost): limited by the visible half width 20 * tan(fov/2) * aspect
        const top = computeVisibleFloorBounds([0, 20, -0.001], fov, 0.75, 0, base);
        expect(top.right).toBeCloseTo(20 * Math.tan(fov / 2) * 0.75, 1);
        // tilted south-south-west: smaller, but still a reasonable area, centered on the origin
        const el = 55 * Math.PI / 180, az = 22.5 * Math.PI / 180;
        const pos = [-Math.sin(az) * Math.cos(el) * 20, Math.sin(el) * 20, -Math.cos(az) * Math.cos(el) * 20];
        const tilted = computeVisibleFloorBounds(pos, fov, 0.75, -1, base);
        console.log("tilted bounds", tilted);
        expect(tilted.right).toBeGreaterThan(3);
        expect(tilted.right).toBeLessThan(base.right * 1.5);
        expect(tilted.left).toBeCloseTo(-tilted.right, 5);
    });
});
