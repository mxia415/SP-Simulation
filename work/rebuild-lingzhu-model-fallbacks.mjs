import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const assetDir = path.resolve("outputs/lingzhu-control/assets");
const items = [
  ["base", "base", "base-model.js"],
  ["base_link", "baseLink", "base-link-model.js"],
  ["arm1", "arm1", "arm1-model.js"],
  ["arm2", "arm2", "arm2-model.js"],
  ["arm3", "arm3", "arm3-model.js"],
  ["arm4", "arm4", "arm4-model.js"],
];

for (const [name, key, jsFile] of items) {
  const glbPath = path.join(assetDir, `${name}.glb`);
  const gzPath = path.join(assetDir, `${name}.glb.gz`);
  const jsPath = path.join(assetDir, jsFile);
  const glb = fs.readFileSync(glbPath);
  const gz = zlib.gzipSync(glb, { level: 9 });
  fs.writeFileSync(gzPath, gz);
  const body = [
    "window.__LINGZHU_MODELS__ = window.__LINGZHU_MODELS__ || {};",
    `window.__LINGZHU_MODELS__.${key} = ${JSON.stringify(gz.toString("base64"))};`,
    "",
  ].join("\n");
  fs.writeFileSync(jsPath, body);
  console.log(`${name}: ${glb.length} -> ${gz.length}`);
}
