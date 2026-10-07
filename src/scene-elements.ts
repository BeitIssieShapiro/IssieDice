import * as CANNON from "cannon-es";
import type { SpinnerShape } from "./models";


export function createFloor(world: CANNON.World): CANNON.Body {
    const floorBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
        position: new CANNON.Vec3(0, -1, 0),
    });
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * .5);
    world.addBody(floorBody);
    return floorBody;
}

export function createWall(world: CANNON.World, size: number[], position: [number, number, number]): CANNON.Body {
    const wall = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(...size)),
    });

    wall.position.set(...position);
    world.addBody(wall);
    return wall;
}

export function createDieShape(): CANNON.Body {

    // Define vertices as Cannon-es Vec3 objects.
    const vertices = [
        new CANNON.Vec3(1.0, 1.0, 1.0),    // 0
        new CANNON.Vec3(1.0, 1.0, -1.0),   // 1
        new CANNON.Vec3(1.0, -1.0, 1.0),   // 2
        new CANNON.Vec3(1.0, -1.0, -1.0),  // 3
        new CANNON.Vec3(-1.0, 1.0, 1.0),   // 4
        new CANNON.Vec3(-1.0, 1.0, -1.0),  // 5
        new CANNON.Vec3(-1.0, -1.0, 1.0),  // 6
        new CANNON.Vec3(-1.0, -1.0, -1.0)  // 7
    ];

    // Define faces as arrays of vertex indices.
    const faces = [
        [0, 4, 6, 2],  // face 1
        [3, 2, 6, 7],  // face 2
        [7, 6, 4, 5],  // face 3
        [5, 1, 3, 7],  // face 4
        [1, 0, 2, 3],  // face 5
        [5, 4, 0, 1]   // face 6
    ];

    // Create a convex polyhedron shape.
    const beveledCubeShape = new CANNON.ConvexPolyhedron({ vertices, faces });

    // Use the shape when creating a body.
    return new CANNON.Body({
        mass: 1,
        shape: beveledCubeShape,
    });
}

// Spinner (sevivon) geometry - keep in sync with design-resources/generate-spinner-glb.js
export const SpinnerTipY = -2.2;
const SpinnerHandleTop = 2.2;

/**
 * The rounded spinner's bottom, cut horizontally at ring k (0 = body bottom, `rings` = the tip):
 * a square of half size `h` at height `y` - its side profile is a quarter ellipse.
 */
export function roundedBottomRing(k: number, rings: number): { y: number, h: number } {
    const a = (k / rings) * Math.PI / 2;
    return { y: -1 - (-1 - SpinnerTipY) * Math.sin(a), h: Math.cos(a) };
}

const RoundedPhysicsRings = 6;

export function createSpinnerShape(shape: SpinnerShape = "classic"): CANNON.Body {
    const body = new CANNON.Body({ mass: 1 });

    // main body
    body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)));

    // below the body, down to the tip: square rings (the classic pyramid has none in between)
    // vertices are relative to the shape's own center, as cannon expects the origin inside the convex
    const tipCenterY = (SpinnerTipY - 1) / 2;
    const rings = shape == "rounded" ?
        Array.from({ length: RoundedPhysicsRings }, (_, k) => roundedBottomRing(k, RoundedPhysicsRings)) :
        [{ y: -1, h: 1 }];
    const vertices: CANNON.Vec3[] = [];
    rings.forEach(({ y, h }) => vertices.push(
        new CANNON.Vec3(-h, y - tipCenterY, h),
        new CANNON.Vec3(h, y - tipCenterY, h),
        new CANNON.Vec3(h, y - tipCenterY, -h),
        new CANNON.Vec3(-h, y - tipCenterY, -h),
    ));
    const tipIndex = vertices.length;
    vertices.push(new CANNON.Vec3(0, SpinnerTipY - tipCenterY, 0));

    // CCW when seen from outside
    const faces = [[0, 1, 2, 3]]; // top (towards the body)
    for (let r = 0; r < rings.length; r++) {
        const a = r * 4, b = (r + 1) * 4;
        for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4;
            faces.push(r + 1 < rings.length ? [a + j, a + i, b + i, b + j] : [a + j, a + i, tipIndex]);
        }
    }
    body.addShape(new CANNON.ConvexPolyhedron({ vertices, faces }), new CANNON.Vec3(0, tipCenterY, 0));

    // handle (approximated as a thin box)
    const handleHalfHeight = (SpinnerHandleTop - 1) / 2;
    body.addShape(
        new CANNON.Box(new CANNON.Vec3(0.2, handleHalfHeight, 0.2)),
        new CANNON.Vec3(0, 1 + handleHalfHeight, 0)
    );
    return body;
}
