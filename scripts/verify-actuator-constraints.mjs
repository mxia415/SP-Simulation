import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  ACTIVE5_DLS_IK_PARAMS,
  ACTUATOR_STROKE_LIMITS,
  BALANCED_IK_PARAMS,
  DEFAULT_STATE,
  IK_DQ_LIMIT_DEG,
  IK_MODES,
  IK_CONTINUITY_WEIGHTS,
  IMPROVED_IK_REFERENCE_DEG,
  IMPROVED_IK_PARAMS,
  LIMITS,
  PHI_SCAN_IK_PARAMS,
  clampState,
  computePose,
  solveStateForWorldDisplayedToolTarget,
  stateFromActuatorStrokes,
  worldDisplayedToolPointForState,
} from "../outputs/html-version/model.mjs";

const EPS = 0.25;
const EXPECTED_STROKE_LENGTHS = { arm1: 750, arm2: 680, arm3: 580 };
const EXPECTED_MIN_LENGTHS = { arm1: 1280.7, arm2: 1180.9, arm3: 1365 };

assert.deepEqual(
  { min: LIMITS.offset.min, max: LIMITS.offset.max },
  { min: -60, max: 85 },
  "print head angle range",
);
assert.equal(clampState({ ...DEFAULT_STATE, offset: -120 }).offset, -60, "print head min clamp");
assert.equal(clampState({ ...DEFAULT_STATE, offset: 120 }).offset, 85, "print head max clamp");
assertNear(LIMITS.arm1.max, 83.8189, "arm1 max angle from corrected actuator/joint limit", 0.01);
assert.equal(clampState({ ...DEFAULT_STATE, arm1: 128 }).arm1, LIMITS.arm1.max, "arm1 clamp should use actuator-derived max angle");
assert.deepEqual(
  IMPROVED_IK_REFERENCE_DEG,
  { arm1: 90, arm2: 120, arm3: 60, offset: 0 },
  "HTML Improved IK posture reference should match the restored Python strategy",
);
assert.deepEqual(
  IK_CONTINUITY_WEIGHTS,
  { base: 0.02, arm1: 0.08, arm2: 0.04, arm3: 0.04, offset: 0.02 },
  "HTML IK continuity weights should match the restored Python strategy",
);
assert.deepEqual(
  IK_MODES,
  {
    original: { key: "original", label: "Original" },
    balanced: { key: "balanced", label: "Balanced" },
    improved: { key: "improved", label: "Improved" },
    phiScan: { key: "phi_scan", label: "Phi Scan" },
    active5Dls: { key: "active5_dls", label: "Active-5 3D DLS" },
  },
  "HTML IK modes should expose all five Python simulation algorithms",
);
assert.deepEqual(
  IK_DQ_LIMIT_DEG,
  { base: 2, arm1: 6, arm2: 6, arm3: 6, offset: 2 },
  "HTML IK rate limiter should match the requested per-joint limits",
);
assert.deepEqual(
  BALANCED_IK_PARAMS,
  {
    continuityScale: 0.6,
    postureGamma: 1.5,
    smoothnessMu: 1.2,
    referenceDeg: { base: 0, arm1: 90, arm2: 120, arm3: 60, offset: 0 },
  },
  "Balanced IK parameters should match the requested scoring strategy",
);
assert.deepEqual(
  IMPROVED_IK_PARAMS,
  {
    continuityScale: 0.3,
    postureGamma: 5,
    smoothnessMu: 3,
    referenceDeg: { base: 0, arm1: 90, arm2: 120, arm3: 60, offset: 0 },
  },
  "Improved IK should remain the strong posture-biased comparison strategy",
);
assert.deepEqual(
  PHI_SCAN_IK_PARAMS,
  {
    phiMinDeg: -250,
    phiMaxDeg: 250,
    phiStepDeg: 12,
    phiLocalSpanDeg: 32,
    phiLocalStepDeg: 2,
    baseLocalSpanDeg: 8,
    baseLocalStepDeg: 4,
    baseAnalyticSpanDeg: 4,
    baseAnalyticStepDeg: 2,
    qRefRelativeDeg: { arm1: 90, arm2: -120, arm3: -60 },
    wMove: 0.003,
    wSmooth: 0.03,
    wPosture: 0.001,
    wUnreachable: 0.05,
    ddqLimitDeg: { base: 1, arm1: 2, arm2: 2, arm3: 2, offset: 1 },
    wBrake: 250,
  },
  "Phi Scan IK parameters should match the Python simulation",
);
assert.deepEqual(
  ACTIVE5_DLS_IK_PARAMS,
  {
    Kp: 0.8,
    maxCartStepMm: 80,
    damping: 0.08,
    WDiag: { base: 1.1, arm1: 1, arm2: 1, arm3: 1, offset: 0.8 },
    mu: 0,
    gamma: 0,
    toolAngleWeightMm: 500,
    targetToolAngleDeg: -90,
    maxOrientationStepDeg: 5,
    qRefDeg: { base: 0, arm1: 90, arm2: 90, arm3: 100, offset: 0 },
    dqLimitDeg: { base: 2, arm1: 6, arm2: 6, arm3: 6, offset: 2 },
    ddqLimitDeg: { base: 1, arm1: 2, arm2: 2, arm3: 2, offset: 1 },
  },
  "Active-5 3D DLS IK parameters should expose all five controlled joints",
);

