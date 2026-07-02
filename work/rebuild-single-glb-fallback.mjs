import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [, , name, fallbackKey, jsFile] = process.argv;

if (!name || !fallbackKey || !jsFile) {
  throw new Error("usage: node work/rebuild-single-glb-fallback.mjs <name> <fallbackKey> <jsFile>");
}

const assetDir = path.resolve("outputs/html-version/assets");
const glbPath = path.join(assetDir, `${name}.glb`);
const gzPath = path.join(assetDir, `${name}.glb.gz`);
const jsPath = path.join(assetDir, jsFile);

const glb = fs.readFileSync(glbPath);
const gz = zlib.gzipSync(glb, { level: 9 });
fs.writeFileSync(gzPath, gz);

const body = [
  "window.__LINGZHU_MODELS__ = window.__LINGZHU_MODELS__ || {};",
  `window.__LINGZHU_MODELS__[${JSON.stringify(fallbackKey)}] = ${JSON.stringify(gz.toString("base64"))};`,
  "",
].join("\n");

fs.writeFileSync(jsPath, body);
console.log(`${name}: ${glb.length} -> ${gz.length}`);
