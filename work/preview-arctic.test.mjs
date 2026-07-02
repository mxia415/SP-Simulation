import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const htmlPath = new URL("../outputs/lingzhu-control/preview.html", import.meta.url);
const scriptPath = new URL("../outputs/lingzhu-control/preview-arctic.mjs", import.meta.url);

const html = await readFile(htmlPath, "utf8");
const script = await readFile(scriptPath, "utf8");

assert.match(html, /<title>SP-S Arctic Preview<\/title>/);
assert.match(html, /preview-arctic\.mjs/);
assert.doesNotMatch(html, /app\.mjs|app-bundle\.js|app-standalone\.js/);

assert.match(script, /SSAO_PASS_ENABLED/);
assert.match(script, /ARCTIC_MATERIAL/);
assert.match(script, /DecompressionStream\("gzip"\)/);
assert.match(script, /assets\/arm1\.glb\.gz/);
assert.doesNotMatch(script, /from "\.\/app\.mjs"/);
