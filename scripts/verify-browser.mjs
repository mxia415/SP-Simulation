import { chromium } from "../work/node_modules/playwright/index.mjs";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const targetUrl = process.env.SPS_VERIFY_URL || "http://localhost:4174/outputs/html-version/";
const defaultUrl = "http://localhost:4174/outputs/html-version/";

function contentTypeFor(filePath) {
  return {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".glb": "model/gltf-binary",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  }[extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function canReach(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function startStaticServerIfNeeded() {
  if (targetUrl !== defaultUrl || await canReach(targetUrl)) return null;
  const root = normalize(join(import.meta.dirname, ".."));
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", defaultUrl);
    const pathname = decodeURIComponent(requestUrl.pathname);
    let relativePath = pathname === "/" ? "outputs/html-version/" : pathname.replace(/^\/+/, "");
    if (relativePath.endsWith("/")) relativePath += "index.html";
    const filePath = normalize(join(root, relativePath));
    if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(4174, "::", () => {
      server.off("error", reject);
      resolve();
    });
  });
  return server;
}

const staticServer = await startStaticServerIfNeeded();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__lingzhuDebug && window.__spsQtStage, null, { timeout: 30000 });
  await page.waitForFunction(
    () => window.__lingzhuDebug?.importedLinearPath?.sourceName === "cuboid-4000x2700x3300-layer20-y3600-viewXYZ.csv",
    null,
    { timeout: 10000 },
  );

  const defaultResult = await page.evaluate(() => ({
    modeButtonActive: document.querySelector("#linearModeButton")?.classList.contains("is-active"),
    driveLinearVisible: document.querySelector("#linearPanel") ? !document.querySelector("#linearPanel").hidden : true,
    pointCount: document.querySelector("#linearPathPointCount")?.value,
    status: document.querySelector("#linearPathStatus")?.value,
    ikMode: document.querySelector("#linearIkMode")?.value,
    debug: window.__lingzhuDebug.importedLinearPath,
    pathRender: window.__lingzhuDebug.pathRender,
  }));

  if (!defaultResult.modeButtonActive || !defaultResult.debug?.active || defaultResult.debug?.pointCount !== 1163) {
    throw new Error(`Default cuboid path must be imported on startup: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (defaultResult.ikMode !== "original") {
    throw new Error(`Default IK mode must be Original: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (defaultResult.pathRender?.pointMarkers !== 0) {
    throw new Error(`Default imported cuboid path must not show point markers: ${JSON.stringify(defaultResult, null, 2)}`);
  }

  const csv = [
    "x,y,z",
    "3600,-800,1200",
    "3800,-700,1260",
    "4100,-500,1320",
  ].join("\n");

  await page.locator("#linearPathFile").setInputFiles({
    name: "path.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.waitForFunction(() => window.__lingzhuDebug?.importedLinearPath?.pointCount === 4, null, {
    timeout: 10000,
  });
  await page.selectOption("#linearPathMode", "points");
  await page.fill("#linearProgressNumber", "50");
  await page.dispatchEvent("#linearProgressNumber", "change");

  const result = await page.evaluate(() => ({
    status: document.querySelector("#linearPathStatus")?.value,
    pointCount: document.querySelector("#linearPathPointCount")?.value,
    coordinateNote: document.querySelector(".coordinate-note")?.textContent,
    mode: document.querySelector("#linearPathMode")?.value,
    ikMode: document.querySelector("#linearIkMode")?.value,
    debug: window.__lingzhuDebug.importedLinearPath,
    linearMotion: window.__lingzhuDebug.linearMotion,
    pathRender: window.__lingzhuDebug.pathRender,
    actuatorBallStickOnly: window.__lingzhuDebug.actuatorBallStickOnly,
    actuatorBallStickOnlyChecked: document.querySelector("#actuatorBallStickOnly")?.checked,
    glbPoseDetailsOpen: document.querySelector("#glbPoseControls")?.open,
    coordinateSystem: window.__lingzhuDebug.coordinateSystem,
    linearPathObjectCount: window.__lingzhuDebug.linearPathObjectCount,
    scriptVersion: window.__lingzhuDebug.scriptVersion,
    pose: window.__lingzhuDebug.pose,
    solveErrorText: document.querySelector("#linearSolveError")?.value,
    bootErrors: window.__lingzhuBootErrors,
  }));

  if (errors.length || result.bootErrors?.length) {
    throw new Error(JSON.stringify({ errors, result }, null, 2));
  }
  if (result.pointCount !== "4" || result.mode !== "points" || !result.debug?.active) {
    throw new Error(`Path import verification failed: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.ikMode !== "original" || result.linearMotion?.ikMode !== "original") {
    throw new Error(`Original IK mode must be reflected in debug state: ${JSON.stringify(result, null, 2)}`);
  }
  const firstImportedPoint = { x: 3600, y: -800, z: 1200 };
  const simulationPath = result.linearMotion?.pathPoints || [];
  const pathStartsAtImportedPoint = ["x", "y", "z"].every(
    (axis) => Math.abs(Number(simulationPath[0]?.[axis]) - firstImportedPoint[axis]) < 0.01,
  );
  const secondPointIsImportedStart = ["x", "y", "z"].every(
    (axis) => Math.abs(Number(simulationPath[1]?.[axis]) - firstImportedPoint[axis]) < 0.01,
  );
  if (simulationPath.length !== 4 || pathStartsAtImportedPoint || !secondPointIsImportedStart) {
    throw new Error(`Imported path must be prefixed by the fixed vertical-pose point: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.actuatorBallStickOnly !== true || result.actuatorBallStickOnlyChecked !== true) {
    throw new Error(`Actuator-only ball-stick mode must be enabled by default: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.glbPoseDetailsOpen !== false) {
    throw new Error(`GLB pose controls must be collapsed by default: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.pathRender?.walkedSegments < 1 || result.pathRender?.remainingSegments < 1) {
    throw new Error(`Imported path must render walked solid and remaining dashed segments: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.pathRender?.pointMarkers !== 0) {
    throw new Error(`Imported CSV path must not show point markers: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.pathRender?.lineRenderer !== "fat-line" || result.pathRender?.lineWidthPx < 4) {
    throw new Error(`Imported CSV path must use thick fat-line rendering: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.pathRender?.remainingLineWidthPx >= result.pathRender?.lineWidthPx) {
    throw new Error(`Unwalked dashed path must be thinner than walked path: ${JSON.stringify(result, null, 2)}`);
  }
  if (!(result.pathRender?.remainingLineWidthPx < 3)) {
    throw new Error(`Unwalked dashed path must continue thinner than 3px: ${JSON.stringify(result, null, 2)}`);
  }
  if (Math.abs((result.pathRender?.remainingOpacity ?? NaN) - 0.05) > 0.001) {
    throw new Error(`Unwalked dashed path opacity must be 5%: ${JSON.stringify(result, null, 2)}`);
  }
  if (!(result.pathRender?.remainingDashOffset > 0)) {
    throw new Error(`Unwalked dashed path must keep a fixed phase using cumulative path distance: ${JSON.stringify(result, null, 2)}`);
  }
  const poseStillVertical =
    Math.abs(result.pose?.arm1 - 90) < 0.01 &&
    Math.abs(result.pose?.arm2 - 90) < 0.01 &&
    Math.abs(result.pose?.arm3 - 90) < 0.01 &&
    Math.abs(result.pose?.base) < 0.01;
  const solveError = Number.parseFloat(result.solveErrorText || "NaN");
  if (poseStillVertical || !Number.isFinite(solveError) || solveError > 100) {
    throw new Error(`Imported CSV progress must solve a non-vertical pose with low error: ${JSON.stringify(result, null, 2)}`);
  }
  if (!result.coordinateSystem?.includes("3D视角 X/Y/Z") || !result.coordinateNote?.includes("Z为高度")) {
    throw new Error(`Coordinate note verification failed: ${JSON.stringify(result, null, 2)}`);
  }

  await page.selectOption("#linearIkMode", "improved");
  await page.fill("#linearProgressNumber", "50");
  await page.dispatchEvent("#linearProgressNumber", "change");
  const improvedResult = await page.evaluate(() => ({
    ikMode: document.querySelector("#linearIkMode")?.value,
    linearMotion: window.__lingzhuDebug.linearMotion,
    solveErrorText: document.querySelector("#linearSolveError")?.value,
    bootErrors: window.__lingzhuBootErrors,
  }));
  if (improvedResult.bootErrors?.length) {
    throw new Error(`Improved IK switch produced boot errors: ${JSON.stringify(improvedResult, null, 2)}`);
  }
  if (improvedResult.ikMode !== "improved" || improvedResult.linearMotion?.ikMode !== "improved") {
    throw new Error(`Improved IK mode must be selectable and reflected in debug state: ${JSON.stringify(improvedResult, null, 2)}`);
  }
  if (!Number.isFinite(improvedResult.linearMotion?.previousIkDelta?.arm1)) {
    throw new Error(`Improved IK simulation must retain previous joint delta: ${JSON.stringify(improvedResult, null, 2)}`);
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => staticServer?.close(resolve) ?? resolve());
}
