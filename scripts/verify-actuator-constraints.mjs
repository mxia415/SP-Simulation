import assert from "node:assert/strict";
import {
  ACTUATOR_STROKE_LIMITS,
  DEFAULT_STATE,
  computePose,
  solveStateForWorldDisplayedToolTarget,
  stateFromActuatorStrokes,
  worldDisplayedToolPointForState,
} from "../outputs/html-version/model.mjs";

const EPS = 0.25;
const EXPECTED_STROKE_LENGTHS = { arm1: 900, arm2: 680, arm3: 520 };

function actuatorLength(state, key) {
  return computePose(state).actuators[key].instances[0].length;
}

function assertNear(actual, expected, label, epsilon = EPS) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);
}

for (const key of ["arm1", "arm2", "arm3"]) {
  const limits = ACTUATOR_STROKE_LIMITS[key];
  assert.equal(limits.strokeLength, EXPECTED_STROKE_LENGTHS[key], `${key} stroke length`);
  assert.equal(limits.maxLength, limits.minLength + limits.strokeLength);
  const minState = stateFromActuatorStrokes({ [key]: 0 }, DEFAULT_STATE);
  const minLength = actuatorLength(minState, key);
  assertNear(minLength, limits.minLength, `${key} 0% stroke length`);

  const maxState = stateFromActuatorStrokes({ [key]: 1 }, DEFAULT_STATE);
  const maxPose = computePose(maxState);
  const maxLength = maxPose.actuators[key].instances[0].length;
  assert.ok(maxLength <= limits.maxLength + EPS, `${key} 100% stroke must not exceed max length`);
  assert.ok(maxPose.actuators[key].stroke > 0.96, `${key} 100% stroke should reach the closest high-stroke pose`);
  assert.ok(maxPose.actuators[key].withinStroke, `${key} 100% stroke pose must remain within actuator limits`);
}

const overextendedTarget = { x: 7200, y: 0, z: 3600 };
const solved = solveStateForWorldDisplayedToolTarget(overextendedTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 });
for (const key of ["arm1", "arm2", "arm3"]) {
  assert.ok(
    solved.pose.actuators[key].withinStroke,
    `${key} inverse solution must respect actuator stroke limits`,
  );
}
assert.ok(solved.actuatorViolation <= EPS, `inverse actuator violation must be near zero, got ${solved.actuatorViolation}`);

const displayTip = worldDisplayedToolPointForState(solved.state, { x: 0, y: 262, z: 0 });
assert.ok(Number.isFinite(displayTip.x) && Number.isFinite(displayTip.y) && Number.isFinite(displayTip.z));

const synchronizedSourceState = stateFromActuatorStrokes({ arm1: 0.75, arm2: 0.75, arm3: 0.75 }, DEFAULT_STATE);
const synchronizedTarget = worldDisplayedToolPointForState(synchronizedSourceState, { x: 0, y: 262, z: 0 });
const synchronizedSolved = solveStateForWorldDisplayedToolTarget(synchronizedTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 });
const synchronizedTip = worldDisplayedToolPointForState(synchronizedSolved.state, { x: 0, y: 262, z: 0 });
const synchronizedError = Math.hypot(
  synchronizedTip.x - synchronizedTarget.x,
  synchronizedTip.y - synchronizedTarget.y,
  synchronizedTip.z - synchronizedTarget.z,
);
const synchronizedStrokes = Object.values(synchronizedSolved.pose.actuators).map((actuator) => actuator.stroke);
const synchronizedSpread = Math.max(...synchronizedStrokes) - Math.min(...synchronizedStrokes);
assert.ok(synchronizedError <= 5, `synchronized inverse target error must stay low, got ${synchronizedError}`);
assert.ok(
  synchronizedSpread <= 0.12,
  `inverse solution should keep actuator strokes nearly synchronized, got spread ${synchronizedSpread}`,
);
assert.ok(synchronizedSolved.actuatorViolation <= EPS, "synchronized inverse solution must remain within stroke limits");

console.log("Actuator constraint verification passed.");
