import assert from "node:assert/strict";
import {
  ACTUATOR_GROUPS,
  ARM_LENGTHS_MM,
  CALIBRATION_STATE,
  DEFAULT_STATE,
  JOINTS,
  LINKAGE_GROUPS,
  LIMITS,
  PRESETS,
  TOOL_LENGTH_MM,
  TOTAL_AXIS_DISTANCE_MM,
  applyPreset,
  clampState,
  computePose,
  distance,
  localFromWorldAtCalibration,
  rotateXYAround,
  solveStateForWorldDisplayedToolTarget,
  solveStateForToolTarget,
  worldDisplayedToolPointForState,
} from "../outputs/html-version/model.mjs";

const closeTo = (actual, expected, tolerance = 0.01) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

const closePoint = (actual, expected, tolerance = 0.01) => {
  closeTo(actual.x, expected.x, tolerance);
  closeTo(actual.y, expected.y, tolerance);
  closeTo(actual.z, expected.z, tolerance);
};

assert.deepEqual(LIMITS.arm1, { min: 0, max: 120, label: "臂1" });
assert.deepEqual(LIMITS.arm2, { min: 0, max: 180, label: "臂2" });
assert.deepEqual(LIMITS.arm3, { min: 0, max: 180, label: "臂3" });
assert.deepEqual(LIMITS.offset, { min: -270, max: 210, label: "打印头" });
assert.deepEqual(LIMITS.base, { min: -180, max: 180, label: "旋转" });

assert.deepEqual(DEFAULT_STATE, { arm1: 90, arm2: 90, arm3: 90, offset: 0, base: 180 });
assert.deepEqual(CALIBRATION_STATE, DEFAULT_STATE);
assert.deepEqual(PRESETS.calibration.values, { arm1: 90, arm2: 90, arm3: 90, offset: 0, base: 0 });
assert.equal(PRESETS.calibration.keepToolVertical, true);
assert.equal(PRESETS.folded.keepToolVertical, false);

assert.deepEqual(JOINTS.baseArm1, { x: -450.742, y: 0, z: 385.188, name: "底座-臂1旋转轴心" });
assert.deepEqual(JOINTS.arm1Arm2, { x: -450.742, y: 0, z: 3782.1, name: "臂1-臂2旋转轴心" });
assert.deepEqual(JOINTS.arm2Arm3, { x: 2596.265, y: 0, z: 3782.1, name: "臂2-臂3旋转轴心" });
assert.deepEqual(JOINTS.arm3Tool, { x: 2596.265, y: 0, z: 1728.536, name: "臂3-打印头旋转轴心" });

closeTo(ARM_LENGTHS_MM.arm1, 3396.912);
closeTo(ARM_LENGTHS_MM.arm2, 3047.007);
closeTo(ARM_LENGTHS_MM.arm3, 2053.564);
assert.equal(TOOL_LENGTH_MM, 730);
closeTo(TOTAL_AXIS_DISTANCE_MM, 8497.483);

assert.equal(ACTUATOR_GROUPS.arm1.count, 2);
assert.deepEqual(ACTUATOR_GROUPS.arm1.tail, { x: 0, y: 0, z: 0 });
assert.deepEqual(ACTUATOR_GROUPS.arm1.frontWorldAtCalibration, { x: -766.162, y: 0, z: 1915.092 });
assert.equal(ACTUATOR_GROUPS.arm2.count, 2);
assert.deepEqual(ACTUATOR_GROUPS.arm2.tailWorldAtCalibration, { x: -766.242, y: 0, z: 2177.092 });
assert.deepEqual(ACTUATOR_GROUPS.arm2.frontWorldAtCalibration, { x: -226.672, y: 0, z: 3691.4 });
assert.equal(ACTUATOR_GROUPS.arm3.count, 1);
assert.deepEqual(ACTUATOR_GROUPS.arm3.tailWorldAtCalibration, { x: 818.447, y: 0, z: 3901.033 });
assert.deepEqual(ACTUATOR_GROUPS.arm3.frontWorldAtCalibration, { x: 2488.713, y: 0, z: 3601.608 });

assert.equal(LINKAGE_GROUPS.A.link1.length, 407.5);
assert.equal(LINKAGE_GROUPS.A.link2.length, 157);
assert.deepEqual(LINKAGE_GROUPS.A.commonWorldAtCalibration, { x: -226.672, y: 0, z: 3691.4 });
assert.deepEqual(LINKAGE_GROUPS.A.link1.anchorWorldAtCalibration, { x: -630.742, y: 0, z: 3748.117 });
assert.deepEqual(LINKAGE_GROUPS.A.link2.anchorWorldAtCalibration, { x: -90.799, y: 0, z: 3774.02 });
closeTo(distance(LINKAGE_GROUPS.A.commonWorldAtCalibration, LINKAGE_GROUPS.A.link1.anchorWorldAtCalibration), 408.031, 0.01);
closeTo(distance(LINKAGE_GROUPS.A.commonWorldAtCalibration, LINKAGE_GROUPS.A.link2.anchorWorldAtCalibration), 159.021, 0.01);

