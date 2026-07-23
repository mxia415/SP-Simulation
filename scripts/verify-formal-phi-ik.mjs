import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_FORMAL_IK_MODE,
  FORMAL_IK_MODE_KEYS,
  LIMITS,
  applyPreset,
  clampState,
  distance,
  solveStateForWorldDisplayedToolTarget,
  worldDisplayedToolPointForState,
} from "../outputs/html-version/model.mjs";

const TOOL_BALL_STICK_OFFSET_MM = { x: 0, y: 262, z: 0 };
const STATE_KEYS = ["base", "arm1", "arm2", "arm3", "offset"];
const MODE_LABELS = {
  greedy_continuity: "局部贪心解析 φ",
  balanced_posture: "平衡姿态解析 φ",
  posture_priority: "强姿态解析 φ",
};

function parseCsvPathPoints(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [x, y, z] = line.split(",").map(Number);
      return { x, y, z };
    });
}

function verticalOffsetForState(state) {
  return clampState({ ...state, offset: state.arm1 - state.arm2 - state.arm3 + 90 });
}

function maxAbsDelta(delta) {
  return Math.max(...STATE_KEYS.map((key) => Math.abs(Number(delta[key] || 0))));
}

function assertWithinLimits(state, label) {
  for (const key of STATE_KEYS) {
    assert.ok(
      state[key] >= LIMITS[key].min - 1e-6 && state[key] <= LIMITS[key].max + 1e-6,
      `${label} ${key} outside limits: ${state[key]}`,
    );
  }
}

function assertStrictActuators(pose, label) {
  for (const [key, actuator] of Object.entries(pose.actuators)) {
    assert.ok(actuator.violation <= 1e-6, `${label} ${key} actuator violation: ${actuator.violation}`);
  }
}

function assertVerticalTool(pose, label) {
  assert.ok(Math.abs(pose.absoluteAngles.tool + 90) < 0.01, `${label} tool not vertical: ${pose.absoluteAngles.tool}`);
}

function solveSequence(mode, targets) {
  let state = verticalOffsetForState(applyPreset("calibration"));
  let previousDelta = { base: 0, arm1: 0, arm2: 0, arm3: 0, offset: 0 };
  let previousState = null;
  let previousPreviousState = null;
  let maxResidualMm = 0;
  let maxStepDeg = 0;
  const samples = [];

  targets.forEach((target, index) => {
    const solved = solveStateForWorldDisplayedToolTarget(target, state, TOOL_BALL_STICK_OFFSET_MM, {
      ikMode: mode,
      previousDelta,
      previousState,
      previousPreviousState,
    });
    const actual = worldDisplayedToolPointForState(solved.state, TOOL_BALL_STICK_OFFSET_MM);
    const residual = distance(actual, target);
    const label = `${mode} target ${index}`;
    assert.ok(solved.reachable, `${label} unreachable: ${JSON.stringify(solved.formalPhi || {})}`);
    assert.ok(residual < 1, `${label} residual too high: ${residual}`);
    assertWithinLimits(solved.state, label);
    assertStrictActuators(solved.pose, label);
    assertVerticalTool(solved.pose, label);
    maxResidualMm = Math.max(maxResidualMm, residual);
    maxStepDeg = Math.max(maxStepDeg, maxAbsDelta(solved.delta));
    samples.push({
      index,
      target,
      residualMm: Number(residual.toFixed(6)),
      maxStepDeg: Number(maxAbsDelta(solved.delta).toFixed(6)),
      state: solved.state,
      phiDeg: solved.formalPhi?.phiDeg,
      elbowSign: solved.formalPhi?.elbowSign,
    });
    previousPreviousState = previousState ? { ...previousState } : null;
    previousState = { ...solved.state };
    previousDelta = solved.delta;
    state = solved.state;
  });

  return {
    mode,
    label: MODE_LABELS[mode],
    maxResidualMm: Number(maxResidualMm.toFixed(6)),
    maxStepDeg: Number(maxStepDeg.toFixed(6)),
    samples,
  };
}

const path = parseCsvPathPoints(readFileSync("outputs/html-version/assets/paths/cuboid-4000x2700x3300-layer200-y3600-viewXYZ.csv", "utf8"));
const calibrationState = verticalOffsetForState(applyPreset("calibration"));
const calibrationTarget = worldDisplayedToolPointForState(calibrationState, TOOL_BALL_STICK_OFFSET_MM);
const targets = [
  calibrationTarget,
  path[0],
  path[Math.floor(path.length * 0.25)],
  path[Math.floor(path.length * 0.5)],
  path[Math.floor(path.length * 0.75)],
  path[path.length - 1],
  { x: 6000, y: -1800, z: 3200 },
];

assert.equal(DEFAULT_FORMAL_IK_MODE, "posture_priority", "default formal IK mode");
assert.deepEqual(FORMAL_IK_MODE_KEYS, ["greedy_continuity", "balanced_posture", "posture_priority"], "formal IK modes");

const results = FORMAL_IK_MODE_KEYS.map((mode) => solveSequence(mode, targets));
console.log(JSON.stringify({ targetCount: targets.length, results }, null, 2));
