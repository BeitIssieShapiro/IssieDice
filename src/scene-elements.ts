import * as CANNON from "cannon-es";


export function createFloor(world: CANNON.World): CANNON.Body {
    const floorBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
        position:new CANNON.Vec3(0,-1,0),
    });
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * .5);
    world.addBody(floorBody);
    return floorBody;
}

export function createWall(world: CANNON.World, size:number[], position:[number, number, number]): CANNON.Body {
    const wall = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(...size)),
    });

    wall.position.set(...position);
    world.addBody(wall);
    return wall;
}