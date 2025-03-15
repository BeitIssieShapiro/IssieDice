import * as CANNON from "cannon-es";


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