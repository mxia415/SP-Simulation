import { chromium } from "playwright";
import assert from "node:assert/strict";

const url = "http://localhost:8765";
const fileUrl = "file:///Users/ming/Documents/Codex/2026-06-24/s/outputs/lingzhu-control/index.html";
const viewports = [
  { name: "desktop", width: 1440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
];

function windowDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function xzDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("#viewport");
  try {
    await page.waitForFunction(() => window.__lingzhuDebug?.renderMode === "three-js", null, { timeout: 15000 });
  } catch (error) {
    const bootErrors = await page.evaluate(() => window.__lingzhuBootErrors || []);
    throw new Error(`${viewport.name} Three.js scene did not initialize. Boot errors: ${bootErrors.join(" | ")}. Console errors: ${consoleErrors.join(" | ")}`);
  }
  try {
    await page.waitForFunction(() => window.__lingzhuDebug?.baseModel?.loaded === true, null, { timeout: 60000 });
  } catch (error) {
    const modelDebug = await page.evaluate(() => window.__lingzhuDebug?.baseModel || null);
    throw new Error(`${viewport.name} base GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${consoleErrors.join(" | ")}`);
  }
  try {
    await page.waitForFunction(() => window.__lingzhuDebug?.baseLinkModel?.loaded === true, null, { timeout: 60000 });
  } catch (error) {
    const modelDebug = await page.evaluate(() => window.__lingzhuDebug?.baseLinkModel || null);
    throw new Error(`${viewport.name} base_link GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${consoleErrors.join(" | ")}`);
  }
  try {
    await page.waitForFunction(() => window.__lingzhuDebug?.arm1Model?.loaded === true, null, { timeout: 60000 });
  } catch (error) {
    const modelDebug = await page.evaluate(() => window.__lingzhuDebug?.arm1Model || null);
    throw new Error(`${viewport.name} arm1 GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${consoleErrors.join(" | ")}`);
  }
  try {
    await page.waitForFunction(() => window.__lingzhuDebug?.arm2Model?.loaded === true, null, { timeout: 60000 });
  } catch (error) {
    const modelDebug = await page.evaluate(() => window.__lingzhuDebug?.arm2Model || null);
    throw new Error(`${viewport.name} arm2 GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${consoleErrors.join(" | ")}`);
  }
  try {
    await page.waitForFunction(() => window.__lingzhuDebug?.arm3Model?.loaded === true, null, { timeout: 60000 });
  } catch (error) {
    const modelDebug = await page.evaluate(() => window.__lingzhuDebug?.arm3Model || null);
    throw new Error(`${viewport.name} arm3 GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${consoleErrors.join(" | ")}`);
  }
  try {
    await page.waitForFunction(() => window.__lingzhuDebug?.arm4Model?.loaded === true, null, { timeout: 60000 });
  } catch (error) {
    const modelDebug = await page.evaluate(() => window.__lingzhuDebug?.arm4Model || null);
    throw new Error(`${viewport.name} arm4 GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${consoleErrors.join(" | ")}`);
  }

  const canvasStats = await page.evaluate(() => {
    const canvas = document.querySelector("#viewport");
    return {
      width: canvas.width,
      height: canvas.height,
      renderMode: window.__lingzhuDebug.renderMode,
      dynamicObjectCount: window.__lingzhuDebug.dynamicObjectCount,
      arm1ActuatorJointCount: window.__lingzhuDebug.arm1ActuatorJointCount,
      mode: window.__lingzhuDebug.projectionMode,
    };
  });

  const overlapIssues = await page.evaluate(() => {
    const rects = Array.from(document.querySelectorAll(".control, .preset-button, .hud, .metric, .logic-row"))
      .filter((el) => getComputedStyle(el).display !== "none" && el.offsetParent !== null)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    return rects.filter((rect) => rect.width < 30 || rect.height < 20).length;
  });

  const layoutStats = await page.evaluate(() => {
    const stage = document.querySelector(".stage").getBoundingClientRect();
    const shell = document.querySelector(".shell").getBoundingClientRect();
    return {
      stageHeight: Math.round(stage.height),
      shellHeight: Math.round(shell.height),
      viewportHeight: window.innerHeight,
      strokeControls: document.querySelectorAll("#strokeControls .control").length,
      modeButtons: document.querySelectorAll(".mode-button").length,
      modelTunerVisible: getComputedStyle(document.querySelector(".model-tuner")).display !== "none",
      modelTunerCount: document.querySelectorAll(".model-tuner").length,
      modelStatus: document.querySelector("#baseModelStatus").textContent,
      baseLinkModelStatus: document.querySelector("#baseLinkModelStatus").textContent,
      arm1ModelStatus: document.querySelector("#arm1ModelStatus").textContent,
      arm2ModelStatus: document.querySelector("#arm2ModelStatus").textContent,
      arm3ModelStatus: document.querySelector("#arm3ModelStatus").textContent,
      arm4ModelStatus: document.querySelector("#arm4ModelStatus").textContent,
      angleControlsVisible: getComputedStyle(document.querySelector("#controls")).display !== "none",
      strokeControlsVisible: getComputedStyle(document.querySelector("#strokeControls")).display !== "none",
      linearControlsVisible: getComputedStyle(document.querySelector("#linearControls")).display !== "none",
      arm3AngleOut: document.querySelector("#arm3Out").value,
      arm3MetricText: document.querySelector("#arm3Metric strong").textContent,
      arm2Max: document.querySelector("#arm2").max,
      arm3Max: document.querySelector("#arm3").max,
      arm2StrokeInitial: document.querySelector("#arm2Stroke").value,
    };
  });
  await page.evaluate(() => {
    const setNumber = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setNumber("#baseModelX", 120);
    setNumber("#baseModelRz", 15);
    setNumber("#baseModelScale", 0.8);
  });
  await page.waitForTimeout(100);
  const baseModelTuningStats = await page.evaluate(() => ({
    loaded: window.__lingzhuDebug.baseModel.loaded,
    childCount: window.__lingzhuDebug.baseModel.childCount,
    source: window.__lingzhuDebug.baseModel.stats.source,
    x: window.__lingzhuDebug.baseModel.state.x,
    rz: window.__lingzhuDebug.baseModel.state.rz,
    scale: window.__lingzhuDebug.baseModel.state.scale,
    visible: window.__lingzhuDebug.baseModel.state.visible,
    locked: window.__lingzhuDebug.baseModel.locked,
    inputDisabled: document.querySelector("#baseModelX").disabled,
  }));
  await page.evaluate(() => {
    const setNumber = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setNumber("#baseLinkModelX", 240);
    setNumber("#baseLinkModelRz", 25);
    setNumber("#baseLinkModelScale", 1.2);
  });
  await page.waitForTimeout(100);
  const baseLinkModelTuningStats = await page.evaluate(() => ({
    loaded: window.__lingzhuDebug.baseLinkModel.loaded,
    childCount: window.__lingzhuDebug.baseLinkModel.childCount,
    source: window.__lingzhuDebug.baseLinkModel.stats.source,
    x: window.__lingzhuDebug.baseLinkModel.state.x,
    rz: window.__lingzhuDebug.baseLinkModel.state.rz,
    scale: window.__lingzhuDebug.baseLinkModel.state.scale,
    visible: window.__lingzhuDebug.baseLinkModel.state.visible,
    followsBaseRotation: window.__lingzhuDebug.baseLinkModel.followsBaseRotation,
    locked: window.__lingzhuDebug.baseLinkModel.locked,
    inputDisabled: document.querySelector("#baseLinkModelX").disabled,
  }));
  await page.evaluate(() => {
    const setNumber = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setNumber("#arm1ModelX", 360);
    setNumber("#arm1ModelRz", 35);
    setNumber("#arm1ModelScale", 1.1);
  });
  await page.waitForTimeout(100);
  const arm1ModelTuningStats = await page.evaluate(() => ({
    loaded: window.__lingzhuDebug.arm1Model.loaded,
    childCount: window.__lingzhuDebug.arm1Model.childCount,
    source: window.__lingzhuDebug.arm1Model.stats.source,
    x: window.__lingzhuDebug.arm1Model.state.x,
    rz: window.__lingzhuDebug.arm1Model.state.rz,
    scale: window.__lingzhuDebug.arm1Model.state.scale,
    visible: window.__lingzhuDebug.arm1Model.state.visible,
    locked: window.__lingzhuDebug.arm1Model.locked,
    inputDisabled: document.querySelector("#arm1ModelX").disabled,
    followsBaseRotation: window.__lingzhuDebug.arm1Model.followsBaseRotation,
    followsJoint: window.__lingzhuDebug.arm1Model.followsJoint,
    calibrationAngle: window.__lingzhuDebug.arm1Model.calibrationAngle,
    jointRotationAxis: window.__lingzhuDebug.arm1Model.jointRotationAxis,
    jointRotationSign: window.__lingzhuDebug.arm1Model.jointRotationSign,
    rotatesAroundFixedAnchor: window.__lingzhuDebug.arm1Model.rotatesAroundFixedAnchor,
    fixedAnchorWorld: window.__lingzhuDebug.arm1Model.fixedAnchorWorld,
    anchorLocal: window.__lingzhuDebug.arm1Model.anchorLocal,
    renderedPosition: window.__lingzhuDebug.arm1Model.renderedPosition,
  }));
  await page.evaluate(() => {
    const setNumber = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setNumber("#arm2ModelX", 420);
    setNumber("#arm2ModelRz", 28);
    setNumber("#arm2ModelScale", 1.05);
  });
  await page.waitForTimeout(100);
  const arm2ModelTuningStats = await page.evaluate(() => ({
    loaded: window.__lingzhuDebug.arm2Model.loaded,
    childCount: window.__lingzhuDebug.arm2Model.childCount,
    source: window.__lingzhuDebug.arm2Model.stats.source,
    x: window.__lingzhuDebug.arm2Model.state.x,
    rz: window.__lingzhuDebug.arm2Model.state.rz,
    scale: window.__lingzhuDebug.arm2Model.state.scale,
    visible: window.__lingzhuDebug.arm2Model.state.visible,
    locked: window.__lingzhuDebug.arm2Model.locked,
    inputDisabled: document.querySelector("#arm2ModelX").disabled,
    followsJoint: window.__lingzhuDebug.arm2Model.followsJoint,
    calibrationAngle: window.__lingzhuDebug.arm2Model.calibrationAngle,
    jointRotationAxis: window.__lingzhuDebug.arm2Model.jointRotationAxis,
    jointRotationSign: window.__lingzhuDebug.arm2Model.jointRotationSign,
    rotatesAroundFixedAnchor: window.__lingzhuDebug.arm2Model.rotatesAroundFixedAnchor,
    fixedAnchorFrom: window.__lingzhuDebug.arm2Model.fixedAnchorFrom,
    fixedAnchorCalibrationWorld: window.__lingzhuDebug.arm2Model.fixedAnchorCalibrationWorld,
    anchorLocal: window.__lingzhuDebug.arm2Model.anchorLocal,
  }));
  await page.evaluate(() => {
    const setNumber = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setNumber("#arm3ModelX", 520);
    setNumber("#arm3ModelRz", 22);
    setNumber("#arm3ModelScale", 1.02);
  });
  await page.waitForTimeout(100);
  const arm3ModelTuningStats = await page.evaluate(() => ({
    loaded: window.__lingzhuDebug.arm3Model.loaded,
    childCount: window.__lingzhuDebug.arm3Model.childCount,
    source: window.__lingzhuDebug.arm3Model.stats.source,
    x: window.__lingzhuDebug.arm3Model.state.x,
    rz: window.__lingzhuDebug.arm3Model.state.rz,
    scale: window.__lingzhuDebug.arm3Model.state.scale,
    visible: window.__lingzhuDebug.arm3Model.state.visible,
    locked: window.__lingzhuDebug.arm3Model.locked,
    inputDisabled: document.querySelector("#arm3ModelX").disabled,
    followsJoint: window.__lingzhuDebug.arm3Model.followsJoint,
    calibrationAngle: window.__lingzhuDebug.arm3Model.calibrationAngle,
    jointRotationAxis: window.__lingzhuDebug.arm3Model.jointRotationAxis,
    jointRotationSign: window.__lingzhuDebug.arm3Model.jointRotationSign,
    rotatesAroundFixedAnchor: window.__lingzhuDebug.arm3Model.rotatesAroundFixedAnchor,
    fixedAnchorFrom: window.__lingzhuDebug.arm3Model.fixedAnchorFrom,
    fixedAnchorCalibrationWorld: window.__lingzhuDebug.arm3Model.fixedAnchorCalibrationWorld,
    anchorLocal: window.__lingzhuDebug.arm3Model.anchorLocal,
  }));
  await page.evaluate(() => {
    const setNumber = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setNumber("#arm4ModelX", 610);
    setNumber("#arm4ModelRz", 18);
    setNumber("#arm4ModelScale", 1.01);
  });
  await page.waitForTimeout(100);
  const arm4ModelTuningStats = await page.evaluate(() => ({
    loaded: window.__lingzhuDebug.arm4Model.loaded,
    childCount: window.__lingzhuDebug.arm4Model.childCount,
    source: window.__lingzhuDebug.arm4Model.stats.source,
    x: window.__lingzhuDebug.arm4Model.state.x,
    rz: window.__lingzhuDebug.arm4Model.state.rz,
    scale: window.__lingzhuDebug.arm4Model.state.scale,
    visible: window.__lingzhuDebug.arm4Model.state.visible,
    locked: window.__lingzhuDebug.arm4Model.locked,
    inputDisabled: document.querySelector("#arm4ModelX").disabled,
    followsJoint: window.__lingzhuDebug.arm4Model.followsJoint,
    fixedAnchorFrom: window.__lingzhuDebug.arm4Model.fixedAnchorFrom,
    lockWorldZAxis: window.__lingzhuDebug.arm4Model.lockWorldZAxis,
    calibrationAngle: window.__lingzhuDebug.arm4Model.calibrationAngle,
    rotatesAroundFixedAnchor: window.__lingzhuDebug.arm4Model.rotatesAroundFixedAnchor,
    anchorLocal: window.__lingzhuDebug.arm4Model.anchorLocal,
    jointRotationAxis: window.__lingzhuDebug.arm4Model.jointRotationAxis,
  }));
  await page.evaluate(() => {
    const input = document.querySelector("#base");
    input.value = 90;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const baseLinkRotationStats = await page.evaluate(() => ({
    baseAngle: document.querySelector("#base").value,
    effectiveBaseRotation: window.__lingzhuDebug.baseLinkModel.effectiveBaseRotation,
    basePlaceholderVisible: window.__lingzhuDebug.basePlaceholderVisible,
  }));
  await page.evaluate(() => {
    const input = document.querySelector("#base");
    input.value = 0;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(100);

  const baseBeforeDrag = await page.evaluate(() => window.__lingzhuDebug.baseScreen);
  const arm1ActuatorStats = await page.evaluate(() => ({
    pairCount: window.__lingzhuDebug.arm1ActuatorScreens?.length ?? 0,
    baseScreen: window.__lingzhuDebug.baseScreen,
    pivotScreen: window.__lingzhuDebug.arm1PivotScreen,
  }));
  await page.evaluate(() => {
    const setRange = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setRange("#base", 0);
    setRange("#arm1", 0);
  });
  await page.waitForTimeout(100);
  const arm1ZeroActuatorStats = await page.evaluate(() => {
    const pairs = window.__lingzhuDebug.arm1ActuatorWorldPairs;
    const screens = window.__lingzhuDebug.arm1ActuatorScreens;
    const arm12 = window.__lingzhuDebug.arm12LinkageWorldPairs;
    return {
      firstEnd: pairs[0].end,
      secondEnd: pairs[1].end,
      firstStart: pairs[0].start,
      secondStart: pairs[1].start,
      firstEndScreen: screens[0].end,
      secondEndScreen: screens[1].end,
      firstStartScreen: screens[0].start,
      secondStartScreen: screens[1].start,
      arm12PairCount: arm12.length,
      arm12First: arm12[0],
      arm12Second: arm12[1],
    };
  });
  const arm2BodyAtZero = await page.evaluate(() => window.__lingzhuDebug.arm2BodyEdges);
  await page.evaluate(() => {
    const input = document.querySelector("#arm2");
    input.value = 180;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const arm2CalibrationStats = await page.evaluate(() => ({
    arm2Body: window.__lingzhuDebug.arm2BodyEdges,
    arm12PairCount: window.__lingzhuDebug.arm12LinkageWorldPairs?.length ?? 0,
    arm12First: window.__lingzhuDebug.arm12LinkageWorldPairs?.[0],
    arm12Second: window.__lingzhuDebug.arm12LinkageWorldPairs?.[1],
  }));
  await page.evaluate(() => {
    const setRange = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setRange("#arm1", 0);
    setRange("#arm2", 180);
    setRange("#arm3", 180);
    setRange("#offset", 0);
    setRange("#base", 0);
  });
  await page.waitForTimeout(100);
  const arm3CalibrationStats = await page.evaluate(() => ({
    arm3Body: window.__lingzhuDebug.arm3BodyEdges,
    arm23PairCount: window.__lingzhuDebug.arm23LinkageWorldPairs?.length ?? 0,
    arm23First: window.__lingzhuDebug.arm23LinkageWorldPairs?.[0],
    arm23Second: window.__lingzhuDebug.arm23LinkageWorldPairs?.[1],
  }));
  await page.evaluate(() => {
    const setRange = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setRange("#base", 0);
    setRange("#arm1", 20);
  });
  await page.waitForTimeout(100);
  const arm1ProjectionBefore = await page.evaluate(() => window.__lingzhuDebug.segmentScreens?.[0]?.screenLength ?? null);
  await page.evaluate(() => {
    const input = document.querySelector("#arm1");
    input.value = 100;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const arm1ProjectionAfter = await page.evaluate(() => window.__lingzhuDebug.segmentScreens?.[0]?.screenLength ?? null);
  await page.evaluate(() => {
    const setRange = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setRange("#arm1", 90);
    setRange("#arm2", 40);
    setRange("#arm3", 120);
  });
  await page.waitForTimeout(200);
  const baseAfterDrag = await page.evaluate(() => window.__lingzhuDebug.baseScreen);
  await page.evaluate(() => {
    const setRange = (id, value) => {
      const input = document.querySelector(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setRange("#arm1", 0);
    setRange("#arm2", 180);
    setRange("#arm3", 180);
    setRange("#offset", 0);
    setRange("#base", 0);
  });
  await page.waitForTimeout(100);
  const bodyEdgesBase0 = await page.evaluate(() => ({
    arm2: window.__lingzhuDebug.arm2BodyEdges,
    arm3: window.__lingzhuDebug.arm3BodyEdges,
  }));
  await page.evaluate(() => {
    const input = document.querySelector("#base");
    input.value = 90;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const bodyEdgesBase90 = await page.evaluate(() => ({
    arm2: window.__lingzhuDebug.arm2BodyEdges,
    arm3: window.__lingzhuDebug.arm3BodyEdges,
  }));

  await page.evaluate(() => document.querySelector("#strokeModeButton").click());
  const strokeModeStats = await page.evaluate(() => ({
    angleControlsVisible: getComputedStyle(document.querySelector("#controls")).display !== "none",
    strokeControlsVisible: getComputedStyle(document.querySelector("#strokeControls")).display !== "none",
    linearControlsVisible: getComputedStyle(document.querySelector("#linearControls")).display !== "none",
  }));
  await page.evaluate(() => document.querySelector("#linearModeButton").click());
  const linearModeStats = await page.evaluate(() => ({
    angleControlsVisible: getComputedStyle(document.querySelector("#controls")).display !== "none",
    strokeControlsVisible: getComputedStyle(document.querySelector("#strokeControls")).display !== "none",
    linearControlsVisible: getComputedStyle(document.querySelector("#linearControls")).display !== "none",
    linearControlCount: document.querySelectorAll("#linearControls .control").length,
  }));
  await page.evaluate(() => document.querySelector("#strokeModeButton").click());
  await page.evaluate(() => {
    const input = document.querySelector("#arm2Stroke");
    input.value = 100;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const arm2ReverseStrokeStats = await page.evaluate(() => ({
    arm2Value: document.querySelector("#arm2").value,
    arm2NumberValue: document.querySelector("#arm2Number").value,
    arm2StrokeValue: document.querySelector("#arm2Stroke").value,
    arm2StrokeOut: document.querySelector("#arm2StrokeOut").value,
  }));

  await page.evaluate(() => document.querySelector("#angleModeButton").click());
  await page.evaluate(() => document.querySelector("#resetButton").click());
  await page.waitForTimeout(100);
  const screenshot = `/Users/ming/Documents/Codex/2026-06-24/s/outputs/lingzhu-control-${viewport.name}.png`;
  await page.screenshot({ path: screenshot, fullPage: false, timeout: 60000 });

  assert.equal(consoleErrors.length, 0, `${viewport.name} console errors: ${consoleErrors.join("\n")}`);
  assert.ok(canvasStats.width > 0 && canvasStats.height > 0, `${viewport.name} canvas has size`);
  assert.equal(canvasStats.mode, "three-perspective", `${viewport.name} uses Three.js perspective projection`);
  assert.equal(canvasStats.renderMode, "three-js", `${viewport.name} renders with Three.js`);
  assert.ok(canvasStats.dynamicObjectCount > 20, `${viewport.name} has populated 3D scene objects`);
  assert.equal(canvasStats.arm1ActuatorJointCount, 4, `${viewport.name} renders both ball joints for both arm1 actuators`);
  assert.equal(overlapIssues, 0, `${viewport.name} has no collapsed UI elements`);
  assert.equal(layoutStats.strokeControls, 3, `${viewport.name} has stroke controls`);
  assert.equal(layoutStats.modeButtons, 3, `${viewport.name} has drive mode buttons`);
  assert.equal(layoutStats.modelTunerVisible, true, `${viewport.name} shows base model tuning controls`);
  assert.equal(layoutStats.modelTunerCount, 6, `${viewport.name} shows base, base_link, arm1, arm2, arm3, and arm4 model tuning controls`);
  assert.match(layoutStats.modelStatus, /已加载/, `${viewport.name} reports loaded base GLB`);
  assert.match(layoutStats.baseLinkModelStatus, /已加载/, `${viewport.name} reports loaded base_link GLB`);
  assert.match(layoutStats.arm1ModelStatus, /已加载/, `${viewport.name} reports loaded arm1 GLB`);
  assert.match(layoutStats.arm2ModelStatus, /已加载/, `${viewport.name} reports loaded arm2 GLB`);
  assert.match(layoutStats.arm3ModelStatus, /已加载/, `${viewport.name} reports loaded arm3 GLB`);
  assert.match(layoutStats.arm4ModelStatus, /已加载/, `${viewport.name} reports loaded arm4 GLB`);
  assert.equal(baseModelTuningStats.loaded, true, `${viewport.name} loads the base GLB`);
  assert.ok(baseModelTuningStats.childCount > 0, `${viewport.name} adds the base GLB into the scene`);
  assert.equal(baseModelTuningStats.source, "assets/base.glb", `${viewport.name} loads GLB directly from the local server`);
  assert.equal(baseModelTuningStats.locked, true, `${viewport.name} locks the base model transform`);
  assert.equal(baseModelTuningStats.inputDisabled, true, `${viewport.name} disables locked base model position input`);
  assert.notDeepEqual({
    x: baseModelTuningStats.x,
    rz: baseModelTuningStats.rz,
    scale: baseModelTuningStats.scale,
  }, { x: 120, rz: 15, scale: 0.8 }, `${viewport.name} locked base model ignores transform edits`);
  assert.equal(baseLinkModelTuningStats.loaded, true, `${viewport.name} loads the base_link GLB`);
  assert.ok(baseLinkModelTuningStats.childCount > 0, `${viewport.name} adds the base_link GLB into the scene`);
  assert.equal(baseLinkModelTuningStats.source, "assets/base_link.glb", `${viewport.name} loads base_link GLB directly from the local server`);
  assert.equal(baseLinkModelTuningStats.followsBaseRotation, true, `${viewport.name} base_link is bound to the base rotation angle`);
  assert.equal(baseLinkModelTuningStats.locked, true, `${viewport.name} locks the base_link model transform`);
  assert.equal(baseLinkModelTuningStats.inputDisabled, true, `${viewport.name} disables locked base_link model position input`);
  assert.deepEqual({
    x: baseLinkModelTuningStats.x,
    rz: baseLinkModelTuningStats.rz,
    scale: baseLinkModelTuningStats.scale,
    visible: baseLinkModelTuningStats.visible,
  }, { x: 7780, rz: 0, scale: 1000, visible: true }, `${viewport.name} keeps locked base_link model transform values`);
  assert.equal(arm1ModelTuningStats.loaded, true, `${viewport.name} loads the arm1 GLB`);
  assert.ok(arm1ModelTuningStats.childCount > 0, `${viewport.name} adds the arm1 GLB into the scene`);
  assert.equal(arm1ModelTuningStats.source, "assets/arm1.glb", `${viewport.name} loads arm1 GLB directly from the local server`);
  assert.equal(arm1ModelTuningStats.locked, true, `${viewport.name} locks the aligned arm1 model transform`);
  assert.equal(arm1ModelTuningStats.inputDisabled, true, `${viewport.name} disables locked arm1 model position input`);
  assert.equal(arm1ModelTuningStats.followsBaseRotation, true, `${viewport.name} keeps locked arm1 model bound to base rotation`);
  assert.equal(arm1ModelTuningStats.followsJoint, "arm1", `${viewport.name} keeps locked arm1 model bound to arm1 motion`);
  assert.equal(arm1ModelTuningStats.calibrationAngle, 90, `${viewport.name} stores locked arm1 model 90 degree alignment calibration`);
  assert.equal(arm1ModelTuningStats.jointRotationAxis, "rz", `${viewport.name} rotates locked arm1 model around Z`);
  assert.equal(arm1ModelTuningStats.jointRotationSign, 1, `${viewport.name} uses the calibrated arm1 rotation direction`);
  assert.equal(arm1ModelTuningStats.rotatesAroundFixedAnchor, true, `${viewport.name} keeps locked arm1 model tail fixed while rotating`);
  assert.deepEqual(arm1ModelTuningStats.fixedAnchorWorld, { x: -443.19, y: 0, z: 533.39 }, `${viewport.name} uses the supplied arm1 main pivot as fixed model tail anchor`);
  assert.notEqual(arm1ModelTuningStats.anchorLocal, null, `${viewport.name} derives the arm1 local tail anchor from the locked calibration pose`);
  assert.deepEqual({
    x: arm1ModelTuningStats.x,
    rz: arm1ModelTuningStats.rz,
    scale: arm1ModelTuningStats.scale,
    visible: arm1ModelTuningStats.visible,
  }, { x: 4448, rz: 0, scale: 1000, visible: true }, `${viewport.name} keeps locked arm1 model transform values`);
  assert.equal(arm2ModelTuningStats.loaded, true, `${viewport.name} loads the arm2 GLB`);
  assert.ok(arm2ModelTuningStats.childCount > 0, `${viewport.name} adds the arm2 GLB into the scene`);
  assert.equal(arm2ModelTuningStats.source, "assets/arm2.glb", `${viewport.name} loads arm2 GLB directly from the local server`);
  assert.equal(arm2ModelTuningStats.locked, true, `${viewport.name} locks the aligned arm2 model transform`);
  assert.equal(arm2ModelTuningStats.inputDisabled, true, `${viewport.name} disables locked arm2 model position input`);
  assert.equal(arm2ModelTuningStats.followsJoint, "arm2Segment", `${viewport.name} keeps locked arm2 model bound to arm2 segment motion`);
  assert.equal(arm2ModelTuningStats.calibrationAngle, 0, `${viewport.name} stores locked arm2 model vertical-pose alignment calibration`);
  assert.equal(arm2ModelTuningStats.jointRotationAxis, "rz", `${viewport.name} rotates locked arm2 model around Z`);
  assert.equal(arm2ModelTuningStats.jointRotationSign, 1, `${viewport.name} uses the calibrated arm2 rotation direction`);
  assert.equal(arm2ModelTuningStats.rotatesAroundFixedAnchor, true, `${viewport.name} keeps locked arm2 model tail fixed while rotating`);
  assert.equal(arm2ModelTuningStats.fixedAnchorFrom, "arm2Pivot", `${viewport.name} uses the arm1-arm2 joint as the moving arm2 anchor`);
  assert.notEqual(arm2ModelTuningStats.anchorLocal, null, `${viewport.name} derives the arm2 local tail anchor from the locked calibration pose`);
  assert.deepEqual({
    x: arm2ModelTuningStats.x,
    rz: arm2ModelTuningStats.rz,
    scale: arm2ModelTuningStats.scale,
    visible: arm2ModelTuningStats.visible,
  }, { x: 4448, rz: 0, scale: 1000, visible: true }, `${viewport.name} keeps locked arm2 model transform values`);
  assert.equal(arm3ModelTuningStats.loaded, true, `${viewport.name} loads the arm3 GLB`);
  assert.ok(arm3ModelTuningStats.childCount > 0, `${viewport.name} adds the arm3 GLB into the scene`);
  assert.equal(arm3ModelTuningStats.source, "assets/arm3.glb", `${viewport.name} loads arm3 GLB directly from the local server`);
  assert.equal(arm3ModelTuningStats.locked, true, `${viewport.name} locks the aligned arm3 model transform`);
  assert.equal(arm3ModelTuningStats.inputDisabled, true, `${viewport.name} disables locked arm3 model position input`);
  assert.equal(arm3ModelTuningStats.followsJoint, "arm3Segment", `${viewport.name} keeps locked arm3 model bound to arm3 segment motion`);
  assert.equal(arm3ModelTuningStats.calibrationAngle, -88, `${viewport.name} stores locked arm3 model 88 degree alignment calibration in segment space`);
  assert.equal(arm3ModelTuningStats.jointRotationAxis, "rz", `${viewport.name} rotates locked arm3 model around Z`);
  assert.equal(arm3ModelTuningStats.jointRotationSign, 1, `${viewport.name} uses the calibrated arm3 rotation direction`);
  assert.equal(arm3ModelTuningStats.rotatesAroundFixedAnchor, true, `${viewport.name} keeps locked arm3 model tail fixed while rotating`);
  assert.equal(arm3ModelTuningStats.fixedAnchorFrom, "arm3Pivot", `${viewport.name} uses the arm2-arm3 joint as the moving arm3 anchor`);
  assert.notEqual(arm3ModelTuningStats.anchorLocal, null, `${viewport.name} derives the arm3 local tail anchor from the locked calibration pose`);
  assert.deepEqual({
    x: arm3ModelTuningStats.x,
    rz: arm3ModelTuningStats.rz,
    scale: arm3ModelTuningStats.scale,
    visible: arm3ModelTuningStats.visible,
  }, { x: 4448, rz: 0, scale: 1000, visible: true }, `${viewport.name} keeps locked arm3 model transform values`);
  assert.equal(arm4ModelTuningStats.loaded, true, `${viewport.name} loads the arm4 GLB`);
  assert.ok(arm4ModelTuningStats.childCount > 0, `${viewport.name} adds the arm4 GLB into the scene`);
  assert.equal(arm4ModelTuningStats.source, "assets/arm4.glb", `${viewport.name} loads arm4 GLB directly from the local server`);
  assert.equal(arm4ModelTuningStats.locked, true, `${viewport.name} locks the Tool model transform`);
  assert.equal(arm4ModelTuningStats.inputDisabled, true, `${viewport.name} disables locked Tool model position input`);
  assert.equal(arm4ModelTuningStats.followsJoint, "couplerAngle", `${viewport.name} binds Tool model to print-head motion`);
  assert.equal(arm4ModelTuningStats.fixedAnchorFrom, "toolPivot", `${viewport.name} uses the print-head pivot as the moving Tool anchor`);
  assert.equal(arm4ModelTuningStats.lockWorldZAxis, true, `${viewport.name} keeps Tool vertical while the vertical lock is enabled`);
  assert.equal(arm4ModelTuningStats.calibrationAngle, -90, `${viewport.name} stores Tool calibration at the default print-head angle`);
  assert.equal(arm4ModelTuningStats.rotatesAroundFixedAnchor, true, `${viewport.name} keeps Tool fixed to the print-head pivot`);
  assert.notEqual(arm4ModelTuningStats.anchorLocal, null, `${viewport.name} derives the Tool local anchor from the locked calibration pose`);
  assert.equal(arm4ModelTuningStats.jointRotationAxis, "rz", `${viewport.name} rotates Tool around Z when vertical lock is disabled`);
  assert.deepEqual({
    x: arm4ModelTuningStats.x,
    rz: arm4ModelTuningStats.rz,
    scale: arm4ModelTuningStats.scale,
    visible: arm4ModelTuningStats.visible,
  }, { x: 4448, rz: 0, scale: 1000, visible: true }, `${viewport.name} keeps locked Tool transform values`);
  assert.equal(baseLinkRotationStats.baseAngle, "90", `${viewport.name} test set base rotation to 90 degrees`);
  assert.equal(baseLinkRotationStats.effectiveBaseRotation, 90, `${viewport.name} base_link follows the base rotation angle`);
  assert.equal(baseLinkRotationStats.basePlaceholderVisible, false, `${viewport.name} hides the simplified base placeholder when base GLBs are visible`);
  assert.equal(layoutStats.arm2Max, "180", `${viewport.name} arm2 range allows 180 degrees`);
  assert.equal(layoutStats.arm3Max, "180", `${viewport.name} arm3 range allows 180 degrees`);
  assert.equal(layoutStats.arm3AngleOut, "90°（修正后 88°）", `${viewport.name} shows the raw arm3 angle with the corrected angle in parentheses`);
  assert.equal(layoutStats.arm3MetricText, "90°（修正后 88°）", `${viewport.name} shows the raw arm3 angle with the corrected angle in the angle metric`);
  assert.equal(layoutStats.arm2StrokeInitial, "52", `${viewport.name} arm2 starts from the computed vertical-pose cylinder stroke`);
  assert.equal(layoutStats.angleControlsVisible, true, `${viewport.name} starts in angle mode`);
  assert.equal(layoutStats.strokeControlsVisible, false, `${viewport.name} hides stroke controls in angle mode`);
  assert.equal(layoutStats.linearControlsVisible, false, `${viewport.name} hides linear controls in angle mode`);
  assert.equal(arm1ActuatorStats.pairCount, 2, `${viewport.name} renders two arm1 linear actuators`);
  assert.ok(Math.hypot(arm1ActuatorStats.baseScreen.x - arm1ActuatorStats.pivotScreen.x, arm1ActuatorStats.baseScreen.y - arm1ActuatorStats.pivotScreen.y) > 20, `${viewport.name} separates actuator origin from arm1 pivot`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.firstEnd.x - 1137.64) < 0.01, `${viewport.name} arm1 actuator front x matches supplied world point at arm1 0`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.firstEnd.z - 991.39) < 0.01, `${viewport.name} arm1 actuator front z matches supplied world point at arm1 0`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.firstEnd.x - arm1ZeroActuatorStats.secondEnd.x) < 0.01, `${viewport.name} arm1 actuator front ends overlap in XZ`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.firstEnd.z - arm1ZeroActuatorStats.secondEnd.z) < 0.01, `${viewport.name} arm1 actuator front end z overlaps in XZ`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.firstStart.x - arm1ZeroActuatorStats.secondStart.x) < 0.01, `${viewport.name} arm1 actuator base ends overlap in XZ`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.firstStart.z - arm1ZeroActuatorStats.secondStart.z) < 0.01, `${viewport.name} arm1 actuator base end z overlaps in XZ`);
  assert.ok(Math.abs(windowDistance(arm1ZeroActuatorStats.firstEndScreen, arm1ZeroActuatorStats.secondEndScreen)) < 0.01, `${viewport.name} arm1 actuator front ends overlap on screen in XZ view`);
  assert.ok(Math.abs(windowDistance(arm1ZeroActuatorStats.firstStartScreen, arm1ZeroActuatorStats.secondStartScreen)) < 0.01, `${viewport.name} arm1 actuator base ends overlap on screen in XZ view`);
  assert.equal(arm1ZeroActuatorStats.arm12PairCount, 2, `${viewport.name} renders two arm1-arm2 linkage mechanisms`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.arm12First.actuator.start.x - 2659.73) < 0.01, `${viewport.name} arm2 actuator tail x follows arm1-mounted point at zero`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.arm12First.actuator.start.z - 991.39) < 0.01, `${viewport.name} arm2 actuator tail z follows arm1-mounted point at zero`);
  assert.ok(Math.abs(xzDistance(arm1ZeroActuatorStats.arm12First.linkA.start, arm1ZeroActuatorStats.arm12First.linkA.end) - 527.76) < 0.05, `${viewport.name} link A length matches supplied value`);
  assert.ok(Math.abs(xzDistance(arm1ZeroActuatorStats.arm12First.linkB.start, arm1ZeroActuatorStats.arm12First.linkB.end) - 304.26) < 0.05, `${viewport.name} link B length matches supplied value`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.arm12First.actuator.end.x - arm1ZeroActuatorStats.arm12First.linkA.end.x) < 0.01, `${viewport.name} arm2 actuator front shares link A/B joint`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.arm12First.actuator.end.z - arm1ZeroActuatorStats.arm12First.linkB.end.z) < 0.01, `${viewport.name} arm2 actuator front shares link B joint`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.arm12First.actuator.end.x - arm1ZeroActuatorStats.arm12Second.actuator.end.x) < 0.01, `${viewport.name} arm2 linkage front ends overlap in XZ`);
  assert.ok(Math.abs(arm1ZeroActuatorStats.arm12First.actuator.end.z - arm1ZeroActuatorStats.arm12Second.actuator.end.z) < 0.01, `${viewport.name} arm2 linkage front end z overlaps in XZ`);
  assert.equal(arm2BodyAtZero.mode, "rotates-with-segment-and-base", `${viewport.name} arm2 body rotates with arm2 segment and base`);
  assert.ok(Math.abs(arm2CalibrationStats.arm12First.actuator.start.x - 2659.73) < 0.01, `${viewport.name} arm2 actuator tail x matches supplied calibration point`);
  assert.ok(Math.abs(arm2CalibrationStats.arm12First.actuator.start.z - 991.39) < 0.01, `${viewport.name} arm2 actuator tail z matches supplied calibration point`);
  assert.ok(Math.abs(arm2CalibrationStats.arm12First.linkA.start.x - 4531.28) < 0.01, `${viewport.name} arm2 link A anchor x matches supplied calibration point`);
  assert.ok(Math.abs(arm2CalibrationStats.arm12First.linkA.start.z - 709.08) < 0.01, `${viewport.name} arm2 link A anchor z matches supplied calibration point`);
  assert.ok(Math.abs(arm2CalibrationStats.arm12First.linkB.start.x - 4260.1) < 0.01, `${viewport.name} arm2 link B anchor x matches supplied calibration point`);
  assert.ok(Math.abs(arm2CalibrationStats.arm12First.linkB.start.z - 446.36) < 0.01, `${viewport.name} arm2 link B anchor z matches supplied calibration point`);
  assert.ok(Math.abs(arm2CalibrationStats.arm12First.actuator.end.x - arm2CalibrationStats.arm12Second.actuator.end.x) < 0.01, `${viewport.name} arm2 linkage front ends overlap in XZ at calibration`);
  assert.ok(Math.abs(arm2CalibrationStats.arm12First.actuator.end.z - arm2CalibrationStats.arm12Second.actuator.end.z) < 0.01, `${viewport.name} arm2 linkage front end z overlaps in XZ at calibration`);
  assert.ok(Math.abs(arm2CalibrationStats.arm2Body.upperStart.z - 298.74) < 0.01, `${viewport.name} arm2 upper edge z matches supplied value at 180 degrees`);
  assert.ok(Math.abs(arm2CalibrationStats.arm2Body.upperEnd.z - 298.74) < 0.01, `${viewport.name} arm2 upper edge stays level at 180 degrees`);
  assert.ok(Math.abs(arm2CalibrationStats.arm2Body.lowerStart.z - 18.74) < 0.01, `${viewport.name} arm2 lower edge z matches supplied value at 180 degrees`);
  assert.ok(Math.abs(arm2CalibrationStats.arm2Body.lowerEnd.z - 18.74) < 0.01, `${viewport.name} arm2 lower edge stays level at 180 degrees`);
  assert.ok(Math.abs(arm2BodyAtZero.upperStart.z - arm2CalibrationStats.arm2Body.upperStart.z) > 100, `${viewport.name} arm2 body edge changes z when rotating from 180 to 0`);
  assert.equal(arm3CalibrationStats.arm23PairCount, 2, `${viewport.name} renders two arm2-arm3 linkage mechanisms`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.actuator.start.x - 2162.36) < 0.01, `${viewport.name} arm3 actuator tail x matches supplied calibration point`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.actuator.start.z - 240) < 0.01, `${viewport.name} arm3 actuator tail z matches supplied calibration point`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.linkA.start.x - 723.53) < 0.01, `${viewport.name} arm3 link A anchor x matches supplied calibration point`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.linkA.start.z - 453.16) < 0.01, `${viewport.name} arm3 link A anchor z matches supplied calibration point`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.linkB.start.x - 728.17) < 0.01, `${viewport.name} arm3 link B anchor x matches supplied calibration point`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.linkB.start.z - 255.74) < 0.01, `${viewport.name} arm3 link B anchor z matches supplied calibration point`);
  assert.ok(Math.abs(xzDistance(arm3CalibrationStats.arm23First.linkA.start, arm3CalibrationStats.arm23First.linkA.end) - 350) < 0.05, `${viewport.name} arm3 link A length matches supplied value`);
  assert.ok(Math.abs(xzDistance(arm3CalibrationStats.arm23First.linkB.start, arm3CalibrationStats.arm23First.linkB.end) - 342) < 0.05, `${viewport.name} arm3 link B length matches supplied value`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.actuator.end.x - arm3CalibrationStats.arm23First.linkA.end.x) < 0.01, `${viewport.name} arm3 actuator front shares link A/B joint`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.actuator.end.z - arm3CalibrationStats.arm23First.linkB.end.z) < 0.01, `${viewport.name} arm3 actuator front shares link A/B joint in XZ`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.actuator.end.x - arm3CalibrationStats.arm23Second.actuator.end.x) < 0.01, `${viewport.name} arm3 linkage front ends overlap in XZ`);
  assert.ok(Math.abs(arm3CalibrationStats.arm23First.actuator.end.z - arm3CalibrationStats.arm23Second.actuator.end.z) < 0.01, `${viewport.name} arm3 linkage front end z overlaps in XZ`);
  assert.ok(Math.abs(arm3CalibrationStats.arm3Body.upperStart.z - 657.95) < 0.01, `${viewport.name} arm3 upper edge z matches supplied value at 180 degrees`);
  assert.ok(Math.abs(arm3CalibrationStats.arm3Body.upperEnd.z - 657.95) < 0.01, `${viewport.name} arm3 upper edge stays level at 180 degrees`);
  assert.ok(Math.abs(arm3CalibrationStats.arm3Body.lowerStart.z - 417.95) < 0.01, `${viewport.name} arm3 lower edge z matches supplied value at 180 degrees`);
  assert.ok(Math.abs(arm3CalibrationStats.arm3Body.lowerEnd.z - 417.95) < 0.01, `${viewport.name} arm3 lower edge stays level at 180 degrees`);
  assert.equal(bodyEdgesBase0.arm2.mode, "rotates-with-segment-and-base", `${viewport.name} arm2 debug edges include base rotation`);
  assert.equal(bodyEdgesBase0.arm3.mode, "rotates-with-segment-and-base", `${viewport.name} arm3 debug edges include base rotation`);
  assert.ok(Math.abs(bodyEdgesBase90.arm2.upperStart.x - bodyEdgesBase0.arm2.upperStart.x) > 1000, `${viewport.name} arm2 body x changes when base rotates`);
  assert.ok(Math.abs(bodyEdgesBase90.arm2.upperStart.y - bodyEdgesBase0.arm2.upperStart.y) > 1000, `${viewport.name} arm2 body y changes when base rotates`);
  assert.ok(Math.abs(bodyEdgesBase90.arm3.upperEnd.x - bodyEdgesBase0.arm3.upperEnd.x) > 1000, `${viewport.name} arm3 body x changes when base rotates`);
  assert.ok(Math.abs(bodyEdgesBase90.arm3.upperEnd.y - bodyEdgesBase0.arm3.upperEnd.y) > 1000, `${viewport.name} arm3 body y changes when base rotates`);
  assert.notEqual(arm1ProjectionBefore, null, `${viewport.name} exposes 3D segment screen measurements`);
  assert.notEqual(arm1ProjectionAfter, null, `${viewport.name} exposes updated 3D segment screen measurements`);
  assert.ok(Math.abs(arm1ProjectionBefore - arm1ProjectionAfter) < 0.01, `${viewport.name} arm1 projected screen length stays fixed while changing arm1 angle`);
  assert.ok(Math.abs(baseBeforeDrag.x - baseAfterDrag.x) < 0.01, `${viewport.name} base x stays fixed while dragging arms`);
  assert.ok(Math.abs(baseBeforeDrag.y - baseAfterDrag.y) < 0.01, `${viewport.name} base y stays fixed while dragging arms`);
  assert.equal(strokeModeStats.angleControlsVisible, false, `${viewport.name} hides angle controls in stroke mode`);
  assert.equal(strokeModeStats.strokeControlsVisible, true, `${viewport.name} shows stroke controls in stroke mode`);
  assert.equal(strokeModeStats.linearControlsVisible, false, `${viewport.name} hides linear controls in stroke mode`);
  assert.equal(linearModeStats.angleControlsVisible, false, `${viewport.name} hides angle controls in linear mode`);
  assert.equal(linearModeStats.strokeControlsVisible, false, `${viewport.name} hides stroke controls in linear mode`);
  assert.equal(linearModeStats.linearControlsVisible, true, `${viewport.name} shows linear controls in linear mode`);
  assert.equal(linearModeStats.linearControlCount, 1, `${viewport.name} has a print-head linear motion control`);
  assert.equal(arm2ReverseStrokeStats.arm2Value, "0", `${viewport.name} arm2 becomes 0 degrees at 100% stroke`);
  assert.equal(arm2ReverseStrokeStats.arm2NumberValue, "0", `${viewport.name} arm2 number mirrors 100% stroke`);
  assert.equal(arm2ReverseStrokeStats.arm2StrokeValue, "100", `${viewport.name} arm2 stroke control accepts 100%`);
  if (viewport.name === "desktop") {
    assert.equal(layoutStats.stageHeight, layoutStats.viewportHeight, "desktop stage stays fitted to viewport height");
    assert.equal(layoutStats.shellHeight, layoutStats.viewportHeight, "desktop shell stays fitted to viewport height");
  }

  results.push({ viewport: viewport.name, screenshot, canvasStats, layoutStats, baseModelTuningStats, baseLinkModelTuningStats, arm1ModelTuningStats, arm2ModelTuningStats, arm3ModelTuningStats, arm4ModelTuningStats, baseLinkRotationStats, strokeModeStats, baseBeforeDrag, baseAfterDrag, bodyEdgesBase0, bodyEdgesBase90, arm1ActuatorStats, arm1ZeroActuatorStats, arm2CalibrationStats, arm3CalibrationStats, arm1ProjectionBefore, arm1ProjectionAfter, consoleErrors, overlapIssues });
  await page.close();
}

