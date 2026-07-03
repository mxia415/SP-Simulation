import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import * as THREE from "../work/node_modules/three/build/three.module.js";
import {
  COORDINATE_SYSTEM_NOTE,
  DEVICE_SCENE_ROTATION_Y_RAD,
  deviceToSceneVectorData,
  sceneToDevicePointData,
} from "../outputs/html-version/coordinates.mjs";

const appSource = readFileSync("outputs/html-version/app.mjs", "utf8");

const devicePoint = { x: 1200, y: 3600, z: 3300 };
const sceneVector = deviceToSceneVectorData(devicePoint, 0.001);
assert.ok(Math.abs(sceneVector.x - 1.2) < 1e-9);
assert.ok(Math.abs(sceneVector.y - 3.3) < 1e-9);
assert.ok(Math.abs(sceneVector.z - 3.6) < 1e-9);
const roundTripPoint = sceneToDevicePointData(sceneVector, 0.001);
assert.ok(Math.abs(roundTripPoint.x - devicePoint.x) < 1e-9);
assert.ok(Math.abs(roundTripPoint.y - devicePoint.y) < 1e-9);
assert.ok(Math.abs(roundTripPoint.z - devicePoint.z) < 1e-9);

assert.match(COORDINATE_SYSTEM_NOTE, /3D视角 X\/Y\/Z/);
assert.match(COORDINATE_SYSTEM_NOTE, /Z为高度/);
assert.match(COORDINATE_SYSTEM_NOTE, /X\+向左上、Y\+向右上/);
assert.match(appSource, /deviceToScene\(/);
assert.match(appSource, /sceneToDevice\(/);
assert.doesNotMatch(appSource, /function toThree\(/);
assert.doesNotMatch(appSource, /function toWorld\(/);
assert.match(appSource, /deviceSceneRoot\.rotation\.y = DEVICE_SCENE_ROTATION_Y_RAD/);
assert.doesNotMatch(appSource, /staticGuideRoot\.rotation/);
assert.match(appSource, /class="coordinate-note">\$\{COORDINATE_SYSTEM_NOTE\}/);
assert.match(appSource, /coordinateSystem:\s*COORDINATE_SYSTEM_NOTE/);

const camera = new THREE.PerspectiveCamera(42, 1440 / 900, 0.08, 85);
camera.position.set(9.5, 7.2, 11.6);
camera.lookAt(new THREE.Vector3(0.8, 2.2, 0));
camera.updateMatrixWorld();
camera.updateProjectionMatrix();

function projectDevicePoint(point) {
  const scenePoint = deviceToSceneVectorData(point, 0.001);
  return new THREE.Vector3(scenePoint.x, scenePoint.y, scenePoint.z)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), DEVICE_SCENE_ROTATION_Y_RAD)
    .project(camera);
}

const projectedOrigin = projectDevicePoint({ x: 0, y: 0, z: 0 });
const projectedXPlus = projectDevicePoint({ x: 2000, y: 0, z: 0 });
const projectedYPlus = projectDevicePoint({ x: 0, y: 2000, z: 0 });
assert.ok(projectedXPlus.x < projectedOrigin.x, "Default 3D view must show X+ toward screen left");
assert.ok(projectedXPlus.y > projectedOrigin.y, "Default 3D view must show X+ toward screen up");
assert.ok(projectedYPlus.x > projectedOrigin.x, "Default 3D view must show Y+ toward screen right");
assert.ok(projectedYPlus.y > projectedOrigin.y, "Default 3D view must show Y+ toward screen up");

console.log("Coordinate system verification passed.");
