import fs from "node:fs";
import path from "node:path";
import * as THREE from "../../../work/node_modules/three/build/three.module.js";
import { GLTFLoader } from "../../../work/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../../../work/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js";

const input = "outputs/lingzhu-control/assets/base.glb";
const outDir = "outputs/sps_qt_gui/assets";
const objOutput = path.join(outDir, "base_local.obj");
const stlOutput = path.join(outDir, "base_local.stl");
const maxTriangles = 0;
const minArea = 0.00002;

function areaOf(triangle) {
  const a = new THREE.Vector3(...triangle[0]);
  const b = new THREE.Vector3(...triangle[1]);
  const c = new THREE.Vector3(...triangle[2]);
  return new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).length() * 0.5;
}

function normalOf(triangle) {
  const a = new THREE.Vector3(...triangle[0]);
  const b = new THREE.Vector3(...triangle[1]);
  const c = new THREE.Vector3(...triangle[2]);
  const normal = new THREE.Vector3().crossVectors(b.sub(a), c.sub(a));
  if (normal.lengthSq() < 1e-12) return [0, 1, 0];
  normal.normalize();
  return [normal.x, normal.y, normal.z];
}

function writeObj(triangles) {
  let text = "# Local SP-S base model decoded from outputs/lingzhu-control/assets/base.glb\n";
  text += "# Degenerate triangles removed; largest faces retained for stable native rendering.\n";
  text += "o base_local\n";
  for (const triangle of triangles) {
    for (const vertex of triangle) {
      text += `v ${vertex[0].toFixed(6)} ${vertex[1].toFixed(6)} ${vertex[2].toFixed(6)}\n`;
    }
  }
  for (let i = 0; i < triangles.length; i += 1) {
    const vertex = i * 3 + 1;
    text += `f ${vertex} ${vertex + 1} ${vertex + 2}\n`;
  }
  fs.writeFileSync(objOutput, text);
}

function writeBinaryStl(triangles) {
  const buffer = Buffer.alloc(84 + triangles.length * 50);
  buffer.write("SP-S base local STL from HTML GLB", 0, "ascii");
  buffer.writeUInt32LE(triangles.length, 80);
  let offset = 84;
  for (const triangle of triangles) {
    const normal = normalOf(triangle);
    for (const value of normal) {
      buffer.writeFloatLE(value, offset);
      offset += 4;
    }
    for (const vertex of triangle) {
      for (const value of vertex) {
        buffer.writeFloatLE(value, offset);
        offset += 4;
      }
    }
    buffer.writeUInt16LE(0, offset);
    offset += 2;
  }
  fs.writeFileSync(stlOutput, buffer);
}

fs.mkdirSync(outDir, { recursive: true });

const bytes = fs.readFileSync(input);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((resolve, reject) => {
  loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "", resolve, reject);
});

gltf.scene.updateWorldMatrix(true, true);
const triangles = [];
gltf.scene.traverse((object) => {
  if (!object.isMesh || !object.geometry?.attributes?.position) return;

  const geometry = object.geometry;
  const positions = geometry.attributes.position;
  const index = geometry.index;
  const matrix = object.matrixWorld;
  const vertexAt = (i) => {
    const vertex = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(matrix);
    return [vertex.x, vertex.y, vertex.z];
  };
  const pushTriangle = (a, b, c) => {
    const triangle = [a, b, c];
    if (areaOf(triangle) > minArea) triangles.push(triangle);
  };

  if (index) {
    for (let i = 0; i + 2 < index.count; i += 3) {
      pushTriangle(vertexAt(index.getX(i)), vertexAt(index.getX(i + 1)), vertexAt(index.getX(i + 2)));
    }
  } else {
    for (let i = 0; i + 2 < positions.count; i += 3) {
      pushTriangle(vertexAt(i), vertexAt(i + 1), vertexAt(i + 2));
    }
  }
});

triangles.sort((a, b) => areaOf(b) - areaOf(a));
const selected = maxTriangles > 0 ? triangles.slice(0, maxTriangles) : triangles;
writeObj(selected);
writeBinaryStl(selected);

console.log(JSON.stringify({
  input,
  nondegenerateTriangles: triangles.length,
  exportedTriangles: selected.length,
  objOutput,
  stlOutput,
}, null, 2));
