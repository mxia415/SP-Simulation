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
    () => window.__lingzhuDebug?.importedLinearPath?.sourceName === "cuboid-4000x2700x3300-layer200-y3600-viewXYZ.csv",
    null,
    { timeout: 10000 },
  );
  await page.waitForFunction(
    () => Object.keys(window.__lingzhuDebug || {})
      .filter((key) => key.endsWith("Model"))
      .every((key) => window.__lingzhuDebug[key]?.loaded),
    null,
    { timeout: 90000 },
  );

  const defaultResult = await page.evaluate(() => ({
    modeButtonActive: document.querySelector("#linearModeButton")?.classList.contains("is-active"),
    driveLinearVisible: document.querySelector("#linearPanel") ? !document.querySelector("#linearPanel").hidden : true,
    pointCount: document.querySelector("#linearPathPointCount")?.value,
    status: document.querySelector("#linearPathStatus")?.value,
    demoPanelTitle: document.querySelector(".linear-import-head strong")?.textContent?.trim(),
    demoButtonText: document.querySelector("#loadDemoPath")?.textContent?.trim(),
    legacyFileInputExists: Boolean(document.querySelector("#linearPathFile")),
    ikMode: document.querySelector("#linearIkMode")?.value,
    ikModeOptions: Array.from(document.querySelectorAll("#linearIkMode option")).map((option) => ({
      value: option.value,
      label: option.textContent,
    })),
    theme: document.documentElement.dataset.theme,
    themeButtons: Array.from(document.querySelectorAll("[data-theme-choice]")).map((button) => ({
      value: button.dataset.themeChoice,
      pressed: button.getAttribute("aria-pressed"),
    })),
    toolRange: {
      sliderMin: document.querySelector("#offset")?.min,
      sliderMax: document.querySelector("#offset")?.max,
      numberMin: document.querySelector("#offsetNumber")?.min,
      numberMax: document.querySelector("#offsetNumber")?.max,
    },
    jointRanges: {
      arm2: {
        sliderMin: document.querySelector("#arm2")?.min,
        sliderMax: document.querySelector("#arm2")?.max,
        numberMin: document.querySelector("#arm2Number")?.min,
        numberMax: document.querySelector("#arm2Number")?.max,
      },
      arm3: {
        sliderMin: document.querySelector("#arm3")?.min,
        sliderMax: document.querySelector("#arm3")?.max,
        numberMin: document.querySelector("#arm3Number")?.min,
        numberMax: document.querySelector("#arm3Number")?.max,
      },
    },
    presets: Array.from(document.querySelectorAll(".preset-button")).map((button) => ({
      label: button.querySelector("strong")?.textContent,
      values: button.querySelector("span")?.textContent,
    })),
    debug: window.__lingzhuDebug.importedLinearPath,
    pathRender: window.__lingzhuDebug.pathRender,
    scriptVersion: window.__lingzhuDebug.scriptVersion,
    glbAnchorErrors: Object.keys(window.__lingzhuDebug)
      .filter((key) => key.endsWith("Model"))
      .map((key) => {
        const model = window.__lingzhuDebug[key];
        const modelAnchor = model?.modelAnchorWorld;
        const targetAnchor = model?.targetAnchorWorld;
        const error = modelAnchor && targetAnchor
          ? Math.hypot(
              (modelAnchor.x || 0) - (targetAnchor.x || 0),
              (modelAnchor.y || 0) - (targetAnchor.y || 0),
              (modelAnchor.z || 0) - (targetAnchor.z || 0),
            )
          : null;
        return { key, follows: model?.follows, error };
      })
      .filter((item) => item.follows && item.error !== null),
  }));

  if (!defaultResult.modeButtonActive || !defaultResult.debug?.active || defaultResult.debug?.pointCount !== 127) {
    throw new Error(`Default cuboid path must be imported on startup: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (defaultResult.ikMode !== "active5_dls") {
    throw new Error(`Default IK mode must be Active-5 3D DLS for imported path simulation: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (defaultResult.scriptVersion !== "20260722-demo-path-v18") {
    throw new Error(`Script version must cache-bust the demo path update: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  const glbAnchorMiss = defaultResult.glbAnchorErrors.find((item) => item.error > 0.001);
  if (glbAnchorMiss) {
    throw new Error(`GLB follow anchors must remain attached to the corrected ball-stick coordinates: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (defaultResult.theme !== "dark") {
    throw new Error(`Default theme must remain dark: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (JSON.stringify(defaultResult.themeButtons) !== JSON.stringify([
    { value: "dark", pressed: "true" },
    { value: "light", pressed: "false" },
  ])) {
    throw new Error(`Theme switch must expose dark and light options: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (JSON.stringify(defaultResult.ikModeOptions) !== JSON.stringify([
    { value: "original", label: "Original" },
    { value: "balanced", label: "Balanced" },
    { value: "improved", label: "Improved" },
    { value: "phi_scan", label: "Phi Scan" },
    { value: "active5_dls", label: "Active-5 3D DLS" },
  ])) {
    throw new Error(`IK selector must expose all five Python simulation algorithms: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (defaultResult.pathRender?.pointMarkers !== 0) {
    throw new Error(`Default imported cuboid path must not show point markers: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (
    defaultResult.demoPanelTitle !== "路径演示" ||
    defaultResult.demoButtonText !== "演示路径" ||
    defaultResult.legacyFileInputExists
  ) {
    throw new Error(`Linear path panel must expose demo path controls without CSV/JSON upload: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (
    defaultResult.toolRange?.sliderMin !== "-55" ||
    defaultResult.toolRange?.sliderMax !== "150" ||
    defaultResult.toolRange?.numberMin !== "-55" ||
    defaultResult.toolRange?.numberMax !== "150"
  ) {
    throw new Error(`Print head controls must expose -55..150 degree range: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (
    defaultResult.jointRanges?.arm2?.sliderMin !== "16.0271" ||
    defaultResult.jointRanges?.arm2?.sliderMax !== "177.9644" ||
    defaultResult.jointRanges?.arm2?.numberMin !== "16.0271" ||
    defaultResult.jointRanges?.arm2?.numberMax !== "177.9644" ||
    defaultResult.jointRanges?.arm3?.sliderMin !== "10.4567" ||
    defaultResult.jointRanges?.arm3?.sliderMax !== "180" ||
    defaultResult.jointRanges?.arm3?.numberMin !== "10.4567" ||
    defaultResult.jointRanges?.arm3?.numberMax !== "180"
  ) {
    throw new Error(`Arm2/arm3 controls must expose corrected angle ranges: ${JSON.stringify(defaultResult, null, 2)}`);
  }
  if (!defaultResult.presets?.some((preset) => preset.label === "初始打印姿态" && preset.values === "81 / 72 / 49 / 50 / 4")) {
    throw new Error(`Preset controls must expose the initial print pose: ${JSON.stringify(defaultResult, null, 2)}`);
  }

  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll(".preset-button")).find((item) =>
      item.querySelector("strong")?.textContent === "初始打印姿态"
    );
    button?.click();
  });
  const initialPrintPresetResult = await page.evaluate(() => ({
    pose: {
      arm1: window.__lingzhuDebug.pose?.arm1,
      arm2: window.__lingzhuDebug.pose?.arm2,
      arm3: window.__lingzhuDebug.pose?.arm3,
      offset: window.__lingzhuDebug.pose?.offset,
      base: window.__lingzhuDebug.pose?.base,
    },
    keepToolVerticalChecked: document.querySelector("#keepToolVertical")?.checked,
  }));
  if (
    Math.abs(initialPrintPresetResult.pose.arm1 - 81) > 0.001 ||
    Math.abs(initialPrintPresetResult.pose.arm2 - 72) > 0.001 ||
    Math.abs(initialPrintPresetResult.pose.arm3 - 49) > 0.001 ||
    Math.abs(initialPrintPresetResult.pose.offset - 50) > 0.001 ||
    Math.abs(initialPrintPresetResult.pose.base - 4) > 0.001 ||
    initialPrintPresetResult.keepToolVerticalChecked !== true
  ) {
    throw new Error(`Initial print preset must apply the requested pose: ${JSON.stringify(initialPrintPresetResult, null, 2)}`);
  }

  await page.click('[data-theme-choice="light"]');
  const lightThemeResult = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    debugTheme: window.__lingzhuDebug?.theme,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    stageBg: getComputedStyle(document.querySelector(".stage")).backgroundColor,
    primary: getComputedStyle(document.documentElement).getPropertyValue("--amber").trim(),
    pathColors: window.__lingzhuDebug?.pathRender?.colors,
    themeButtons: Array.from(document.querySelectorAll("[data-theme-choice]")).map((button) => ({
      value: button.dataset.themeChoice,
      pressed: button.getAttribute("aria-pressed"),
    })),
  }));
  if (
    lightThemeResult.theme !== "light" ||
    lightThemeResult.debugTheme !== "light" ||
    lightThemeResult.primary !== "#e60023" ||
    lightThemeResult.pathColors?.walkedPath !== "#e60023" ||
    lightThemeResult.pathColors?.remainingPath === "#ffffff" ||
    JSON.stringify(lightThemeResult.themeButtons) !== JSON.stringify([
      { value: "dark", pressed: "false" },
      { value: "light", pressed: "true" },
    ])
  ) {
    throw new Error(`Light theme switch failed: ${JSON.stringify(lightThemeResult, null, 2)}`);
  }
  await page.click('[data-theme-choice="dark"]');

  await page.click("#clearLinearPath");
  await page.waitForFunction(() => !window.__lingzhuDebug?.importedLinearPath?.active, null, {
    timeout: 10000,
  });
  await page.click("#loadDemoPath");
  await page.waitForFunction(() => window.__lingzhuDebug?.importedLinearPath?.pointCount === 127, null, {
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
  if (result.pointCount !== "127" || result.mode !== "points" || !result.debug?.active) {
    throw new Error(`Demo path verification failed: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.ikMode !== "active5_dls" || result.linearMotion?.ikMode !== "active5_dls") {
    throw new Error(`Active-5 3D DLS IK mode must be reflected in debug state by default: ${JSON.stringify(result, null, 2)}`);
  }
  const firstImportedPoint = { x: 3600, y: -2000, z: 0 };
  const simulationPath = result.linearMotion?.pathPoints || [];
  const pathStartsAtImportedPoint = ["x", "y", "z"].every(
    (axis) => Math.abs(Number(simulationPath[0]?.[axis]) - firstImportedPoint[axis]) < 0.01,
  );
  const secondPointIsImportedStart = ["x", "y", "z"].every(
    (axis) => Math.abs(Number(simulationPath[1]?.[axis]) - firstImportedPoint[axis]) < 0.01,
  );
  if (simulationPath.length !== 127 || pathStartsAtImportedPoint || !secondPointIsImportedStart) {
    throw new Error(`Demo path must be prefixed by the fixed start pose point: ${JSON.stringify(result, null, 2)}`);
  }
  const importedPathStartState = result.linearMotion?.startState || {};
  const startsFromInitialPrintPose =
    Math.abs(Number(importedPathStartState.arm1) - 81) < 0.001 &&
    Math.abs(Number(importedPathStartState.arm2) - 72) < 0.001 &&
    Math.abs(Number(importedPathStartState.arm3) - 49) < 0.001 &&
    Math.abs(Number(importedPathStartState.offset) - 50) < 0.001 &&
    Math.abs(Number(importedPathStartState.base) - 4) < 0.001;
  if (!startsFromInitialPrintPose) {
    throw new Error(`Imported path simulation must start from the initial print pose: ${JSON.stringify(result, null, 2)}`);
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
    throw new Error(`Demo path must not show point markers: ${JSON.stringify(result, null, 2)}`);
  }
  if (result.pathRender?.lineRenderer !== "fat-line" || result.pathRender?.lineWidthPx < 4) {
    throw new Error(`Demo path must use thick fat-line rendering: ${JSON.stringify(result, null, 2)}`);
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
  const active5WithinStartupLimits = ["base", "arm1", "arm2", "arm3", "offset"].every((key) => {
    const limit = { base: 1, arm1: 2, arm2: 2, arm3: 2, offset: 1 }[key];
    return Math.abs(Number(result.linearMotion?.previousIkDelta?.[key] || 0)) <= limit + 0.001;
  });
  if (poseStillVertical || !Number.isFinite(solveError) || !active5WithinStartupLimits) {
    throw new Error(`Demo path progress must solve a non-vertical rate-limited Active-5 IK pose: ${JSON.stringify(result, null, 2)}`);
  }
  if (!result.coordinateSystem?.includes("3D视角 X/Y/Z") || !result.coordinateNote?.includes("Z为高度")) {
    throw new Error(`Coordinate note verification failed: ${JSON.stringify(result, null, 2)}`);
  }

  await page.selectOption("#linearIkMode", "balanced");
  await page.fill("#linearProgressNumber", "50");
  await page.dispatchEvent("#linearProgressNumber", "change");
  const balancedResult = await page.evaluate(() => ({
    ikMode: document.querySelector("#linearIkMode")?.value,
    linearMotion: window.__lingzhuDebug.linearMotion,
    solveErrorText: document.querySelector("#linearSolveError")?.value,
    bootErrors: window.__lingzhuBootErrors,
  }));
  if (balancedResult.bootErrors?.length) {
    throw new Error(`Balanced IK switch produced boot errors: ${JSON.stringify(balancedResult, null, 2)}`);
  }
  if (balancedResult.ikMode !== "balanced" || balancedResult.linearMotion?.ikMode !== "balanced") {
    throw new Error(`Balanced IK mode must be selectable and reflected in debug state: ${JSON.stringify(balancedResult, null, 2)}`);
  }
  if (!Number.isFinite(balancedResult.linearMotion?.previousIkDelta?.arm1)) {
    throw new Error(`Balanced IK simulation must retain previous joint delta: ${JSON.stringify(balancedResult, null, 2)}`);
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

  await page.selectOption("#linearIkMode", "phi_scan");
  await page.fill("#linearProgressNumber", "50");
  await page.dispatchEvent("#linearProgressNumber", "change");
  const phiScanResult = await page.evaluate(() => ({
    ikMode: document.querySelector("#linearIkMode")?.value,
    linearMotion: window.__lingzhuDebug.linearMotion,
    bootErrors: window.__lingzhuBootErrors,
  }));
  if (phiScanResult.bootErrors?.length) {
    throw new Error(`Phi Scan IK switch produced boot errors: ${JSON.stringify(phiScanResult, null, 2)}`);
  }
  if (phiScanResult.ikMode !== "phi_scan" || phiScanResult.linearMotion?.ikMode !== "phi_scan") {
    throw new Error(`Phi Scan IK mode must be selectable and reflected in debug state: ${JSON.stringify(phiScanResult, null, 2)}`);
  }
  if (!Number.isFinite(phiScanResult.linearMotion?.previousIkDelta?.arm1)) {
    throw new Error(`Phi Scan IK simulation must retain previous joint delta: ${JSON.stringify(phiScanResult, null, 2)}`);
  }

  await page.selectOption("#linearIkMode", "active5_dls");
  await page.fill("#linearProgressNumber", "50");
  await page.dispatchEvent("#linearProgressNumber", "change");
  const active5DlsResult = await page.evaluate(() => ({
    ikMode: document.querySelector("#linearIkMode")?.value,
    linearMotion: window.__lingzhuDebug.linearMotion,
    bootErrors: window.__lingzhuBootErrors,
  }));
  if (active5DlsResult.bootErrors?.length) {
    throw new Error(`Active-5 3D DLS IK switch produced boot errors: ${JSON.stringify(active5DlsResult, null, 2)}`);
  }
  if (active5DlsResult.ikMode !== "active5_dls" || active5DlsResult.linearMotion?.ikMode !== "active5_dls") {
    throw new Error(`Active-5 3D DLS IK mode must be selectable and reflected in debug state: ${JSON.stringify(active5DlsResult, null, 2)}`);
  }
  if (
    !Number.isFinite(active5DlsResult.linearMotion?.previousIkDelta?.base) ||
    !Number.isFinite(active5DlsResult.linearMotion?.previousIkDelta?.offset)
  ) {
    throw new Error(`Active-5 3D DLS simulation must retain five-joint previous delta: ${JSON.stringify(active5DlsResult, null, 2)}`);
  }

  await page.click("#returnLinearStart");
  await page.fill("#linearSpeed", "5000");
  await page.dispatchEvent("#linearSpeed", "change");
  await page.evaluate(() => document.querySelector("#simulateLinearMotion")?.click());
  await page.waitForFunction(() => window.__lingzhuDebug.linearMotion?.isSimulating === true, null, { timeout: 1000 });
  const highSpeedFirstFrame = await page.evaluate(() => ({
    progress: window.__lingzhuDebug.linearMotion?.progress,
    previousIkDelta: window.__lingzhuDebug.linearMotion?.previousIkDelta,
    isSimulating: window.__lingzhuDebug.linearMotion?.isSimulating,
  }));
  const firstFrameHistoryCleared = ["base", "arm1", "arm2", "arm3", "offset"].every(
    (key) => Math.abs(Number(highSpeedFirstFrame.previousIkDelta?.[key])) < 0.001,
  );
  if (highSpeedFirstFrame.progress !== 0 || !firstFrameHistoryCleared || !highSpeedFirstFrame.isSimulating) {
    throw new Error(`High-speed simulation must hold the start pose through the first animation frame: ${JSON.stringify(highSpeedFirstFrame, null, 2)}`);
  }

  await page.waitForFunction(() => (window.__lingzhuDebug.linearMotion?.commandDistanceMm || 0) > 5, null, { timeout: 1000 });
  const highSpeedFirstMotionFrame = await page.evaluate(() => ({
    commandDistanceMm: window.__lingzhuDebug.linearMotion?.commandDistanceMm,
    state: {
      base: window.__lingzhuDebug.pose?.base,
      arm1: window.__lingzhuDebug.pose?.arm1,
      arm2: window.__lingzhuDebug.pose?.arm2,
      arm3: window.__lingzhuDebug.pose?.arm3,
      offset: window.__lingzhuDebug.pose?.offset,
    },
    startState: window.__lingzhuDebug.linearMotion?.startState,
  }));
  const firstMotionFrameWithinDisplayLimit = ["base", "arm1", "arm2", "arm3", "offset"].every((key) => {
    const limit = { base: 1, arm1: 2, arm2: 2, arm3: 2, offset: 1 }[key];
    return Math.abs(Number(highSpeedFirstMotionFrame.state?.[key]) - Number(highSpeedFirstMotionFrame.startState?.[key])) <= limit + 0.001;
  });
  if (!firstMotionFrameWithinDisplayLimit) {
    throw new Error(`High-speed simulation must not accumulate multiple IK substeps before the next rendered frame: ${JSON.stringify(highSpeedFirstMotionFrame, null, 2)}`);
  }

  await page.waitForTimeout(500);
  const highSpeedFollowResult = await page.evaluate(() => ({
    commandDistanceMm: window.__lingzhuDebug.linearMotion?.commandDistanceMm,
    solveErrorText: document.querySelector("#linearSolveError")?.value,
  }));
  const highSpeedFollowError = Number.parseFloat(highSpeedFollowResult.solveErrorText || "NaN");
  if (highSpeedFollowResult.commandDistanceMm > 1500 || !Number.isFinite(highSpeedFollowError) || highSpeedFollowError > 120) {
    throw new Error(`High-speed simulation must adapt feed to keep the tool near the commanded path: ${JSON.stringify(highSpeedFollowResult, null, 2)}`);
  }

  await page.evaluate(() => document.querySelector("#simulateLinearMotion")?.click());
  await page.click("#returnLinearStart");
  await page.selectOption("#linearPathMode", "points");
  await page.fill("#linearSpeed", "5000");
  await page.dispatchEvent("#linearSpeed", "change");
  await page.evaluate(() => document.querySelector("#simulateLinearMotion")?.click());
  await page.waitForFunction(() => (window.__lingzhuDebug.linearMotion?.commandDistanceMm || 0) > 5, null, { timeout: 1000 });
  const pointModeStartResult = await page.evaluate(() => ({
    commandDistanceMm: window.__lingzhuDebug.linearMotion?.commandDistanceMm,
    target: window.__lingzhuDebug.linearDrag?.simulationTargetWorld,
    pathPoints: window.__lingzhuDebug.linearMotion?.pathPoints,
  }));
  await page.evaluate(() => document.querySelector("#simulateLinearMotion")?.click());
  const pointModeFirstImportedPoint = pointModeStartResult.pathPoints?.[1];
  const targetJumpedToFirstImportedPoint = ["x", "y", "z"].every(
    (axis) => Math.abs(Number(pointModeStartResult.target?.[axis]) - Number(pointModeFirstImportedPoint?.[axis])) < 0.01,
  );
  if (targetJumpedToFirstImportedPoint) {
    throw new Error(`Point-mode automatic simulation must interpolate through the start segment instead of jumping to the first imported point: ${JSON.stringify(pointModeStartResult, null, 2)}`);
  }

  await page.click("#returnLinearStart");
  const returnedResult = await page.evaluate(() => ({
    progress: window.__lingzhuDebug.linearMotion?.progress,
    state: {
      arm1: window.__lingzhuDebug.pose?.arm1,
      arm2: window.__lingzhuDebug.pose?.arm2,
      arm3: window.__lingzhuDebug.pose?.arm3,
      offset: window.__lingzhuDebug.pose?.offset,
      base: window.__lingzhuDebug.pose?.base,
    },
    startState: window.__lingzhuDebug.linearMotion?.startState,
    previousIkDelta: window.__lingzhuDebug.linearMotion?.previousIkDelta,
    progressInput: document.querySelector("#linearProgressNumber")?.value,
    solveErrorText: document.querySelector("#linearSolveError")?.value,
  }));
  const stateKeys = ["arm1", "arm2", "arm3", "offset", "base"];
  const poseMatchesStart = stateKeys.every(
    (key) => Math.abs(Number(returnedResult.state?.[key]) - Number(returnedResult.startState?.[key])) < 0.001,
  );
  const ikHistoryCleared = ["base", "arm1", "arm2", "arm3", "offset"].every(
    (key) => Math.abs(Number(returnedResult.previousIkDelta?.[key])) < 0.001,
  );
  if (returnedResult.progress !== 0 || returnedResult.progressInput !== "0" || !poseMatchesStart || !ikHistoryCleared) {
    throw new Error(`Return-to-start must restore progress, pose, and IK history: ${JSON.stringify(returnedResult, null, 2)}`);
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => staticServer?.close(resolve) ?? resolve());
}
