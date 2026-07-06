import { writeFileSync } from "node:fs";

const outputFile = "outputs/html-version/assets/paths/cuboid-4000x2700x3300-layer200-y3600-viewXYZ.csv";

const minX = 3600;
const maxX = 6300;
const minY = -2000;
const maxY = 2000;
const minZ = 0;
const maxZ = 3300;
const layerHeight = 200;
const layerZValues = [];
for (let z = minZ; z <= maxZ; z += layerHeight) layerZValues.push(z);
if (layerZValues[layerZValues.length - 1] !== maxZ) layerZValues.push(maxZ);

function round(value) {
  return Number(value.toFixed(2));
}

function point(x, y, z) {
  return [round(x), round(y), round(z)];
}

function layerOutline(z, layerIndex) {
  const wave = Math.sin(layerIndex * 0.31);
  const wave2 = Math.cos(layerIndex * 0.23);
  const shoulderX = 4550 + 190 * wave;
  const lowerY = -1880 - 70 * wave2;
  const upperY = -lowerY;
  const rightInsetY = 1280 + 120 * Math.sin(layerIndex * 0.17);

  return [
    point(minX, minY, z),
    point(shoulderX, lowerY, z),
    point(maxX, -rightInsetY, z),
    point(maxX, rightInsetY, z),
    point(shoulderX, upperY, z),
    point(minX, maxY, z),
    point(minX, minY, z),
  ];
}

const rows = [["x", "y", "z"]];
for (let layerIndex = 0; layerIndex < layerZValues.length; layerIndex += 1) {
  const z = layerZValues[layerIndex];
  for (const row of layerOutline(z, layerIndex)) rows.push(row);
}

writeFileSync(outputFile, `${rows.map((row) => row.join(",")).join("\n")}\n`);

console.log(JSON.stringify({
  outputFile,
  points: rows.length - 1,
  layers: layerZValues.length,
  layerHeight,
  xRange: [minX, maxX],
  yRange: [minY, maxY],
  zRange: [minZ, maxZ],
  note: "Each layer is one closed, non-self-intersecting stroke symmetric about the X axis.",
}, null, 2));