const filePage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const fileErrors = [];
filePage.on("console", (message) => {
  if (message.type() === "error") fileErrors.push(message.text());
});
filePage.on("pageerror", (error) => fileErrors.push(error.message));
await filePage.goto(fileUrl, { waitUntil: "load" });
try {
  await filePage.waitForFunction(() => window.__lingzhuDebug?.renderMode === "three-js", null, { timeout: 15000 });
} catch (error) {
  const bootErrors = await filePage.evaluate(() => window.__lingzhuBootErrors || []);
  throw new Error(`file:// Three.js scene did not initialize. Boot errors: ${bootErrors.join(" | ")}. Console errors: ${fileErrors.join(" | ")}`);
}
try {
  await filePage.waitForFunction(() => window.__lingzhuDebug?.baseModel?.loaded === true, null, { timeout: 60000 });
} catch (error) {
  const modelDebug = await filePage.evaluate(() => window.__lingzhuDebug?.baseModel || null);
  throw new Error(`file:// base GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${fileErrors.join(" | ")}`);
}
try {
  await filePage.waitForFunction(() => window.__lingzhuDebug?.baseLinkModel?.loaded === true, null, { timeout: 60000 });
} catch (error) {
  const modelDebug = await filePage.evaluate(() => window.__lingzhuDebug?.baseLinkModel || null);
  throw new Error(`file:// base_link GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${fileErrors.join(" | ")}`);
}
try {
  await filePage.waitForFunction(() => window.__lingzhuDebug?.arm1Model?.loaded === true, null, { timeout: 60000 });
} catch (error) {
  const modelDebug = await filePage.evaluate(() => window.__lingzhuDebug?.arm1Model || null);
  throw new Error(`file:// arm1 GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${fileErrors.join(" | ")}`);
}
try {
  await filePage.waitForFunction(() => window.__lingzhuDebug?.arm2Model?.loaded === true, null, { timeout: 60000 });
} catch (error) {
  const modelDebug = await filePage.evaluate(() => window.__lingzhuDebug?.arm2Model || null);
  throw new Error(`file:// arm2 GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${fileErrors.join(" | ")}`);
}
try {
  await filePage.waitForFunction(() => window.__lingzhuDebug?.arm3Model?.loaded === true, null, { timeout: 60000 });
} catch (error) {
  const modelDebug = await filePage.evaluate(() => window.__lingzhuDebug?.arm3Model || null);
  throw new Error(`file:// arm3 GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${fileErrors.join(" | ")}`);
}
try {
  await filePage.waitForFunction(() => window.__lingzhuDebug?.arm4Model?.loaded === true, null, { timeout: 60000 });
} catch (error) {
  const modelDebug = await filePage.evaluate(() => window.__lingzhuDebug?.arm4Model || null);
  throw new Error(`file:// arm4 GLB did not load. Model debug: ${JSON.stringify(modelDebug)}. Console errors: ${fileErrors.join(" | ")}`);
}
const fileStats = await filePage.evaluate(() => {
  const canvas = document.querySelector("#viewport");
  return {
    title: document.title,
    controls: document.querySelectorAll("#controls .control").length,
    renderMode: window.__lingzhuDebug.renderMode,
    dynamicObjectCount: window.__lingzhuDebug.dynamicObjectCount,
    baseValue: document.querySelector("#base").value,
    arm3AngleOut: document.querySelector("#arm3Out").value,
    arm3MetricText: document.querySelector("#arm3Metric strong").textContent,
    defaultValues: {
      arm1: document.querySelector("#arm1").value,
      arm2: document.querySelector("#arm2").value,
      arm3: document.querySelector("#arm3").value,
      offset: document.querySelector("#offset").value,
      base: document.querySelector("#base").value,
    },
    rangeMax: {
      arm2: document.querySelector("#arm2").max,
      arm3: document.querySelector("#arm3").max,
      baseMin: document.querySelector("#base").min,
      baseMax: document.querySelector("#base").max,
    },
    strokeDefaults: {
      arm2: document.querySelector("#arm2Stroke").value,
      arm3: document.querySelector("#arm3Stroke").value,
    },
    actuatorReadouts: {
      arm2: document.querySelector("#arm2Actuator").textContent,
      arm3: document.querySelector("#arm3Actuator").textContent,
    },
    projectionMode: window.__lingzhuDebug.projectionMode,
    sideOcclusion: window.__lingzhuDebug.sideOcclusion,
    arm1PivotWorld: window.__lingzhuDebug.worldJoints[0],
    arm1ActuatorPairs: window.__lingzhuDebug.arm1ActuatorScreens?.length ?? 0,
    actuatorNodeLayer: window.__lingzhuDebug.actuatorNodeLayer,
    arm1Profile: window.__lingzhuDebug.armProfiles.arm1,
    arm2Profile: window.__lingzhuDebug.armProfiles.arm2,
    arm3Profile: window.__lingzhuDebug.armProfiles.arm3,
    arm2WorldZProfile: window.__lingzhuDebug.arm2WorldZProfile,
    arm2BodyEdges: window.__lingzhuDebug.arm2BodyEdges,
    arm3WorldZProfile: window.__lingzhuDebug.arm3WorldZProfile,
    arm3BodyEdges: window.__lingzhuDebug.arm3BodyEdges,
    arm12LinkagePairs: window.__lingzhuDebug.arm12LinkageWorldPairs?.length ?? 0,
    arm12LinkageGeometry: window.__lingzhuDebug.arm12LinkageGeometry,
    arm23LinkagePairs: window.__lingzhuDebug.arm23LinkageWorldPairs?.length ?? 0,
    arm23LinkageGeometry: window.__lingzhuDebug.arm23LinkageGeometry,
    baseModel: window.__lingzhuDebug.baseModel,
    baseLinkModel: window.__lingzhuDebug.baseLinkModel,
    arm1Model: window.__lingzhuDebug.arm1Model,
    arm2Model: window.__lingzhuDebug.arm2Model,
    arm3Model: window.__lingzhuDebug.arm3Model,
      arm4Model: window.__lingzhuDebug.arm4Model,
      tipDrag: window.__lingzhuDebug.tipDrag,
      basePlaceholderVisible: window.__lingzhuDebug.basePlaceholderVisible,
    modelTunerVisible: getComputedStyle(document.querySelector(".model-tuner")).display !== "none",
    modelTunerCount: document.querySelectorAll(".model-tuner").length,
    modelStatus: document.querySelector("#baseModelStatus").textContent,
    baseLinkModelStatus: document.querySelector("#baseLinkModelStatus").textContent,
    arm1ModelStatus: document.querySelector("#arm1ModelStatus").textContent,
    arm2ModelStatus: document.querySelector("#arm2ModelStatus").textContent,
    arm3ModelStatus: document.querySelector("#arm3ModelStatus").textContent,
    arm4ModelStatus: document.querySelector("#arm4ModelStatus").textContent,
  };
});
assert.equal(fileErrors.length, 0, `file:// console errors: ${fileErrors.join("\n")}`);
assert.equal(fileStats.controls, 5, "file:// loads controls");
assert.equal(fileStats.modelTunerVisible, true, "file:// shows base model tuning controls");
assert.equal(fileStats.modelTunerCount, 6, "file:// shows base, base_link, arm1, arm2, arm3, and arm4 model tuning controls");
assert.match(fileStats.modelStatus, /已加载/, "file:// reports loaded embedded base GLB");
assert.match(fileStats.baseLinkModelStatus, /已加载/, "file:// reports loaded embedded base_link GLB");
assert.match(fileStats.arm1ModelStatus, /已加载/, "file:// reports loaded embedded arm1 GLB");
assert.match(fileStats.arm2ModelStatus, /已加载/, "file:// reports loaded embedded arm2 GLB");
assert.match(fileStats.arm3ModelStatus, /已加载/, "file:// reports loaded embedded arm3 GLB");
assert.match(fileStats.arm4ModelStatus, /已加载/, "file:// reports loaded embedded arm4 GLB");
assert.equal(fileStats.baseModel.loaded, true, "file:// loads the embedded base GLB fallback");
assert.equal(fileStats.baseModel.stats.source, "embedded-js", "file:// uses embedded model JS fallback");
assert.ok(fileStats.baseModel.childCount > 0, "file:// adds the base GLB into the scene");
assert.equal(fileStats.baseModel.locked, true, "file:// locks the base model transform");
assert.equal(fileStats.baseLinkModel.loaded, true, "file:// loads the embedded base_link GLB fallback");
assert.equal(fileStats.baseLinkModel.stats.source, "embedded-js", "file:// uses embedded base_link model JS fallback");
assert.ok(fileStats.baseLinkModel.childCount > 0, "file:// adds the base_link GLB into the scene");
assert.equal(fileStats.baseLinkModel.followsBaseRotation, true, "file:// binds base_link model to base rotation");
assert.equal(fileStats.baseLinkModel.locked, true, "file:// locks the base_link model transform");
assert.equal(fileStats.arm1Model.loaded, true, "file:// loads the embedded arm1 GLB fallback");
assert.equal(fileStats.arm1Model.stats.source, "embedded-js", "file:// uses embedded arm1 model JS fallback");
assert.ok(fileStats.arm1Model.childCount > 0, "file:// adds the arm1 GLB into the scene");
assert.equal(fileStats.arm1Model.locked, true, "file:// locks the aligned arm1 model transform");
assert.deepEqual(fileStats.arm1Model.state, { x: 4448, y: -3195, z: 2648, rx: 90, ry: 0, rz: 0, scale: 1000, visible: true }, "file:// keeps locked arm1 model transform values");
assert.equal(fileStats.arm1Model.followsJoint, "arm1", "file:// keeps locked arm1 model bound to arm1 motion");
assert.equal(fileStats.arm1Model.calibrationAngle, 90, "file:// stores locked arm1 model 90 degree alignment calibration");
assert.equal(fileStats.arm1Model.rotatesAroundFixedAnchor, true, "file:// keeps locked arm1 model tail fixed while rotating");
assert.equal(fileStats.arm2Model.loaded, true, "file:// loads the embedded arm2 GLB fallback");
assert.equal(fileStats.arm2Model.stats.source, "embedded-js", "file:// uses embedded arm2 model JS fallback");
assert.ok(fileStats.arm2Model.childCount > 0, "file:// adds the arm2 GLB into the scene");
assert.equal(fileStats.arm2Model.locked, true, "file:// locks the aligned arm2 model transform");
assert.deepEqual(fileStats.arm2Model.state, { x: 4448, y: -3195, z: 2648, rx: 90, ry: 0, rz: 0, scale: 1000, visible: true }, "file:// starts arm2 from supplied import alignment pose");
assert.equal(fileStats.arm2Model.followsJoint, "arm2Segment", "file:// keeps locked arm2 model bound to arm2 segment motion");
assert.equal(fileStats.arm2Model.calibrationAngle, 0, "file:// stores locked arm2 model vertical-pose alignment calibration");
assert.equal(fileStats.arm2Model.rotatesAroundFixedAnchor, true, "file:// keeps locked arm2 model tail fixed while rotating");
assert.equal(fileStats.arm2Model.fixedAnchorFrom, "arm2Pivot", "file:// uses the arm1-arm2 joint as the moving arm2 anchor");
assert.equal(fileStats.arm3Model.loaded, true, "file:// loads the embedded arm3 GLB fallback");
assert.equal(fileStats.arm3Model.stats.source, "embedded-js", "file:// uses embedded arm3 model JS fallback");
assert.ok(fileStats.arm3Model.childCount > 0, "file:// adds the arm3 GLB into the scene");
assert.equal(fileStats.arm3Model.locked, true, "file:// locks the aligned arm3 model transform");
assert.deepEqual(fileStats.arm3Model.state, { x: 4448, y: -3195, z: 2648, rx: 90, ry: 0, rz: 0, scale: 1000, visible: true }, "file:// starts arm3 from supplied import alignment pose");
assert.equal(fileStats.arm3Model.followsJoint, "arm3Segment", "file:// keeps locked arm3 model bound to arm3 segment motion");
assert.equal(fileStats.arm3Model.calibrationAngle, -88, "file:// stores locked arm3 model 88 degree alignment calibration in segment space");
assert.equal(fileStats.arm3Model.rotatesAroundFixedAnchor, true, "file:// keeps locked arm3 model tail fixed while rotating");
assert.equal(fileStats.arm3Model.fixedAnchorFrom, "arm3Pivot", "file:// uses the arm2-arm3 joint as the moving arm3 anchor");
assert.equal(fileStats.arm4Model.loaded, true, "file:// loads the embedded arm4 GLB fallback");
assert.equal(fileStats.arm4Model.stats.source, "embedded-js", "file:// uses embedded arm4 model JS fallback");
assert.ok(fileStats.arm4Model.childCount > 0, "file:// adds the arm4 GLB into the scene");
assert.equal(fileStats.arm4Model.locked, true, "file:// locks the Tool model transform");
assert.deepEqual(fileStats.arm4Model.state, { x: 4448, y: -3195, z: 2648, rx: 90, ry: 0, rz: 0, scale: 1000, visible: true }, "file:// starts arm4 from supplied import alignment pose");
assert.equal(fileStats.arm4Model.followsJoint, "couplerAngle", "file:// binds Tool model to print-head motion");
assert.equal(fileStats.arm4Model.fixedAnchorFrom, "toolPivot", "file:// uses the print-head pivot as the moving Tool anchor");
assert.equal(fileStats.arm4Model.lockWorldZAxis, true, "file:// keeps Tool vertical while the vertical lock is enabled");
assert.equal(fileStats.arm4Model.jointRotationAxis, "rz", "file:// rotates Tool around Z when vertical lock is disabled");
assert.equal(fileStats.tipDrag.enabled, true, "file:// exposes print-head drag control");
assert.deepEqual(
  Object.keys(fileStats.tipDrag.handleWorld).sort(),
  ["x", "y", "z"],
  "file:// reports the current print-head drag handle world position",
);
assert.equal(fileStats.basePlaceholderVisible, false, "file:// hides the simplified base placeholder when base GLBs are visible");
assert.equal(fileStats.baseValue, "0", "file:// starts with base rotation 0 degrees");
assert.equal(fileStats.arm3AngleOut, "90°（修正后 88°）", "file:// shows the raw arm3 angle with the corrected angle in parentheses");
assert.equal(fileStats.arm3MetricText, "90°（修正后 88°）", "file:// shows the raw arm3 angle with the corrected angle in the angle metric");
assert.deepEqual(fileStats.defaultValues, { arm1: "90", arm2: "90", arm3: "90", offset: "0", base: "0" }, "file:// starts from the vertical pose by default");
assert.deepEqual(fileStats.rangeMax, { arm2: "180", arm3: "180", baseMin: "-180", baseMax: "180" }, "file:// uses 180 degree ranges for arm2, arm3, and signed base rotation");
assert.deepEqual(fileStats.strokeDefaults, { arm2: "52", arm3: "48" }, "file:// starts linkage stroke controls from computed vertical-pose geometry");
assert.equal(fileStats.actuatorReadouts.arm2, "366 / 710 mm · 52%", "file:// shows arm2 cylinder extension against its 710 mm stroke limit");
assert.equal(fileStats.actuatorReadouts.arm3, "326 / 680 mm · 48%", "file:// shows arm3 cylinder extension against its 680 mm stroke limit");
assert.deepEqual(fileStats.arm1Profile, { width: 153, thickness: 340.12, upperFromCenter: 528.76, lowerFromCenter: 188.64, allAboveCenter: true }, "file:// uses supplied arm1 profile");
assert.deepEqual(fileStats.arm2Profile, {
  width: 153,
  upperBelowCenter: 234.65,
  lowerBelowCenter: 514.65,
  upperZ: 298.74,
  lowerZ: 18.74,
  rotatesWithSegment: true,
}, "file:// uses supplied arm2 folded edge Z profile");
assert.deepEqual(fileStats.arm2WorldZProfile, { upperZ: 298.74, lowerZ: 18.74, rotatesWithSegment: true }, "file:// calibrates arm2 body to supplied Z edges while rotating with segment");
assert.equal(fileStats.arm2BodyEdges.mode, "rotates-with-segment-and-base", "file:// draws arm2 body as rotating segment and base profile");
assert.deepEqual(fileStats.arm3Profile, {
  width: 153,
  upperAboveCenterAt180: 124.56,
  lowerBelowCenterAt180: 115.44,
  upperZ: 657.95,
  lowerZ: 417.95,
  calibrationAngle: 180,
  rotatesWithSegment: true,
}, "file:// uses supplied arm3 folded edge Z profile");
assert.deepEqual(fileStats.arm3WorldZProfile, { upperZ: 657.95, lowerZ: 417.95, calibrationAngle: 180, rotatesWithSegment: true }, "file:// calibrates arm3 body to supplied Z edges while rotating with segment");
assert.equal(fileStats.arm3BodyEdges.mode, "rotates-with-segment-and-base", "file:// draws arm3 body as rotating segment and base profile");
assert.equal(fileStats.projectionMode, "three-perspective", "file:// uses Three.js perspective projection");
assert.equal(fileStats.renderMode, "three-js", "file:// renders with Three.js");
assert.equal(fileStats.arm1ActuatorPairs, 2, "file:// renders two arm1 actuators");
assert.equal(fileStats.arm12LinkagePairs, 2, "file:// renders two arm1-arm2 linkage mechanisms");
assert.equal(fileStats.arm23LinkagePairs, 2, "file:// renders two arm2-arm3 linkage mechanisms");
assert.deepEqual(fileStats.arm12LinkageGeometry.calibrationState, { arm1: 0, arm2: 180, arm3: 180, base: 0, offset: 0 }, "file:// stores arm2 linkage calibration pose");
assert.deepEqual(fileStats.arm12LinkageGeometry.actuatorTailLocalArm1, { x: 3102.92, y: 458 }, "file:// computes arm2 actuator tail in arm1 local coordinates");
assert.deepEqual(fileStats.arm12LinkageGeometry.linkAAnchorLocalArm1, { x: 4974.47, y: 175.69 }, "file:// computes link A anchor in arm1 local coordinates");
assert.deepEqual(fileStats.arm12LinkageGeometry.linkBAnchorLocalArm2, { x: 322.63, y: 87.03 }, "file:// computes link B anchor in arm2 local coordinates from 180-degree calibration");
assert.deepEqual(fileStats.arm23LinkageGeometry.actuatorTailLocalArm2, { x: 2420.37, y: 293.39 }, "file:// computes arm3 actuator tail in arm2 local coordinates");
assert.deepEqual(fileStats.arm23LinkageGeometry.linkBAnchorLocalArm2, { x: 3854.56, y: 277.65 }, "file:// computes arm3 link B anchor in arm2 local coordinates");
assert.deepEqual(fileStats.arm23LinkageGeometry.linkAAnchorLocalArm3, { x: 230.8, y: -80.23 }, "file:// computes arm3 link A anchor in arm3 local coordinates");
assert.deepEqual(fileStats.sideOcclusion, {
  mode: "arm-body-occlusion",
  nearSideOffset: 320,
  farSideOffset: -320,
  nodeLayer: "near-side-top",
}, "file:// occludes the far-side actuators behind arm bodies at base 0");
assert.equal(fileStats.actuatorNodeLayer, "near-side-top", "file:// renders only near-side actuator nodes above arm bodies");
assert.ok(Math.abs(fileStats.arm1PivotWorld.x + 443.19) < 0.01, "file:// arm1 pivot x uses supplied geometry");
assert.ok(Math.abs(fileStats.arm1PivotWorld.z - 533.39) < 0.01, "file:// arm1 pivot z uses supplied geometry");
assert.ok(fileStats.dynamicObjectCount > 20, "file:// renders visible 3D arm objects");
results.push({ viewport: "file", fileStats, consoleErrors: fileErrors });

await browser.close();
console.log(JSON.stringify(results, null, 2));