assert.equal(LINKAGE_GROUPS.B.link1.length, 392);
assert.equal(LINKAGE_GROUPS.B.link2.length, 168);
assert.deepEqual(LINKAGE_GROUPS.B.link1Sides, [-126, 126]);
assert.deepEqual(LINKAGE_GROUPS.B.link2Sides, [0]);
assert.deepEqual(LINKAGE_GROUPS.B.commonWorldAtCalibration, { x: 2488.713, y: 0, z: 3601.608 });
assert.deepEqual(LINKAGE_GROUPS.B.link1.anchorWorldAtCalibration, { x: 2551.0, y: 0, z: 3988.9 });
assert.deepEqual(LINKAGE_GROUPS.B.link2.anchorWorldAtCalibration, { x: 2627.74, y: 0, z: 3570.291 });
closeTo(distance(LINKAGE_GROUPS.B.commonWorldAtCalibration, LINKAGE_GROUPS.B.link1.anchorWorldAtCalibration), 392.269, 0.01);
closeTo(distance(LINKAGE_GROUPS.B.commonWorldAtCalibration, LINKAGE_GROUPS.B.link2.anchorWorldAtCalibration), 142.511, 0.01);

const arm2TailLocal = localFromWorldAtCalibration(
  ACTUATOR_GROUPS.arm2.tailWorldAtCalibration,
  "arm1",
);
closePoint(arm2TailLocal, { x: 1791.904, y: 0, z: 315.5 }, 0.01);

assert.deepEqual(clampState({ arm1: -10, arm2: 300, arm3: 91, offset: -400, base: 361 }), {
  arm1: 0,
  arm2: 180,
  arm3: 91,
  offset: -270,
  base: 180,
});

assert.deepEqual(applyPreset("calibration"), { arm1: 90, arm2: 90, arm3: 90, offset: 0, base: 0 });

const pose = computePose(DEFAULT_STATE);
closePoint(pose.joints[0], JOINTS.baseArm1);
closePoint(pose.joints[1], JOINTS.arm1Arm2);
closePoint(pose.joints[2], JOINTS.arm2Arm3);
closePoint(pose.joints[3], JOINTS.arm3Tool);
closePoint(pose.toolCenter, { x: 2596.265, y: 0, z: 998.536 });
assert.equal(pose.baseAngle, 180);
assert.equal(pose.absoluteAngles.arm1, 90);
assert.equal(pose.absoluteAngles.arm2, 0);
assert.equal(pose.absoluteAngles.arm3, -90);
assert.equal(pose.absoluteAngles.tool, -90);
assert.equal(pose.actuators.arm1.instances.length, 2);
assert.equal(pose.actuators.arm2.instances.length, 2);
assert.equal(pose.actuators.arm3.instances.length, 1);
closePoint(pose.actuators.arm2.center.tail, ACTUATOR_GROUPS.arm2.tailWorldAtCalibration);
closePoint(pose.actuators.arm2.center.front, pose.linkages.A.center.common);
closePoint(pose.linkages.A.center.common, { x: -226.672, y: 0, z: 3695.359 });
closePoint(pose.linkages.B.center.common, { x: 2463.741, y: 0, z: 3606.735 });

const linearTarget = { x: pose.toolCenter.x + 600, y: 0, z: pose.toolCenter.z + 200 };
const linearSolve = solveStateForToolTarget(linearTarget, DEFAULT_STATE);
const initialLinearError = distance(pose.toolCenter, linearTarget);
const baseDragTarget = rotateXYAround(pose.toolCenter, 20);
const baseDragSolve = solveStateForToolTarget(baseDragTarget, DEFAULT_STATE);
closeTo(baseDragSolve.state.base, 160, 0.2);
const displayOffset = { x: 0, y: 262, z: 0 };
const defaultWorldTip = worldDisplayedToolPointForState(DEFAULT_STATE, displayOffset);
const rotatedWorldTip = worldDisplayedToolPointForState({ ...DEFAULT_STATE, base: 90 }, displayOffset);
assert.notEqual(defaultWorldTip.y.toFixed(3), rotatedWorldTip.y.toFixed(3));
const worldBaseSolve = solveStateForWorldDisplayedToolTarget(rotatedWorldTip, DEFAULT_STATE, displayOffset);
closeTo(worldBaseSolve.state.base, 90, 0.2);
const solvedLinearError = distance(linearSolve.pose.toolCenter, linearTarget);
assert.ok(solvedLinearError < initialLinearError * 0.45);
assert.ok(linearSolve.state.arm1 >= LIMITS.arm1.min && linearSolve.state.arm1 <= LIMITS.arm1.max);
assert.ok(linearSolve.state.arm2 >= LIMITS.arm2.min && linearSolve.state.arm2 <= LIMITS.arm2.max);
assert.ok(linearSolve.state.arm3 >= LIMITS.arm3.min && linearSolve.state.arm3 <= LIMITS.arm3.max);

console.log("lingzhu-control SP-S model tests passed");
