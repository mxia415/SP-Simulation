import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "outputs", "html-version");
const dist = join(root, "dist");

for (const required of ["index.html", "styles.css", "app-bundle.js", "assets"]) {
  const target = join(source, required);
  if (!existsSync(target)) {
    throw new Error(`Missing HTML version resource: ${target}`);
  }
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(source, dist, {
  recursive: true,
  filter: (path) => !path.endsWith(".DS_Store"),
});

const html = readFileSync(join(dist, "index.html"), "utf8");
for (const reference of ["./styles.css", "./app-bundle.js"]) {
  if (!html.includes(reference)) {
    throw new Error(`dist/index.html is missing expected reference: ${reference}`);
  }
}

console.log("Cloudflare Pages build complete: dist/");
