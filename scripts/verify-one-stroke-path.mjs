import { readFileSync } from "node:fs";

const pathFile = "outputs/html-version/assets/paths/cuboid-4000x2700x3300-layer200-y3600-viewXYZ.csv";
const raw = readFileSync(pathFile, "utf8").trim();
const lines = raw.split(/\r?\n/);
const [header, ...body] = lines;
if (header.trim() !== "x,y,z") throw new Error(`Unexpected CSV header: ${header}`);

const points = body.map((line, index) => {
  const values = line.split(",").map(Number);
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Invalid numeric row ${index + 2}: ${line}`);
  }
  const [x, y, z] = values;
  return { x, y, z, row: index + 2 };
});

const byLayer = new Map();
for (const point of points) {
  const key = point.z.toFixed(6);
  if (!byLayer.has(key)) byLayer.set(key, []);
  byLayer.get(key).push(point);
}

function nearlyEqual(a, b, tolerance = 1e-6) {
  return Math.abs(a - b) <= tolerance;
}

function sameXY(a, b) {
  return nearlyEqual(a.x, b.x) && nearlyEqual(a.y, b.y);
}

function orientation(a, b, c) {
  const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (Math.abs(value) < 1e-7) return 0;
  return Math.sign(value);
}

function isBetween(a, b, c) {
  return (
    Math.min(a.x, b.x) - 1e-7 <= c.x &&
    c.x <= Math.max(a.x, b.x) + 1e-7 &&
    Math.min(a.y, b.y) - 1e-7 <= c.y &&
    c.y <= Math.max(a.y, b.y) + 1e-7 &&
    orientation(a, b, c) === 0
  );
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && isBetween(a, b, c)) ||
    (o2 === 0 && isBetween(a, b, d)) ||
    (o3 === 0 && isBetween(c, d, a)) ||
    (o4 === 0 && isBetween(c, d, b))
  );
}

function segmentKey(a, b) {
  const first = `${a.x.toFixed(6)},${a.y.toFixed(6)}`;
  const second = `${b.x.toFixed(6)},${b.y.toFixed(6)}`;
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

const expectedLayers = 18;
const expectedLayerHeight = 200;
const errors = [];
const layerEntries = [...byLayer.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));

if (layerEntries.length !== expectedLayers) {
  errors.push(`Expected ${expectedLayers} layers, found ${layerEntries.length}`);
}

for (let layerIndex = 0; layerIndex < layerEntries.length; layerIndex += 1) {
  const [zKey, layer] = layerEntries[layerIndex];
  const z = Number(zKey);
  const expectedZ = layerIndex === layerEntries.length - 1 ? 3300 : layerIndex * expectedLayerHeight;
  if (!nearlyEqual(z, expectedZ)) errors.push(`Layer ${layerIndex} expected Z=${expectedZ}, found ${z}`);
  if (layer.length < 4) {
    errors.push(`Layer Z=${z} has too few points for a closed one-stroke outline`);
    continue;
  }
  if (!sameXY(layer[0], layer[layer.length - 1])) {
    errors.push(`Layer Z=${z} must close at the same XY point for one-stroke outline`);
  }

  const seenPoints = new Set();
  for (let index = 0; index < layer.length; index += 1) {
    const key = `${layer[index].x.toFixed(6)},${layer[index].y.toFixed(6)}`;
    const isAllowedClosure = index === layer.length - 1 && sameXY(layer[index], layer[0]);
    if (seenPoints.has(key) && !isAllowedClosure) {
      errors.push(`Layer Z=${z} repeats XY point at row ${layer[index].row}`);
      break;
    }
    seenPoints.add(key);
  }

  const segments = [];
  const seenSegments = new Set();
  for (let index = 1; index < layer.length; index += 1) {
    const start = layer[index - 1];
    const end = layer[index];
    if (sameXY(start, end)) {
      errors.push(`Layer Z=${z} has zero-length segment at row ${end.row}`);
      continue;
    }
    const key = segmentKey(start, end);
    if (seenSegments.has(key)) errors.push(`Layer Z=${z} repeats segment ending at row ${end.row}`);
    seenSegments.add(key);
    segments.push({ start, end, index: index - 1 });
  }

  for (let a = 0; a < segments.length; a += 1) {
    for (let b = a + 1; b < segments.length; b += 1) {
      const adjacent = Math.abs(segments[a].index - segments[b].index) <= 1;
      const closingPair = a === 0 && b === segments.length - 1;
      if (adjacent || closingPair) continue;
      if (segmentsIntersect(segments[a].start, segments[a].end, segments[b].start, segments[b].end)) {
        errors.push(`Layer Z=${z} has overlapping/intersecting segments ending at rows ${segments[a].end.row} and ${segments[b].end.row}`);
        break;
      }
    }
  }
}

for (let index = 1; index < layerEntries.length; index += 1) {
  const previous = layerEntries[index - 1][1];
  const current = layerEntries[index][1];
  const previousEnd = previous[previous.length - 1];
  const currentStart = current[0];
  if (!sameXY(previousEnd, currentStart)) {
    errors.push(`Layer transition ${index - 1}->${index} must rise vertically at the same XY`);
  }
}

const minX = Math.min(...points.map((point) => point.x));
const maxX = Math.max(...points.map((point) => point.x));
const minY = Math.min(...points.map((point) => point.y));
const maxY = Math.max(...points.map((point) => point.y));
const minZ = Math.min(...points.map((point) => point.z));
const maxZ = Math.max(...points.map((point) => point.z));
if (minX < 3600 - 1e-6 || maxX > 6300 + 1e-6) errors.push(`X range ${minX}..${maxX} outside 3600..6300`);
if (minY < -2000 - 1e-6 || maxY > 2000 + 1e-6) errors.push(`Y range ${minY}..${maxY} outside -2000..2000`);
if (!nearlyEqual(minZ, 0) || !nearlyEqual(maxZ, 3300)) errors.push(`Z range ${minZ}..${maxZ} must be 0..3300`);
if (!nearlyEqual(maxX - minX, 2700)) errors.push(`X span ${maxX - minX} must be 2700`);
if (!nearlyEqual(maxY - minY, 4000)) errors.push(`Y span ${maxY - minY} must be 4000`);

const maxErrorsToShow = 12;
if (errors.length) {
  throw new Error(`One-stroke path verification failed:\n${errors.slice(0, maxErrorsToShow).join("\n")}\nTotal errors: ${errors.length}`);
}

console.log(JSON.stringify({
  file: pathFile,
  points: points.length,
  layers: layerEntries.length,
  xRange: [minX, maxX],
  yRange: [minY, maxY],
  zRange: [minZ, maxZ],
}, null, 2));