function actuatorLength(state, key) {
  return computePose(state).actuators[key].instances[0].length;
}

function assertNear(actual, expected, label, epsilon = EPS) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);
}

for (const key of ["arm1", "arm2", "arm3"]) {
  const limits = ACTUATOR_STROKE_LIMITS[key];
  assert.equal(limits.minLength, EXPECTED_MIN_LENGTHS[key], `${key} min length`);
  assert.equal(limits.strokeLength, EXPECTED_STROKE_LENGTHS[key], `${key} stroke length`);
  assert.equal(limits.maxLength, limits.minLength + limits.strokeLength);
  const minState = stateFromActuatorStrokes({ [key]: 0 }, DEFAULT_STATE);
  const minLength = actuatorLength(minState, key);
  assert.ok(minLength >= limits.minLength - EPS, `${key} 0% stroke length must not go below min`);
  if (Math.abs(minLength - limits.minLength) <= EPS) {
    assertNear(minLength, limits.minLength, `${key} 0% stroke length`);
  } else {
    assert.ok(
      Math.abs(minState[key] - LIMITS[key].min) < 0.001 || Math.abs(minState[key] - LIMITS[key].max) < 0.001,
      `${key} unreachable 0% stroke should settle at an angle limit`,
    );
  }

  const maxState = stateFromActuatorStrokes({ [key]: 1 }, DEFAULT_STATE);
  const maxPose = computePose(maxState);
  const maxLength = maxPose.actuators[key].instances[0].length;
  assert.ok(maxLength <= limits.maxLength + EPS, `${key} 100% stroke must not exceed max length`);
  assert.ok(maxPose.actuators[key].stroke > 0.95, `${key} 100% stroke should reach the closest high-stroke pose`);
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

const balancedIk = solveStateForWorldDisplayedToolTarget(ikTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 }, {
  ikMode: "balanced",
  previousDelta: originalIk.delta,
});
assert.equal(balancedIk.ikMode, "balanced", "balanced IK mode should be reported");
assert.ok(balancedIk.delta && Number.isFinite(balancedIk.delta.arm3), "balanced IK should return a joint delta");
assert.ok(
  balancedIk.metrics && Number.isFinite(balancedIk.metrics.posture_deviation_deg),
  "balanced IK should return evaluation metrics",
);
for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
  assert.ok(
    Number.isFinite(balancedIk.metrics.mean_abs_ddq_per_joint[key]) &&
      Number.isFinite(balancedIk.metrics.max_abs_ddq_per_joint[key]),
    `${key} IK metrics should include per-joint acceleration change`,
  );
}
assert.ok(
  Number.isFinite(balancedIk.metrics.dq_prev_deviation_deg),
  "IK metrics should include previous-delta deviation",
);

const phiScanStartedAt = performance.now();
const phiScanIk = solveStateForWorldDisplayedToolTarget(ikTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 }, {
  ikMode: "phi_scan",
  previousDelta: balancedIk.delta,
});
const phiScanElapsedMs = performance.now() - phiScanStartedAt;
assert.equal(phiScanIk.ikMode, "phi_scan", "Phi Scan IK mode should be reported");
assert.ok(phiScanIk.delta && Number.isFinite(phiScanIk.delta.arm1), "Phi Scan IK should return a joint delta");
assert.ok(phiScanElapsedMs < 200, `Phi Scan IK should stay interactive, got ${phiScanElapsedMs.toFixed(1)}ms`);
for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
  assert.ok(
    Math.abs(phiScanIk.delta[key]) <= IK_DQ_LIMIT_DEG[key] + 0.001,
    `${key} Phi Scan output delta should respect shared rate limit`,
  );
}

function toolAngleErrorDeg(state) {
  return Math.abs(-90 - (state.arm1 - state.arm2 - state.arm3 - state.offset));
}

