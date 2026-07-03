import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const packageJsonPath = new URL("../package.json", import.meta.url);
assert.ok(existsSync(packageJsonPath), "root package.json should exist for Cloudflare npm run build");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
assert.equal(packageJson.scripts?.build, "node scripts/build-cloudflare-pages.mjs");

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });
const build = spawnSync("npm", ["run", "build"], {
  cwd: new URL("..", import.meta.url),
  encoding: "utf8",
});

assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
assert.ok(existsSync(new URL("../dist/index.html", import.meta.url)), "dist/index.html should be generated");
assert.ok(existsSync(new URL("../dist/assets", import.meta.url)), "dist/assets should be generated");

const indexHtml = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
assert.match(indexHtml, /app-bundle\.js/);
assert.match(indexHtml, /styles\.css/);

console.log("cloudflare build test passed");
