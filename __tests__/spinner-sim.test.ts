import { getUpFace, restingQuaternion, SpinnerSim } from "../src/spinner-sim";

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

    test("spins, falls and settles on one of the 4 faces", () => {
        const counts = [0, 0, 0, 0];
        const runs = 100;
        for (let run = 0; run < runs; run++) {
            const sim = new SpinnerSim(mulberry32(run + 1));
            sim.setBounds({ left: -12, right: 12, bottom: -9, top: 9 });
            let settled = -1;
            sim.onSettled = (face) => settled = face;
            sim.spin();
            let t = 0;
            let minTipY = Infinity;
            while (settled < 0 && t < 15) {
                sim.step(1 / 60);
                t += 1 / 60;
                if (sim.phase == "spinning") {
                    expect(sim.body.position.y).toBeGreaterThan(1);
                }
                minTipY = Math.min(minTipY, sim.body.position.y);
            }
            expect(settled).toBeGreaterThanOrEqual(0);
            expect(sim.phase).toBe("idle");
            expect(sim.body.position.y).toBeCloseTo(0, 3);
            expect(getUpFace(sim.body.quaternion)).toBe(settled);
            expect(Math.abs(sim.body.position.x)).toBeLessThan(12);
            expect(Math.abs(sim.body.position.z)).toBeLessThan(9);
            counts[settled]++;
        }
        console.log("face distribution", counts);
        counts.forEach(c => expect(c).toBeGreaterThan(runs / 10));
    });
});