const active5Target = worldDisplayedToolPointForState({ arm1: 76, arm2: 112, arm3: 82, offset: 0, base: 130 }, { x: 0, y: 262, z: 0 });
const active5HoldState = clampState({ arm1: 76, arm2: 112, arm3: 82, offset: -28, base: 130 });
const active5HoldTarget = worldDisplayedToolPointForState(active5HoldState, { x: 0, y: 262, z: 0 });
const active5HoldIk = solveStateForWorldDisplayedToolTarget(active5HoldTarget, active5HoldState, { x: 0, y: 262, z: 0 }, {
  ikMode: "active5_dls",
  previousDelta: { base: 0, arm1: 0, arm2: 0, arm3: 0, offset: 0 },
});
for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
  assert.ok(
    Math.abs(active5HoldIk.delta[key]) < 0.001,
    `${key} Active-5 3D DLS should not drift when the target already matches the current tool point`,
  );
}

const active5DlsIk = solveStateForWorldDisplayedToolTarget(active5Target, DEFAULT_STATE, { x: 0, y: 262, z: 0 }, {
  ikMode: "active5_dls",
  previousDelta: { base: 0, arm1: 0, arm2: 0, arm3: 0, offset: 0 },
});
assert.equal(active5DlsIk.ikMode, "active5_dls", "Active-5 3D DLS IK mode should be reported");
assert.ok(active5DlsIk.delta && Number.isFinite(active5DlsIk.delta.arm3), "Active-5 3D DLS IK should return a joint delta");
assert.ok(Math.abs(active5DlsIk.delta.base) > 0.001, "Active-5 3D DLS should move the base for XY rotation");
assert.ok(
  ["arm1", "arm2", "arm3"].some((key) => Math.abs(active5DlsIk.delta[key]) > 0.001),
  "Active-5 3D DLS should move arm joints for radius/height",
);
assert.ok(Math.abs(active5DlsIk.delta.offset) > 0.001, "Active-5 3D DLS should move printhead offset for vertical compensation");
assert.ok(
  toolAngleErrorDeg(active5DlsIk.state) < toolAngleErrorDeg({ ...DEFAULT_STATE, arm1: active5DlsIk.state.arm1, arm2: active5DlsIk.state.arm2, arm3: active5DlsIk.state.arm3, offset: DEFAULT_STATE.offset }),
  "Active-5 3D DLS should reduce printhead vertical error versus moving arms without offset compensation",
);
for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
  assert.ok(
    Math.abs(active5DlsIk.delta[key]) <= ACTIVE5_DLS_IK_PARAMS.dqLimitDeg[key] + 0.001,
    `${key} Active-5 3D DLS output delta should respect joint velocity limit`,
  );
  assert.ok(
    Math.abs(active5DlsIk.delta[key]) <= ACTIVE5_DLS_IK_PARAMS.ddqLimitDeg[key] + 0.001,
    `${key} Active-5 3D DLS output delta should respect joint acceleration limit from rest`,
  );
}

const fallbackIk = solveStateForWorldDisplayedToolTarget(ikTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 }, {
  ikMode: "unknown-mode",
});
assert.equal(fallbackIk.ikMode, "original", "unknown IK mode should fall back to Original");

const rateLimitedTarget = worldDisplayedToolPointForState(
  { arm1: 45, arm2: 150, arm3: 30, offset: 50, base: -90 },
  { x: 0, y: 262, z: 0 },
);
const rateLimitedIk = solveStateForWorldDisplayedToolTarget(rateLimitedTarget, DEFAULT_STATE, { x: 0, y: 262, z: 0 }, {
  ikMode: "balanced",
});
for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
  assert.ok(
    Math.abs(rateLimitedIk.delta[key]) <= IK_DQ_LIMIT_DEG[key] + 0.001,
    `${key} IK output delta should be rate limited to ${IK_DQ_LIMIT_DEG[key]} deg, got ${rateLimitedIk.delta[key]}`,
  );
}

const unrestrictedOriginalIk = solveStateForWorldDisplayedToolTarget(
  rateLimitedTarget,
  DEFAULT_STATE,
  { x: 0, y: 262, z: 0 },
  { ikMode: "original" },
);
assert.ok(
  ["base", "arm1", "arm2", "arm3", "offset"].some((key) => Math.abs(unrestrictedOriginalIk.delta[key]) > IK_DQ_LIMIT_DEG[key] + 0.001),
  "Original IK should remain the un-rate-limited baseline",
);

console.log("Actuator constraint verification passed.");
