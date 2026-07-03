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

const arm2MaxSourceState = stateFromActuatorStrokes({ arm2: 1 }, DEFAULT_STATE);
const arm2MaxTarget = worldDisplayedToolPointForState(arm2MaxSourceState, { x: 0, y: 262, z: 0 });
const arm2PreferredSolved = solveStateForWorldDisplayedToolTarget(arm2MaxTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 });
const arm2PreferredTip = worldDisplayedToolPointForState(arm2PreferredSolved.state, { x: 0, y: 262, z: 0 });
const arm2PreferredError = Math.hypot(
  arm2PreferredTip.x - arm2MaxTarget.x,
  arm2PreferredTip.y - arm2MaxTarget.y,
  arm2PreferredTip.z - arm2MaxTarget.z,
);
assert.ok(arm2PreferredError <= 5, `arm2 preferred inverse target error must stay low, got ${arm2PreferredError}`);
assert.ok(
  arm2PreferredSolved.pose.actuators.arm2.stroke >= 0.95,
  `inverse solution should prefer high arm2 stroke, got ${arm2PreferredSolved.pose.actuators.arm2.stroke}`,
);
assert.ok(arm2PreferredSolved.actuatorViolation <= EPS, "arm2 preferred inverse solution must remain within stroke limits");

console.log("Actuator constraint verification passed.");
