import assert from "node:assert/strict";
import {
  ACTUATOR_STROKE_LIMITS,
  DEFAULT_STATE,
  LIMITS,
  clampState,
  computePose,
  solveStateForWorldDisplayedToolTarget,
  stateFromActuatorStrokes,
  worldDisplayedToolPointForState,
} from "../outputs/html-version/model.mjs";

const EPS = 0.25;
const EXPECTED_STROKE_LENGTHS = { arm1: 900, arm2: 680, arm3: 520 };

assert.deepEqual(
  { min: LIMITS.offset.min, max: LIMITS.offset.max },
  { min: -60, max: 85 },
  "print head angle range",
);
assert.equal(clampState({ ...DEFAULT_STATE, offset: -120 }).offset, -60, "print head min clamp");
assert.equal(clampState({ ...DEFAULT_STATE, offset: 120 }).offset, 85, "print head max clamp");

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

const ikTarget = worldDisplayedToolPointForState({ arm1: 82, arm2: 105, arm3: 96, offset: 0, base: 180 }, { x: 0, y: 262, z: 0 });
const originalIk = solveStateForWorldDisplayedToolTarget(ikTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 }, { ikMode: "original" });
assert.equal(originalIk.ikMode, "original", "original IK mode should be reported");
assert.ok(originalIk.delta && Number.isFinite(originalIk.delta.arm1), "original IK should return a joint delta");

const improvedIk = solveStateForWorldDisplayedToolTarget(ikTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 }, {
  ikMode: "improved",
  previousDelta: originalIk.delta,
});
assert.equal(improvedIk.ikMode, "improved", "improved IK mode should be reported");
assert.ok(improvedIk.delta && Number.isFinite(improvedIk.delta.arm2), "improved IK should return a joint delta");

console.log("Actuator constraint verification passed.");
