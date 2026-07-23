export const LIMITS = {
  arm1: { min: 0, max: 83.8189, label: "臂1" },
  arm2: { min: 16.0271, max: 177.9644, label: "臂2" },
  arm3: { min: 10.4567, max: 180, label: "臂3" },
  offset: { min: -55, max: 150, label: "打印头" },
  base: { min: -180, max: 180, label: "旋转" },
};

export const DEFAULT_STATE = {
  arm1: 90,
  arm2: 90,
  arm3: 90,
  offset: 0,
  base: 180,
};

export const CALIBRATION_STATE = { ...DEFAULT_STATE };
export const BASE_LINK_PIVOT_MM = { x: 118.258, y: 0, z: 0 };

export const PRESETS = {
  calibration: {
    label: "垂直姿态",
    values: { arm1: 90, arm2: 90, arm3: 90, offset: 0, base: 0 },
    keepToolVertical: true,
  },
  initialPrint: {
    label: "初始打印姿态",
    values: { arm1: 81, arm2: 72, arm3: 49, offset: 50, base: 4 },
    keepToolVertical: true,
  },
  folded: {
    label: "折叠姿态",
    values: { arm1: 0, arm2: 180, arm3: 180, offset: 0, base: 180 },
    keepToolVertical: false,
  },
};

export const IK_MODES = {
  greedyContinuity: { key: "greedy_continuity", label: "局部贪心解析 φ" },
  balancedPosture: { key: "balanced_posture", label: "平衡姿态解析 φ" },
  posturePriority: { key: "posture_priority", label: "强姿态解析 φ" },
  original: { key: "original", label: "Original" },
  balanced: { key: "balanced", label: "Balanced" },
  improved: { key: "improved", label: "Improved" },
  phiScan: { key: "phi_scan", label: "Phi Scan" },
  active5Dls: { key: "active5_dls", label: "Active-5 3D DLS" },
};
export const FORMAL_IK_MODE_KEYS = [
  IK_MODES.greedyContinuity.key,
  IK_MODES.balancedPosture.key,
  IK_MODES.posturePriority.key,
];
export const DEFAULT_FORMAL_IK_MODE = IK_MODES.posturePriority.key;
export const FORMAL_PHI_IK_PARAMS = {
  candidatePhiStepDeg: 0.2,
  refinementIterations: 12,
  fallbackPhiStepDeg: 0.01,
  targetToolAbsoluteAngleDeg: -90,
  actuatorToleranceMm: 1e-6,
  linkageToleranceMm: 0.01,
  referenceDeg: { arm1: 70, arm2: 90, arm3: 90, offset: -20 },
  weights: {
    greedy_continuity: { movement: 1, smoothness: 0.35, posture: 0 },
    balanced_posture: { movement: 1, smoothness: 1.15, posture: 0.003 },
    posture_priority: { movement: 0.8, smoothness: 2.5, posture: 0.012 },
  },
  barrierWeight: 2e-7,
};

export const IK_CONTINUITY_WEIGHTS = { base: 0.02, arm1: 0.08, arm2: 0.04, arm3: 0.04, offset: 0.02 };
export const IK_DQ_LIMIT_DEG = { base: 2, arm1: 6, arm2: 6, arm3: 6, offset: 2 };
export const IK_REFERENCE_DEG = { base: 0, arm1: 90, arm2: 120, arm3: 60, offset: 0 };
export const BALANCED_IK_PARAMS = {
  continuityScale: 0.6,
  postureGamma: 1.5,
  smoothnessMu: 1.2,
  referenceDeg: { ...IK_REFERENCE_DEG },
};
export const IMPROVED_IK_PARAMS = {
  continuityScale: 0.3,
  postureGamma: 5,
  smoothnessMu: 3,
  referenceDeg: { ...IK_REFERENCE_DEG },
};
export const PHI_SCAN_IK_PARAMS = {
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
};
export const ACTIVE5_DLS_IK_PARAMS = {
  Kp: 0.8,
  maxCartStepMm: 80,
  damping: 0.08,
  WDiag: { base: 1.1, arm1: 1, arm2: 1, arm3: 1, offset: 0.8 },
  mu: 0,
  gamma: 0,
  toolAngleWeightMm: 500,
  targetToolAngleDeg: -90,
  maxOrientationStepDeg: 5,
  qRefDeg: { base: IK_REFERENCE_DEG.base, arm1: 90, arm2: 90, arm3: 100, offset: IK_REFERENCE_DEG.offset },
  dqLimitDeg: { base: 2, arm1: 6, arm2: 6, arm3: 6, offset: 2 },
  ddqLimitDeg: { base: 1, arm1: 2, arm2: 2, arm3: 2, offset: 1 },
};
export const IMPROVED_IK_REFERENCE_DEG = {
  arm1: IK_REFERENCE_DEG.arm1,
  arm2: IK_REFERENCE_DEG.arm2,
  arm3: IK_REFERENCE_DEG.arm3,
  offset: IK_REFERENCE_DEG.offset,
};
export const IMPROVED_IK_POSTURE_GAMMA = IMPROVED_IK_PARAMS.postureGamma;
export const IMPROVED_IK_SMOOTHNESS_MU = IMPROVED_IK_PARAMS.smoothnessMu;

export const JOINTS = {
  baseArm1: { x: -450.742, y: 0, z: 385.188, name: "底座-臂1旋转轴心" },
  arm1Arm2: { x: -450.742, y: 0, z: 3782.177, name: "臂1-臂2旋转轴心" },
  arm2Arm3: { x: 2596.265, y: 0, z: 3782.177, name: "臂2-臂3旋转轴心" },
  arm3Tool: { x: 2596.265, y: 0, z: 1728.613, name: "臂3-打印头旋转轴心" },
};

export const TOOL_LENGTH_MM = 730;

export function distance(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0), (a.z || 0) - (b.z || 0));
}

export const ARM_LENGTHS_MM = {
  arm1: distance(JOINTS.baseArm1, JOINTS.arm1Arm2),
  arm2: distance(JOINTS.arm1Arm2, JOINTS.arm2Arm3),
  arm3: distance(JOINTS.arm2Arm3, JOINTS.arm3Tool),
};

export const TOTAL_AXIS_DISTANCE_MM = ARM_LENGTHS_MM.arm1 + ARM_LENGTHS_MM.arm2 + ARM_LENGTHS_MM.arm3;

const SIDE_OFFSET_MM = 230;
const ARM1_ACTUATOR_SIDE_OFFSET_MM = 291;
const ARM2_ACTUATOR_SIDE_OFFSET_MM = 195.5;

export const ACTUATOR_STROKE_LIMITS = {
  arm1: { minLength: 1280.7, strokeLength: 750, label: "电缸1" },
  arm2: { minLength: 1180.9, strokeLength: 680, label: "电缸2" },
  arm3: { minLength: 1365, strokeLength: 580, label: "电缸3" },
};

Object.values(ACTUATOR_STROKE_LIMITS).forEach((limit) => {
  limit.maxLength = Number((limit.minLength + limit.strokeLength).toFixed(3));
});

export const ACTUATOR_GROUPS = {
  arm1: {
    label: "电缸1",
    count: 2,
    sides: [-ARM1_ACTUATOR_SIDE_OFFSET_MM, ARM1_ACTUATOR_SIDE_OFFSET_MM],
    tail: { x: 0, y: 0, z: 0 },
    frontWorldAtCalibration: { x: -766.162, y: 0, z: 1915.092 },
    frontOn: "arm1",
  },
  arm2: {
    label: "电缸2",
    count: 2,
    sides: [-ARM2_ACTUATOR_SIDE_OFFSET_MM, ARM2_ACTUATOR_SIDE_OFFSET_MM],
    tailWorldAtCalibration: { x: -766.242, y: 0, z: 2177.092 },
    tailOn: "arm1",
    frontWorldAtCalibration: { x: -226.672, y: 0, z: 3691.4 },
    frontOn: "arm2",
  },
  arm3: {
    label: "电缸3",
    count: 1,
    sides: [0],
    tailWorldAtCalibration: { x: 818.447, y: 0, z: 3901.033 },
    tailOn: "arm2",
    frontWorldAtCalibration: { x: 2488.713, y: 0, z: 3601.608 },
    frontOn: "arm3",
  },
};

export const LINKAGE_GROUPS = {
  A: {
    label: "连接杆组合体A",
    count: 2,
    sides: [-SIDE_OFFSET_MM, SIDE_OFFSET_MM],
    commonWorldAtCalibration: { x: -226.672, y: 0, z: 3691.4 },
    commonOn: "arm2",
    link1: {
      label: "连杆A-1",
      length: 407.5,
      anchorWorldAtCalibration: { x: -630.742, y: 0, z: 3748.117 },
      anchorOn: "arm1",
    },
    link2: {
      label: "连杆A-2",
      length: 157,
      anchorWorldAtCalibration: { x: -90.799, y: 0, z: 3774.02 },
      anchorOn: "arm2",
    },
  },
  B: {
    label: "连接杆组合体B",
    count: 1,
    sides: [0],
    link1Sides: [-126, 126],
    link2Sides: [0],
    commonWorldAtCalibration: { x: 2488.713, y: 0, z: 3601.608 },
    commonOn: "arm3",
    link1: {
      label: "连杆B-1",
      length: 392,
      anchorWorldAtCalibration: { x: 2548.758, y: 0, z: 3988.982 },
      anchorOn: "arm2",
    },
    link2: {
      label: "连杆B-2",
      length: 168,
      anchorWorldAtCalibration: { x: 2627.74, y: 0, z: 3507.291 },
      anchorOn: "arm3",
    },
  },
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

export function clampState(state) {
  return {
    arm1: clamp(state.arm1, LIMITS.arm1.min, LIMITS.arm1.max),
    arm2: clamp(state.arm2, LIMITS.arm2.min, LIMITS.arm2.max),
    arm3: clamp(state.arm3, LIMITS.arm3.min, LIMITS.arm3.max),
    offset: clamp(state.offset, LIMITS.offset.min, LIMITS.offset.max),
    base: clamp(state.base, LIMITS.base.min, LIMITS.base.max),
  };
}

export function applyPreset(presetKey, currentState = DEFAULT_STATE) {
  const preset = PRESETS[presetKey];
  if (!preset) return clampState(currentState);
  return clampState({ ...currentState, ...preset.values });
}

export function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function wrapDegrees(degrees) {
  let wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  if (Math.abs(wrapped + 180) < 0.000001) wrapped = 180;
  return wrapped;
}

function angleDistance(a, b) {
  return wrapDegrees(Number(a) - Number(b));
}

function offsetPoint(point, offset = {}) {
  return {
    ...point,
    x: point.x + (offset.x || 0),
    y: (point.y || 0) + (offset.y || 0),
    z: point.z + (offset.z || 0),
  };
}

export function rotateXZ(point, degrees) {
  const angle = degToRad(degrees);
  return {
    x: point.x * Math.cos(angle) - point.z * Math.sin(angle),
    y: point.y || 0,
    z: point.x * Math.sin(angle) + point.z * Math.cos(angle),
  };
}

export function rotateXYAround(point, degrees, pivot = BASE_LINK_PIVOT_MM) {
  const angle = degToRad(degrees);
  const x = point.x - pivot.x;
  const y = (point.y || 0) - (pivot.y || 0);
  return {
    x: Number((pivot.x + x * Math.cos(angle) - y * Math.sin(angle)).toFixed(3)),
    y: Number(((pivot.y || 0) + x * Math.sin(angle) + y * Math.cos(angle)).toFixed(3)),
    z: Number(point.z.toFixed(3)),
  };
}

export function transformLocalPoint(origin, angleDegrees, localPoint) {
  const rotated = rotateXZ(localPoint, angleDegrees);
  return {
    x: Number((origin.x + rotated.x).toFixed(3)),
    y: Number(((origin.y || 0) + (rotated.y || 0)).toFixed(3)),
    z: Number((origin.z + rotated.z).toFixed(3)),
  };
}

export function absoluteAnglesForState(rawState) {
  const state = clampState(rawState);
  return absoluteAnglesForRawState(state);
}

function absoluteAnglesForRawState(state) {
  const arm1 = state.arm1;
  const arm2 = state.arm1 - state.arm2;
  const arm3 = state.arm1 - state.arm2 - state.arm3;
  const tool = arm3 - state.offset;
  return { arm1, arm2, arm3, tool };
}

function calibrationFrames() {
  const angles = absoluteAnglesForRawState(CALIBRATION_STATE);
  return {
    arm1: { origin: JOINTS.baseArm1, angle: angles.arm1 },
    arm2: { origin: JOINTS.arm1Arm2, angle: angles.arm2 },
    arm3: { origin: JOINTS.arm2Arm3, angle: angles.arm3 },
    tool: { origin: JOINTS.arm3Tool, angle: angles.tool },
  };
}

export function localFromWorldAtCalibration(worldPoint, segmentKey) {
  const frame = calibrationFrames()[segmentKey];
  const relative = {
    x: worldPoint.x - frame.origin.x,
    y: (worldPoint.y || 0) - (frame.origin.y || 0),
    z: worldPoint.z - frame.origin.z,
  };
  return transformLocalPoint({ x: 0, y: 0, z: 0 }, -frame.angle, relative);
}

function frameForPose(pose, segmentKey) {
  return {
    arm1: { origin: pose.joints[0], angle: pose.absoluteAngles.arm1 },
    arm2: { origin: pose.joints[1], angle: pose.absoluteAngles.arm2 },
    arm3: { origin: pose.joints[2], angle: pose.absoluteAngles.arm3 },
    tool: { origin: pose.joints[3], angle: pose.absoluteAngles.tool },
  }[segmentKey];
}

function pointOnPoseSegment(pose, worldAtCalibration, segmentKey, sideOffset = 0) {
  const frame = frameForPose(pose, segmentKey);
  const local = localFromWorldAtCalibration(worldAtCalibration, segmentKey);
  return transformLocalPoint(frame.origin, frame.angle, { ...local, y: sideOffset });
}

function withSide(point, sideOffset) {
  return { ...point, y: sideOffset };
}

function pointKey(point) {
  return {
    x: Number(point.x.toFixed(3)),
    y: Number((point.y || 0).toFixed(3)),
    z: Number(point.z.toFixed(3)),
  };
}

function solveFixedLinkCommon(anchor1, length1, anchor2, length2, preferred) {
  const dx = anchor2.x - anchor1.x;
  const dz = anchor2.z - anchor1.z;
  const distanceXZ = Math.hypot(dx, dz);
  if (distanceXZ < 0.001) {
    return {
      point: pointKey(preferred),
      error: Math.max(
        Math.abs(distance(preferred, anchor1) - length1),
        Math.abs(distance(preferred, anchor2) - length2)
      ),
    };
  }

  const ux = dx / distanceXZ;
  const uz = dz / distanceXZ;
  const along = (length1 * length1 - length2 * length2 + distanceXZ * distanceXZ) / (2 * distanceXZ);
  const heightSquared = length1 * length1 - along * along;
  const height = Math.sqrt(Math.max(0, heightSquared));
  const base = {
    x: anchor1.x + ux * along,
    y: preferred.y || 0,
    z: anchor1.z + uz * along,
  };
  const candidates = [
    { x: base.x - uz * height, y: base.y, z: base.z + ux * height },
    { x: base.x + uz * height, y: base.y, z: base.z - ux * height },
  ];
  const point = candidates.reduce((best, candidate) =>
    distance(candidate, preferred) < distance(best, preferred) ? candidate : best
  );
  const error = Math.max(
    Math.abs(distance(point, anchor1) - length1),
    Math.abs(distance(point, anchor2) - length2)
  );
  return { point: pointKey(point), error: Number(error.toFixed(3)) };
}

function makeActuatorInstances(group, center) {
  return group.sides.map((side) => ({
    side,
    tail: withSide(center.tail, side),
    front: withSide(center.front, side),
    length: distance(withSide(center.tail, side), withSide(center.front, side)),
  }));
}

function actuatorStrokeForLength(groupKey, length) {
  const limits = ACTUATOR_STROKE_LIMITS[groupKey];
  if (!limits) return { stroke: 0, violation: 0, withinStroke: true };
  const stroke = (length - limits.minLength) / limits.strokeLength;
  const under = Math.max(0, limits.minLength - length);
  const over = Math.max(0, length - limits.maxLength);
  return {
    minLength: limits.minLength,
    maxLength: limits.maxLength,
    strokeLength: limits.strokeLength,
    stroke: clamp(stroke, 0, 1),
    rawStroke: stroke,
    violation: under + over,
    withinStroke: under + over <= 0.25,
  };
}

function annotateActuatorGroup(groupKey, group, center) {
  const instances = makeActuatorInstances(group, center);
  const length = instances[0]?.length || 0;
  return {
    ...group,
    center,
    instances,
    ...actuatorStrokeForLength(groupKey, length),
  };
}

function computeActuators(pose, linkages = null) {
  const arm1Center = {
    tail: ACTUATOR_GROUPS.arm1.tail,
    front: pointOnPoseSegment(pose, ACTUATOR_GROUPS.arm1.frontWorldAtCalibration, "arm1"),
  };
  const arm2Center = {
    tail: pointOnPoseSegment(pose, ACTUATOR_GROUPS.arm2.tailWorldAtCalibration, "arm1"),
    front: linkages?.A?.center?.common || pointOnPoseSegment(pose, ACTUATOR_GROUPS.arm2.frontWorldAtCalibration, "arm2"),
  };
  const arm3Center = {
    tail: pointOnPoseSegment(pose, ACTUATOR_GROUPS.arm3.tailWorldAtCalibration, "arm2"),
    front: linkages?.B?.center?.common || pointOnPoseSegment(pose, ACTUATOR_GROUPS.arm3.frontWorldAtCalibration, "arm3"),
  };

  return {
    arm1: annotateActuatorGroup("arm1", ACTUATOR_GROUPS.arm1, arm1Center),
    arm2: annotateActuatorGroup("arm2", ACTUATOR_GROUPS.arm2, arm2Center),
    arm3: annotateActuatorGroup("arm3", ACTUATOR_GROUPS.arm3, arm3Center),
  };
}

function makeLinkageInstances(group, center) {
  if (group.link1Sides || group.link2Sides) {
    const bySide = new Map();
    const ensureSide = (side) => {
      if (!bySide.has(side)) {
        bySide.set(side, {
          side,
          common: withSide(center.common, side),
          link1Anchor: withSide(center.link1Anchor, side),
          link2Anchor: withSide(center.link2Anchor, side),
          link1Length: group.link1.length,
          link2Length: group.link2.length,
          link1ActualLength: distance(withSide(center.common, side), withSide(center.link1Anchor, side)),
          link2ActualLength: distance(withSide(center.common, side), withSide(center.link2Anchor, side)),
          drawLink1: false,
          drawLink2: false,
          solveError: center.solveError,
        });
      }
      return bySide.get(side);
    };
    (group.link1Sides || group.sides).forEach((side) => {
      ensureSide(side).drawLink1 = true;
    });
    (group.link2Sides || group.sides).forEach((side) => {
      ensureSide(side).drawLink2 = true;
    });
    return Array.from(bySide.values());
  }
  return group.sides.map((side) => ({
    side,
    common: withSide(center.common, side),
    link1Anchor: withSide(center.link1Anchor, side),
    link2Anchor: withSide(center.link2Anchor, side),
    link1Length: group.link1.length,
    link2Length: group.link2.length,
    link1ActualLength: distance(withSide(center.common, side), withSide(center.link1Anchor, side)),
    link2ActualLength: distance(withSide(center.common, side), withSide(center.link2Anchor, side)),
    drawLink1: true,
    drawLink2: true,
    solveError: center.solveError,
  }));
}

function computeLinkage(pose, group) {
  const link1Anchor = pointOnPoseSegment(pose, group.link1.anchorWorldAtCalibration, group.link1.anchorOn);
  const link2Anchor = pointOnPoseSegment(pose, group.link2.anchorWorldAtCalibration, group.link2.anchorOn);
  const preferredCommon = pointOnPoseSegment(pose, group.commonWorldAtCalibration, group.commonOn);
  const solvedCommon = solveFixedLinkCommon(
    link1Anchor,
    group.link1.length,
    link2Anchor,
    group.link2.length,
    preferredCommon
  );
  const center = {
    common: solvedCommon.point,
    preferredCommon,
    link1Anchor,
    link2Anchor,
    solveError: solvedCommon.error,
  };
  return {
    ...group,
    center,
    instances: makeLinkageInstances(group, center),
  };
}

export function computePose(rawState, options = {}) {
  const state = options.clampLimits === false ? { ...rawState } : clampState(rawState);
  const absoluteAngles = absoluteAnglesForRawState(state);
  const joints = [
    { ...JOINTS.baseArm1 },
    transformLocalPoint(JOINTS.baseArm1, absoluteAngles.arm1, { x: ARM_LENGTHS_MM.arm1, y: 0, z: 0, name: "臂1" }),
  ];
  joints.push(transformLocalPoint(joints[1], absoluteAngles.arm2, { x: ARM_LENGTHS_MM.arm2, y: 0, z: 0, name: "臂2" }));
  joints.push(transformLocalPoint(joints[2], absoluteAngles.arm3, { x: ARM_LENGTHS_MM.arm3, y: 0, z: 0, name: "臂3" }));
  joints.forEach((joint, index) => {
    joint.name = [JOINTS.baseArm1.name, JOINTS.arm1Arm2.name, JOINTS.arm2Arm3.name, JOINTS.arm3Tool.name][index];
  });

  const toolCenter = transformLocalPoint(joints[3], absoluteAngles.tool, { x: TOOL_LENGTH_MM, y: 0, z: 0 });
  const segments = [
    { key: "arm1", name: "臂1", length: ARM_LENGTHS_MM.arm1, angle: absoluteAngles.arm1, start: joints[0], end: joints[1] },
    { key: "arm2", name: "臂2", length: ARM_LENGTHS_MM.arm2, angle: absoluteAngles.arm2, start: joints[1], end: joints[2] },
    { key: "arm3", name: "臂3", length: ARM_LENGTHS_MM.arm3, angle: absoluteAngles.arm3, start: joints[2], end: joints[3] },
    { key: "tool", name: "打印头", length: TOOL_LENGTH_MM, angle: absoluteAngles.tool, start: joints[3], end: toolCenter },
  ];

  const pose = {
    ...state,
    armLengths: ARM_LENGTHS_MM,
    totalAxisDistance: TOTAL_AXIS_DISTANCE_MM,
    toolLength: TOOL_LENGTH_MM,
    absoluteAngles,
    elbowAngle: absoluteAngles.arm1,
    wristAngle: absoluteAngles.arm2,
    toolAngle: absoluteAngles.arm3,
    couplerAngle: absoluteAngles.tool,
    totalArmAngle: absoluteAngles.arm3,
    baseAngle: state.base,
    joints,
    segments,
    axisTip: joints[3],
    toolCenter,
    tip: toolCenter,
  };
  pose.linkages = {
    A: computeLinkage(pose, LINKAGE_GROUPS.A),
    B: computeLinkage(pose, LINKAGE_GROUPS.B),
  };
  pose.actuators = computeActuators(pose, pose.linkages);
  return pose;
}

export function strokeFromAngle(mechanism, angleDegrees) {
  const angle = clamp(angleDegrees, mechanism.minAngle ?? 0, mechanism.maxAngle ?? 180);
  return angle / ((mechanism.maxAngle ?? 180) || 1);
}

export function angleFromActuatorStroke(mechanism, normalizedStroke) {
  const min = mechanism.minAngle ?? 0;
  const max = mechanism.maxAngle ?? 180;
  return min + (max - min) * clamp(normalizedStroke, 0, 1);
}

function actuatorLengthForState(state, key) {
  return computePose(state).actuators[key].instances[0].length;
}

function actuatorStrokeViolationForPose(pose) {
  return Object.values(pose.actuators).reduce((sum, actuator) => sum + (actuator.violation || 0), 0);
}

function actuatorStrokeViolationForState(state) {
  return actuatorStrokeViolationForPose(computePose(state));
}

function normalizedIkMode(mode) {
  if (mode === IK_MODES.greedyContinuity.key) return IK_MODES.greedyContinuity.key;
  if (mode === IK_MODES.balancedPosture.key) return IK_MODES.balancedPosture.key;
  if (mode === IK_MODES.posturePriority.key) return IK_MODES.posturePriority.key;
  if (mode === IK_MODES.balanced.key) return IK_MODES.balanced.key;
  if (mode === IK_MODES.improved.key) return IK_MODES.improved.key;
  if (mode === IK_MODES.phiScan.key) return IK_MODES.phiScan.key;
  if (mode === IK_MODES.active5Dls.key || mode === "active3_dls") return IK_MODES.active5Dls.key;
  return DEFAULT_FORMAL_IK_MODE;
}

function ikDeltaDeg(candidate, currentState) {
  return {
    base: angleDistance(candidate.base, currentState.base),
    arm1: angleDistance(candidate.arm1, currentState.arm1),
    arm2: angleDistance(candidate.arm2, currentState.arm2),
    arm3: angleDistance(candidate.arm3, currentState.arm3),
    offset: angleDistance(candidate.offset, currentState.offset),
  };
}

function postureSmoothnessPenalty(candidate, currentState, previousDelta = {}, params) {
  const dq = ikDeltaDeg(candidate, currentState);
  const reference = params.referenceDeg;
  const posture =
    ((candidate.base - reference.base) ** 2 +
      (candidate.arm1 - reference.arm1) ** 2 +
      (candidate.arm2 - reference.arm2) ** 2 +
      (candidate.arm3 - reference.arm3) ** 2 +
      (candidate.offset - reference.offset) ** 2) *
    params.postureGamma *
    0.01;
  const smoothness =
    ((dq.base - (previousDelta.base || 0)) ** 2 +
      (dq.arm1 - (previousDelta.arm1 || 0)) ** 2 +
      (dq.arm2 - (previousDelta.arm2 || 0)) ** 2 +
      (dq.arm3 - (previousDelta.arm3 || 0)) ** 2 +
      (dq.offset - (previousDelta.offset || 0)) ** 2) *
    params.smoothnessMu *
    0.01;
  return { posture, smoothness };
}

function ikContinuityPenalty(state, currentState) {
  return (
    Math.abs(angleDistance(state.base, currentState.base)) * IK_CONTINUITY_WEIGHTS.base +
    Math.abs(angleDistance(state.arm1, currentState.arm1)) * IK_CONTINUITY_WEIGHTS.arm1 +
    Math.abs(angleDistance(state.arm2, currentState.arm2)) * IK_CONTINUITY_WEIGHTS.arm2 +
    Math.abs(angleDistance(state.arm3, currentState.arm3)) * IK_CONTINUITY_WEIGHTS.arm3 +
    Math.abs(angleDistance(state.offset, currentState.offset)) * IK_CONTINUITY_WEIGHTS.offset
  );
}

function ikModeParams(ikMode) {
  if (ikMode === IK_MODES.balanced.key) return BALANCED_IK_PARAMS;
  if (ikMode === IK_MODES.improved.key) return IMPROVED_IK_PARAMS;
  return null;
}

function ikScoreFromDistance(distance, state, currentState, previousDelta, ikMode) {
  const actuatorPenalty = actuatorStrokeViolationForState(state) * 1000;
  const continuity = ikContinuityPenalty(state, currentState);
  const params = ikModeParams(ikMode);
  if (!params) return distance + continuity + actuatorPenalty;
  const penalty = postureSmoothnessPenalty(state, currentState, previousDelta, params);
  return distance + continuity * params.continuityScale + penalty.posture + penalty.smoothness + actuatorPenalty;
}

function squaredSum(values) {
  return values.reduce((sum, value) => sum + value * value, 0);
}

function ikStepMetrics(state, currentState, previousDelta = {}) {
  const dq = ikDeltaDeg(state, currentState);
  const ddq = {};
  for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
    ddq[key] = Math.abs((dq[key] || 0) - (previousDelta[key] || 0));
  }
  return {
    mean_abs_ddq_per_joint: { ...ddq },
    max_abs_ddq_per_joint: { ...ddq },
    posture_deviation_deg: Math.sqrt(squaredSum([
      state.base - IK_REFERENCE_DEG.base,
      state.arm1 - IK_REFERENCE_DEG.arm1,
      state.arm2 - IK_REFERENCE_DEG.arm2,
      state.arm3 - IK_REFERENCE_DEG.arm3,
      state.offset - IK_REFERENCE_DEG.offset,
    ])),
    dq_prev_deviation_deg: Math.sqrt(squaredSum(Object.values(ddq))),
  };
}

export function applyIkRateLimit(candidate, currentState) {
  const unclamped = clampState(candidate);
  const current = clampState(currentState);
  const delta = ikDeltaDeg(unclamped, current);
  let scale = 1;
  for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
    const absDelta = Math.abs(delta[key] || 0);
    const limit = IK_DQ_LIMIT_DEG[key];
    if (absDelta > limit) scale = Math.min(scale, limit / absDelta);
  }
  if (scale >= 1) return { state: unclamped, delta, rateLimitScale: 1, rateLimited: false };
  const limited = clampState({
    base: wrapDegrees(current.base + delta.base * scale),
    arm1: current.arm1 + delta.arm1 * scale,
    arm2: current.arm2 + delta.arm2 * scale,
    arm3: current.arm3 + delta.arm3 * scale,
    offset: current.offset + delta.offset * scale,
  });
  return {
    state: limited,
    delta: ikDeltaDeg(limited, current),
    rateLimitScale: scale,
    rateLimited: true,
  };
}

function applyIkAccelerationLimit(candidate, currentState, previousDelta = {}, ddqLimitDeg = {}) {
  const clamped = clampState(candidate);
  const current = clampState(currentState);
  const rawDelta = ikDeltaDeg(clamped, current);
  const limitedDelta = {};
  for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
    const previous = previousDelta[key] || 0;
    const limit = ddqLimitDeg[key] ?? Infinity;
    limitedDelta[key] = clamp(rawDelta[key], previous - limit, previous + limit);
  }
  const state = clampState({
    base: wrapDegrees(current.base + limitedDelta.base),
    arm1: current.arm1 + limitedDelta.arm1,
    arm2: current.arm2 + limitedDelta.arm2,
    arm3: current.arm3 + limitedDelta.arm3,
    offset: current.offset + limitedDelta.offset,
  });
  return { state, delta: ikDeltaDeg(state, current) };
}

function finalizeIkSolution(candidate, currentState, target, score, ikMode, bestScore, previousDelta = {}, options = {}) {
  const shouldRateLimit = options.rateLimit !== false;
  const limited = shouldRateLimit
    ? applyIkRateLimit(candidate, currentState)
    : { state: clampState(candidate), delta: ikDeltaDeg(clampState(candidate), clampState(currentState)), rateLimitScale: 1, rateLimited: false };
  const pose = computePose(limited.state);
  const finalScore = score(limited.state);
  const metrics = ikStepMetrics(limited.state, currentState, previousDelta);
  return {
    state: limited.state,
    pose,
    target,
    error: finalScore,
    rawError: score(candidate),
    ikMode,
    delta: limited.delta,
    rateLimited: limited.rateLimited,
    rateLimitScale: limited.rateLimitScale,
    metrics,
    actuatorViolation: actuatorStrokeViolationForPose(pose),
    reachable: bestScore < 35 && finalScore < 35,
  };
}

function verticalToolOffsetForState(state) {
  return clamp(state.arm1 - state.arm2 - state.arm3 + 90, LIMITS.offset.min, LIMITS.offset.max);
}

function withVerticalTool(state) {
  const clamped = clampState(state);
  return clampState({ ...clamped, offset: verticalToolOffsetForState(clamped) });
}

function planarTipRelativeForState(state) {
  const tip = computePose(withVerticalTool(state)).toolCenter;
  return { x: tip.x - JOINTS.baseArm1.x, z: tip.z - JOINTS.baseArm1.z };
}

function planarTargetForBase(targetWorld, base, displayOffset = {}) {
  const localDisplayTarget = rotateXYAround(targetWorld, base);
  return {
    x: localDisplayTarget.x - (displayOffset.x || 0) - JOINTS.baseArm1.x,
    z: localDisplayTarget.z - (displayOffset.z || 0) - JOINTS.baseArm1.z,
    lateralError: Math.abs((localDisplayTarget.y || 0) - (displayOffset.y || 0)),
  };
}

function candidateBaseAngles(currentBase, targetWorld, displayOffset = {}) {
  const candidates = new Set();
  const add = (value) => candidates.add(Number(wrapDegrees(value).toFixed(6)));
  const localSpan = PHI_SCAN_IK_PARAMS.baseLocalSpanDeg;
  const localStep = PHI_SCAN_IK_PARAMS.baseLocalStepDeg;
  const analyticSpan = PHI_SCAN_IK_PARAMS.baseAnalyticSpanDeg;
  const analyticStep = PHI_SCAN_IK_PARAMS.baseAnalyticStepDeg;
  for (let step = -localSpan; step <= localSpan + 0.0001; step += localStep) add(currentBase + step);

  const pivot = BASE_LINK_PIVOT_MM;
  const x = targetWorld.x - pivot.x;
  const y = (targetWorld.y || 0) - (pivot.y || 0);
  const desiredY = (displayOffset.y || 0) - (pivot.y || 0);
  const radius = Math.hypot(x, y);
  if (radius > 0.001 && Math.abs(desiredY) <= radius) {
    const alpha = Math.atan2(y, x);
    const baseSolutions = [
      Math.asin(desiredY / radius) - alpha,
      Math.PI - Math.asin(desiredY / radius) - alpha,
    ];
    for (const solution of baseSolutions) {
      const baseDeg = solution * 180 / Math.PI;
      for (let step = -analyticSpan; step <= analyticSpan + 0.0001; step += analyticStep) {
        add(baseDeg + step);
      }
    }
  }
  add(currentBase);
  return Array.from(candidates);
}

function planarTipDistance(state, planarTarget) {
  const tip = planarTipRelativeForState(state);
  return Math.hypot(tip.x - planarTarget.x, tip.z - planarTarget.z);
}

function jointBrakingPenalty(state, delta, ddqLimitDeg = {}) {
  let penalty = 0;
  for (const key of ["base", "arm1", "arm2", "arm3", "offset"]) {
    const velocity = delta[key] || 0;
    const accel = Math.max(ddqLimitDeg[key] || 0, 1e-9);
    if (velocity < 0) {
      const distanceToLimit = state[key] - LIMITS[key].min;
      penalty += Math.max(0, (velocity * velocity) / (2 * accel) - distanceToLimit);
    } else if (velocity > 0) {
      const distanceToLimit = LIMITS[key].max - state[key];
      penalty += Math.max(0, (velocity * velocity) / (2 * accel) - distanceToLimit);
    }
  }
  return penalty;
}

function generatePhiScanCandidates(planarTarget, currentState, base) {
  const l1 = ARM_LENGTHS_MM.arm1;
  const l2 = ARM_LENGTHS_MM.arm2;
  const l3 = ARM_LENGTHS_MM.arm3;
  const p3 = { x: planarTarget.x, z: planarTarget.z + TOOL_LENGTH_MM };
  const candidates = [];
  const phiCandidates = new Set();
  const addPhi = (value) => {
    const clamped = clamp(value, PHI_SCAN_IK_PARAMS.phiMinDeg, PHI_SCAN_IK_PARAMS.phiMaxDeg);
    phiCandidates.add(Number(clamped.toFixed(6)));
  };
  const currentPhi = currentState.arm1 - currentState.arm2 - currentState.arm3;
  const refPhi =
    PHI_SCAN_IK_PARAMS.qRefRelativeDeg.arm1 +
    PHI_SCAN_IK_PARAMS.qRefRelativeDeg.arm2 +
    PHI_SCAN_IK_PARAMS.qRefRelativeDeg.arm3;
  for (let phiDeg = PHI_SCAN_IK_PARAMS.phiMinDeg; phiDeg <= PHI_SCAN_IK_PARAMS.phiMaxDeg + 0.0001; phiDeg += PHI_SCAN_IK_PARAMS.phiStepDeg) {
    addPhi(phiDeg);
  }
  for (
    let phiDeg = currentPhi - PHI_SCAN_IK_PARAMS.phiLocalSpanDeg;
    phiDeg <= currentPhi + PHI_SCAN_IK_PARAMS.phiLocalSpanDeg + 0.0001;
    phiDeg += PHI_SCAN_IK_PARAMS.phiLocalStepDeg
  ) {
    addPhi(phiDeg);
  }
  for (
    let phiDeg = refPhi - PHI_SCAN_IK_PARAMS.phiLocalSpanDeg;
    phiDeg <= refPhi + PHI_SCAN_IK_PARAMS.phiLocalSpanDeg + 0.0001;
    phiDeg += PHI_SCAN_IK_PARAMS.phiLocalStepDeg
  ) {
    addPhi(phiDeg);
  }

  for (const phiDeg of phiCandidates) {
    const phi = degToRad(phiDeg);
    const p2 = {
      x: p3.x - l3 * Math.cos(phi),
      z: p3.z - l3 * Math.sin(phi),
    };
    const d = (p2.x * p2.x + p2.z * p2.z - l1 * l1 - l2 * l2) / (2 * l1 * l2);
    if (Math.abs(d) > 1) continue;
    const root = Math.sqrt(Math.max(0, 1 - d * d));
    for (const sign of [-1, 1]) {
      const beta = Math.atan2(sign * root, d);
      const absArm1 = Math.atan2(p2.z, p2.x) - Math.atan2(l2 * Math.sin(beta), l1 + l2 * Math.cos(beta));
      const absArm2 = absArm1 + beta;
      const absArm3 = phi;
      const candidate = withVerticalTool({
        ...currentState,
        base,
        arm1: absArm1 * 180 / Math.PI,
        arm2: (absArm1 - absArm2) * 180 / Math.PI,
        arm3: (absArm2 - absArm3) * 180 / Math.PI,
      });
      if (
        candidate.arm1 < LIMITS.arm1.min ||
        candidate.arm1 > LIMITS.arm1.max ||
        candidate.arm2 < LIMITS.arm2.min ||
        candidate.arm2 > LIMITS.arm2.max ||
        candidate.arm3 < LIMITS.arm3.min ||
        candidate.arm3 > LIMITS.arm3.max
      ) {
        continue;
      }
      candidates.push(candidate);
    }
  }
  return candidates;
}

function solvePhiScanIk(targetWorld, currentState, displayOffset, score, previousDelta = {}) {
  const current = clampState(currentState);
  let bestCandidate = null;
  let bestScore = Infinity;
  const currentRelative = { arm1: current.arm1, arm2: -current.arm2, arm3: -current.arm3 };
  for (const base of candidateBaseAngles(current.base, targetWorld, displayOffset)) {
    const planarTarget = planarTargetForBase(targetWorld, base, displayOffset);
    const candidates = generatePhiScanCandidates(planarTarget, current, base);
    for (const rawCandidate of candidates) {
      const relative = { arm1: rawCandidate.arm1, arm2: -rawCandidate.arm2, arm3: -rawCandidate.arm3 };
      const rawTipError = planarTipDistance(rawCandidate, planarTarget);
      const rateLimited = applyIkRateLimit(rawCandidate, current);
      const accelerated = applyIkAccelerationLimit(rateLimited.state, current, previousDelta, PHI_SCAN_IK_PARAMS.ddqLimitDeg);
      const limitedTipError = planarTipDistance(accelerated.state, planarTarget);
      const limitedRelative = {
        arm1: accelerated.state.arm1,
        arm2: -accelerated.state.arm2,
        arm3: -accelerated.state.arm3,
      };
      const gap = ikDeltaDeg(rawCandidate, accelerated.state);
      const delta = ikDeltaDeg(accelerated.state, current);
      const movement =
        (relative.arm1 - currentRelative.arm1) ** 2 +
        (relative.arm2 - currentRelative.arm2) ** 2 +
        (relative.arm3 - currentRelative.arm3) ** 2;
      const smoothness =
        (delta.base - (previousDelta.base || 0)) ** 2 +
        (delta.arm1 - (previousDelta.arm1 || 0)) ** 2 +
        (delta.arm2 - (previousDelta.arm2 || 0)) ** 2 +
        (delta.arm3 - (previousDelta.arm3 || 0)) ** 2 +
        (delta.offset - (previousDelta.offset || 0)) ** 2;
      const posture =
        (limitedRelative.arm1 - PHI_SCAN_IK_PARAMS.qRefRelativeDeg.arm1) ** 2 +
        (limitedRelative.arm2 - PHI_SCAN_IK_PARAMS.qRefRelativeDeg.arm2) ** 2 +
        (limitedRelative.arm3 - PHI_SCAN_IK_PARAMS.qRefRelativeDeg.arm3) ** 2;
      const unreachable = gap.arm1 ** 2 + gap.arm2 ** 2 + gap.arm3 ** 2;
      const candidateScore =
        limitedTipError +
        planarTarget.lateralError +
        0.2 * rawTipError +
        PHI_SCAN_IK_PARAMS.wMove * movement +
        PHI_SCAN_IK_PARAMS.wSmooth * smoothness +
        PHI_SCAN_IK_PARAMS.wPosture * posture +
        PHI_SCAN_IK_PARAMS.wUnreachable * unreachable +
        PHI_SCAN_IK_PARAMS.wBrake * jointBrakingPenalty(accelerated.state, delta, PHI_SCAN_IK_PARAMS.ddqLimitDeg) +
        actuatorStrokeViolationForState(accelerated.state) * 1000;
      if (candidateScore < bestScore) {
        bestScore = candidateScore;
        bestCandidate = rawCandidate;
      }
    }
  }
  if (!bestCandidate) return null;
  const rateLimited = applyIkRateLimit(bestCandidate, current);
  return applyIkAccelerationLimit(rateLimited.state, current, previousDelta, PHI_SCAN_IK_PARAMS.ddqLimitDeg).state;
}

function isFormalPhiIkMode(ikMode) {
  return FORMAL_IK_MODE_KEYS.includes(ikMode);
}

function formalPlanarKeys() {
  return ["arm1", "arm2", "arm3", "offset"];
}

function formalCandidateLimits() {
  return Object.fromEntries(["base", ...formalPlanarKeys()].map((key) => [key, {
    min: LIMITS[key].min,
    max: LIMITS[key].max,
  }]));
}

function formalMinimumNormalizedMargin(state, limits) {
  return Math.min(...formalPlanarKeys().map((key) => {
    const limit = limits[key];
    const range = Math.max(limit.max - limit.min, 1e-9);
    return Math.min(state[key] - limit.min, limit.max - state[key]) / range;
  }));
}

function formalBaseCandidatesForTarget(targetWorld, displayOffset = {}) {
  const pivot = BASE_LINK_PIVOT_MM;
  const dx = Number(targetWorld.x) - pivot.x;
  const dy = Number(targetWorld.y || 0) - (pivot.y || 0);
  const desiredLocalY = Number(displayOffset.y || 0);
  const radius = Math.hypot(dx, dy);
  if (radius < 0.001 || Math.abs(desiredLocalY - (pivot.y || 0)) > radius + 1e-9) return [];
  const alpha = Math.atan2(dy, dx);
  const asinValue = Math.asin(clamp((desiredLocalY - (pivot.y || 0)) / radius, -1, 1));
  return [
    wrapDegrees((asinValue - alpha) * 180 / Math.PI),
    wrapDegrees((Math.PI - asinValue - alpha) * 180 / Math.PI),
  ].filter((value, index, values) =>
    value >= LIMITS.base.min - 1e-8 &&
    value <= LIMITS.base.max + 1e-8 &&
    values.findIndex((candidate) => Math.abs(angleDistance(candidate, value)) < 1e-6) === index
  );
}

function formalLocalTargetForBase(targetWorld, baseDeg, displayOffset = {}) {
  const localDisplayTarget = rotateXYAround(targetWorld, baseDeg);
  return {
    x: localDisplayTarget.x - (displayOffset.x || 0),
    y: localDisplayTarget.y - (displayOffset.y || 0),
    z: localDisplayTarget.z - (displayOffset.z || 0),
    lateralResidualMm: Math.abs((localDisplayTarget.y || 0) - (displayOffset.y || 0)),
  };
}

function formalAnalyticCandidateAtPhi(localTarget, baseDeg, phiDeg, elbowSign, limits) {
  const phi = degToRad(phiDeg);
  const axisTip = {
    x: localTarget.x - JOINTS.baseArm1.x,
    z: localTarget.z - JOINTS.baseArm1.z + TOOL_LENGTH_MM,
  };
  const arm2Tip = {
    x: axisTip.x - ARM_LENGTHS_MM.arm3 * Math.cos(phi),
    z: axisTip.z - ARM_LENGTHS_MM.arm3 * Math.sin(phi),
  };
  const cosine = (
    arm2Tip.x ** 2 + arm2Tip.z ** 2 - ARM_LENGTHS_MM.arm1 ** 2 - ARM_LENGTHS_MM.arm2 ** 2
  ) / (2 * ARM_LENGTHS_MM.arm1 * ARM_LENGTHS_MM.arm2);
  if (Math.abs(cosine) > 1 + 1e-10) return null;
  const root = Math.sqrt(Math.max(0, 1 - clamp(cosine, -1, 1) ** 2));
  const beta = Math.atan2(elbowSign * root, clamp(cosine, -1, 1));
  const absoluteArm1 = Math.atan2(arm2Tip.z, arm2Tip.x)
    - Math.atan2(ARM_LENGTHS_MM.arm2 * Math.sin(beta), ARM_LENGTHS_MM.arm1 + ARM_LENGTHS_MM.arm2 * Math.cos(beta));
  const absoluteArm2 = absoluteArm1 + beta;
  const state = {
    base: baseDeg,
    arm1: absoluteArm1 * 180 / Math.PI,
    arm2: (absoluteArm1 - absoluteArm2) * 180 / Math.PI,
    arm3: (absoluteArm2 - phi) * 180 / Math.PI,
    offset: phiDeg - FORMAL_PHI_IK_PARAMS.targetToolAbsoluteAngleDeg,
  };
  for (const key of ["base", ...formalPlanarKeys()]) {
    const limit = limits[key];
    if (state[key] < limit.min - 1e-8 || state[key] > limit.max + 1e-8) return null;
  }
  return {
    state,
    phiDeg,
    elbowSign,
    minimumNormalizedMargin: formalMinimumNormalizedMargin(state, limits),
  };
}

function formalFixedLinkCandidates(anchor1, length1, anchor2, length2, preferred) {
  const dx = anchor2.x - anchor1.x;
  const dz = anchor2.z - anchor1.z;
  const distanceXZ = Math.hypot(dx, dz);
  if (distanceXZ < 0.001) return [];
  const ux = dx / distanceXZ;
  const uz = dz / distanceXZ;
  const along = (length1 ** 2 - length2 ** 2 + distanceXZ ** 2) / (2 * distanceXZ);
  const heightSquared = length1 ** 2 - along ** 2;
  if (heightSquared < -1e-6) return [];
  const height = Math.sqrt(Math.max(0, heightSquared));
  const base = {
    x: anchor1.x + ux * along,
    y: preferred.y || 0,
    z: anchor1.z + uz * along,
  };
  return [
    { x: base.x - uz * height, y: base.y, z: base.z + ux * height },
    { x: base.x + uz * height, y: base.y, z: base.z - ux * height },
  ];
}

function formalLinkageBranchIndexForPose(pose, group) {
  const link1Anchor = pointOnPoseSegment(pose, group.link1.anchorWorldAtCalibration, group.link1.anchorOn);
  const link2Anchor = pointOnPoseSegment(pose, group.link2.anchorWorldAtCalibration, group.link2.anchorOn);
  const preferred = pointOnPoseSegment(pose, group.commonWorldAtCalibration, group.commonOn);
  const candidates = formalFixedLinkCandidates(link1Anchor, group.link1.length, link2Anchor, group.link2.length, preferred);
  if (candidates.length < 2) return { ok: false, index: -1, error: "linkage_unreachable" };
  const index = distance(candidates[0], preferred) <= distance(candidates[1], preferred) ? 0 : 1;
  return { ok: true, index };
}

const FORMAL_CALIBRATION_BRANCH_INDEX = (() => {
  const pose = computePose(CALIBRATION_STATE, { clampLimits: false });
  return {
    A: formalLinkageBranchIndexForPose(pose, LINKAGE_GROUPS.A).index,
    B: formalLinkageBranchIndexForPose(pose, LINKAGE_GROUPS.B).index,
  };
})();

function formalCandidateSample(candidate, targetWorld, displayOffset = {}) {
  const state = clampState(candidate.state);
  const pose = computePose(state);
  if (actuatorStrokeViolationForPose(pose) > FORMAL_PHI_IK_PARAMS.actuatorToleranceMm) {
    return { valid: false, error: "actuator_stroke_outside_strict_limit" };
  }
  if (Math.max(pose.linkages.A.center.solveError || 0, pose.linkages.B.center.solveError || 0) > FORMAL_PHI_IK_PARAMS.linkageToleranceMm) {
    return { valid: false, error: "linkage_closure_error" };
  }
  const branchA = formalLinkageBranchIndexForPose(pose, LINKAGE_GROUPS.A);
  const branchB = formalLinkageBranchIndexForPose(pose, LINKAGE_GROUPS.B);
  if (!branchA.ok || !branchB.ok || branchA.index !== FORMAL_CALIBRATION_BRANCH_INDEX.A || branchB.index !== FORMAL_CALIBRATION_BRANCH_INDEX.B) {
    return { valid: false, error: "wrong_linkage_branch" };
  }
  const actualTcp = worldDisplayedToolPointForState(state, displayOffset);
  const residualMm = distance(actualTcp, targetWorld);
  const toolVerticalErrorDeg = angleDistance(FORMAL_PHI_IK_PARAMS.targetToolAbsoluteAngleDeg, active5ToolAngleDeg(state));
  return {
    valid: true,
    state,
    pose,
    actualTcp,
    residualMm,
    toolVerticalErrorDeg,
    phiDeg: candidate.phiDeg,
    elbowSign: candidate.elbowSign,
    minimumNormalizedMargin: candidate.minimumNormalizedMargin,
    actuatorViolation: actuatorStrokeViolationForPose(pose),
  };
}

function formalCandidateScore(candidate, previous, previousPrevious, ikMode, limits, initial = false) {
  const reference = FORMAL_PHI_IK_PARAMS.referenceDeg;
  if (initial || !previous) {
    const referenceCost = formalPlanarKeys().reduce((sum, key) => {
      const limit = limits[key];
      const range = Math.max(limit.max - limit.min, 1e-9);
      return sum + ((candidate.state[key] - reference[key]) / range) ** 2;
    }, 0);
    return -candidate.minimumNormalizedMargin + referenceCost * 0.005;
  }
  let movement = 0;
  let smoothness = 0;
  let posture = 0;
  let barrier = 0;
  for (const key of formalPlanarKeys()) {
    const limit = limits[key];
    const range = Math.max(limit.max - limit.min, 1e-9);
    const predicted = previousPrevious
      ? previous[key] + (previous[key] - previousPrevious[key])
      : previous[key];
    movement += ((candidate.state[key] - predicted) / range) ** 2;
    if (previousPrevious) {
      smoothness += ((candidate.state[key] - 2 * previous[key] + previousPrevious[key]) / range) ** 2;
    }
    const normalizedMargin = Math.max(
      Math.min(candidate.state[key] - limit.min, limit.max - candidate.state[key]) / range,
      1e-8,
    );
    barrier += 1 / (normalizedMargin + 0.01) ** 2;
    posture += ((candidate.state[key] - reference[key]) / range) ** 2;
  }
  const weights = FORMAL_PHI_IK_PARAMS.weights[ikMode] || FORMAL_PHI_IK_PARAMS.weights.greedy_continuity;
  return (
    movement * weights.movement +
    smoothness * weights.smoothness +
    posture * weights.posture +
    barrier * FORMAL_PHI_IK_PARAMS.barrierWeight
  );
}

function formalRefineCandidate(localTarget, baseDeg, selected, previous, previousPrevious, ikMode, limits, initial) {
  let best = selected;
  let bestScore = formalCandidateScore(best, previous, previousPrevious, ikMode, limits, initial);
  let halfWidth = Math.max(FORMAL_PHI_IK_PARAMS.candidatePhiStepDeg, 0.02);
  for (let iteration = 0; iteration < FORMAL_PHI_IK_PARAMS.refinementIterations; iteration += 1) {
    for (const phiDeg of [best.phiDeg - halfWidth / 2, best.phiDeg + halfWidth / 2]) {
      const candidate = formalAnalyticCandidateAtPhi(localTarget, baseDeg, phiDeg, best.elbowSign, limits);
      if (!candidate) continue;
      const score = formalCandidateScore(candidate, previous, previousPrevious, ikMode, limits, initial);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    halfWidth /= 2;
  }
  return best;
}

function formalCandidatesForLocalTarget(localTarget, baseDeg, limits, phiStepDeg) {
  const phiMinimum = limits.offset.min + FORMAL_PHI_IK_PARAMS.targetToolAbsoluteAngleDeg;
  const phiMaximum = limits.offset.max + FORMAL_PHI_IK_PARAMS.targetToolAbsoluteAngleDeg;
  const step = Math.max(0.001, Number(phiStepDeg));
  const count = Math.max(1, Math.ceil((phiMaximum - phiMinimum) / step));
  const candidates = [];
  for (let index = 0; index <= count; index += 1) {
    const phiDeg = index === count ? phiMaximum : phiMinimum + index * step;
    for (const elbowSign of [-1, 1]) {
      const candidate = formalAnalyticCandidateAtPhi(localTarget, baseDeg, phiDeg, elbowSign, limits);
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates;
}

function formalSelectCandidate(targetWorld, displayOffset, ikMode, currentState, previousState, previousPreviousState, initial = false) {
  const limits = formalCandidateLimits();
  let bestSample = null;
  let bestScore = Infinity;
  for (const baseDeg of formalBaseCandidatesForTarget(targetWorld, displayOffset)) {
    const localTarget = formalLocalTargetForBase(targetWorld, baseDeg, displayOffset);
    if (localTarget.lateralResidualMm > 0.01) continue;
    let candidates = formalCandidatesForLocalTarget(localTarget, baseDeg, limits, FORMAL_PHI_IK_PARAMS.candidatePhiStepDeg);
    if (!candidates.length) {
      candidates = formalCandidatesForLocalTarget(localTarget, baseDeg, limits, FORMAL_PHI_IK_PARAMS.fallbackPhiStepDeg);
    }
    const rejected = new Set();
    for (let attempt = 0; attempt < Math.min(candidates.length, 24); attempt += 1) {
      const available = candidates.filter((candidate) => !rejected.has(candidate));
      if (!available.length) break;
      let selected = available[0];
      let selectedScore = formalCandidateScore(selected, previousState, previousPreviousState, ikMode, limits, initial);
      for (let index = 1; index < available.length; index += 1) {
        const score = formalCandidateScore(available[index], previousState, previousPreviousState, ikMode, limits, initial);
        if (score < selectedScore) {
          selected = available[index];
          selectedScore = score;
        }
      }
      selected = formalRefineCandidate(localTarget, baseDeg, selected, previousState, previousPreviousState, ikMode, limits, initial);
      const sample = formalCandidateSample(selected, targetWorld, displayOffset);
      if (sample.valid) {
        const baseTieBreak = previousState ? (angleDistance(sample.state.base, previousState.base) / 360) ** 2 * 1e-6 : 0;
        const score = formalCandidateScore(selected, previousState, previousPreviousState, ikMode, limits, initial) + baseTieBreak;
        if (score < bestScore) {
          bestScore = score;
          bestSample = { ...sample, score, localTarget };
        }
        break;
      }
      let closest = candidates[0];
      let distanceToSelected = Infinity;
      for (const candidate of candidates) {
        const difference = Math.abs(candidate.phiDeg - selected.phiDeg)
          + (candidate.elbowSign === selected.elbowSign ? 0 : 1000);
        if (difference < distanceToSelected) {
          closest = candidate;
          distanceToSelected = difference;
        }
      }
      rejected.add(closest);
    }
  }
  return bestSample;
}

function solveFormalPhiIk(targetWorld, currentState, displayOffset, ikMode, options = {}) {
  const current = clampState(currentState);
  const previousState = options.previousState ? clampState(options.previousState) : current;
  const previousPreviousState = options.previousPreviousState ? clampState(options.previousPreviousState) : null;
  const initial = !options.previousState;
  return formalSelectCandidate(targetWorld, displayOffset, ikMode, current, previousState, previousPreviousState, initial);
}

function solveLinearSystem(matrix, vector) {
  const m = matrix.map((row, index) => [...row, vector[index]]);
  const size = vector.length;
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(m[row][column]) > Math.abs(m[pivot][column])) pivot = row;
    }
    if (Math.abs(m[pivot][column]) < 1e-9) return Array(size).fill(0);
    if (pivot !== column) [m[pivot], m[column]] = [m[column], m[pivot]];
    const divisor = m[column][column];
    for (let col = column; col <= size; col += 1) m[column][col] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = m[row][column];
      for (let col = column; col <= size; col += 1) m[row][col] -= factor * m[column][col];
    }
  }
  return m.map((row) => row[size]);
}

function clipVectorNorm(vector, maxNorm) {
  const norm = Math.hypot(...vector);
  if (norm > maxNorm && maxNorm > 0) return vector.map((value) => value * maxNorm / norm);
  return vector;
}

function activeJacobian(state) {
  const angles = absoluteAnglesForState(state);
  const a1 = degToRad(angles.arm1);
  const a2 = degToRad(angles.arm2);
  const a3 = degToRad(angles.arm3);
  const l1 = ARM_LENGTHS_MM.arm1;
  const l2 = ARM_LENGTHS_MM.arm2;
  const l3 = ARM_LENGTHS_MM.arm3;
  return [
    [-l1 * Math.sin(a1) - l2 * Math.sin(a2) - l3 * Math.sin(a3), l2 * Math.sin(a2) + l3 * Math.sin(a3), l3 * Math.sin(a3)],
    [l1 * Math.cos(a1) + l2 * Math.cos(a2) + l3 * Math.cos(a3), -l2 * Math.cos(a2) - l3 * Math.cos(a3), -l3 * Math.cos(a3)],
  ];
}

function active5LocalDisplayTip(state, displayOffset = {}) {
  const pose = computePose(state);
  return {
    x: pose.axisTip.x + (displayOffset.x || 0),
    y: pose.axisTip.y + (displayOffset.y || 0),
    z: pose.axisTip.z - TOOL_LENGTH_MM + (displayOffset.z || 0),
  };
}

function active5WorldDisplayTip(state, displayOffset = {}) {
  return rotateXYAround(active5LocalDisplayTip(state, displayOffset), -state.base);
}

function active5ToolAngleDeg(state) {
  return state.arm1 - state.arm2 - state.arm3 - state.offset;
}

function active5Jacobian(state, displayOffset = {}) {
  const localTip = active5LocalDisplayTip(state, displayOffset);
  const pivot = BASE_LINK_PIVOT_MM;
  const base = degToRad(state.base);
  const cosBase = Math.cos(base);
  const sinBase = Math.sin(base);
  const dx = localTip.x - pivot.x;
  const dy = (localTip.y || 0) - (pivot.y || 0);
  const planar = activeJacobian(state);
  const toolWeight = ACTIVE5_DLS_IK_PARAMS.toolAngleWeightMm;
  const rows = Array.from({ length: 4 }, () => Array(5).fill(0));

  rows[0][0] = -dx * sinBase + dy * cosBase;
  rows[1][0] = -dx * cosBase - dy * sinBase;
  rows[2][0] = 0;

  for (let index = 0; index < 3; index += 1) {
    const dr = planar[0][index];
    const dz = planar[1][index];
    rows[0][index + 1] = dr * cosBase;
    rows[1][index + 1] = -dr * sinBase;
    rows[2][index + 1] = dz;
  }

  rows[3][0] = 0;
  rows[3][1] = toolWeight;
  rows[3][2] = -toolWeight;
  rows[3][3] = -toolWeight;
  rows[3][4] = -toolWeight;
  return rows;
}

function solveActive5DlsIk(targetWorld, currentState, displayOffset, previousDelta = {}, options = {}) {
  const current = clampState(currentState);
  const stepScale = clamp(Number(options.stepScale ?? 1), 0.01, 1);
  const currentTip = active5WorldDisplayTip(current, displayOffset);
  const positionError = clipVectorNorm(
    [
      (targetWorld.x - currentTip.x) * ACTIVE5_DLS_IK_PARAMS.Kp,
      (targetWorld.y - currentTip.y) * ACTIVE5_DLS_IK_PARAMS.Kp,
      (targetWorld.z - currentTip.z) * ACTIVE5_DLS_IK_PARAMS.Kp,
    ],
    ACTIVE5_DLS_IK_PARAMS.maxCartStepMm,
  );
  const orientationStep = clamp(
    ACTIVE5_DLS_IK_PARAMS.Kp * degToRad(angleDistance(ACTIVE5_DLS_IK_PARAMS.targetToolAngleDeg, active5ToolAngleDeg(current))),
    -degToRad(ACTIVE5_DLS_IK_PARAMS.maxOrientationStepDeg),
    degToRad(ACTIVE5_DLS_IK_PARAMS.maxOrientationStepDeg),
  );
  const toolError = ACTIVE5_DLS_IK_PARAMS.toolAngleWeightMm * orientationStep;
  const error = [...positionError, toolError];
  const trackingError = Math.hypot(...error);
  const postureGamma = ACTIVE5_DLS_IK_PARAMS.gamma * clamp(trackingError / ACTIVE5_DLS_IK_PARAMS.maxCartStepMm, 0, 1);
  const jacobian = active5Jacobian(current, displayOffset);
  const keys = ["base", "arm1", "arm2", "arm3", "offset"];
  const weights = keys.map((key) => ACTIVE5_DLS_IK_PARAMS.WDiag[key]);
  const q = keys.map((key) => degToRad(current[key]));
  const qRef = keys.map((key) => degToRad(ACTIVE5_DLS_IK_PARAMS.qRefDeg[key]));
  const dqPrev = keys.map((key) => degToRad(previousDelta[key] || 0));
  const matrix = Array.from({ length: keys.length }, () => Array(keys.length).fill(0));
  const rhs = Array(keys.length).fill(0);
  for (let row = 0; row < keys.length; row += 1) {
    for (let col = 0; col < keys.length; col += 1) {
      matrix[row][col] =
        jacobian[0][row] * jacobian[0][col] +
        jacobian[1][row] * jacobian[1][col] +
        jacobian[2][row] * jacobian[2][col] +
        jacobian[3][row] * jacobian[3][col];
    }
    matrix[row][row] += ACTIVE5_DLS_IK_PARAMS.damping ** 2 * weights[row] ** 2 + ACTIVE5_DLS_IK_PARAMS.mu + postureGamma;
    rhs[row] =
      jacobian[0][row] * error[0] +
      jacobian[1][row] * error[1] +
      jacobian[2][row] * error[2] +
      jacobian[3][row] * error[3] +
      ACTIVE5_DLS_IK_PARAMS.mu * dqPrev[row] +
      postureGamma * (qRef[row] - q[row]);
  }
  const dqRawDeg = solveLinearSystem(matrix, rhs).map((value) => value * 180 / Math.PI);
  const dq = {};
  keys.forEach((key, index) => {
    const dqLimit = ACTIVE5_DLS_IK_PARAMS.dqLimitDeg[key] * stepScale;
    const ddqLimit = ACTIVE5_DLS_IK_PARAMS.ddqLimitDeg[key] * stepScale;
    const velocityLimited = clamp(dqRawDeg[index], -dqLimit, dqLimit);
    dq[key] = clamp(
      velocityLimited,
      (previousDelta[key] || 0) - ddqLimit,
      (previousDelta[key] || 0) + ddqLimit,
    );
  });
  return clampState({
    ...current,
    base: wrapDegrees(current.base + dq.base),
    arm1: current.arm1 + dq.arm1,
    arm2: current.arm2 + dq.arm2,
    arm3: current.arm3 + dq.arm3,
    offset: current.offset + dq.offset,
  });
}

function stateForActuatorStroke(key, normalizedStroke, currentState) {
  const limits = ACTUATOR_STROKE_LIMITS[key];
  if (!limits) return currentState;
  const targetLength = limits.minLength + limits.strokeLength * clamp(normalizedStroke, 0, 1);
  const angleLimit = LIMITS[key];
  let bestState = clampState(currentState);
  let bestScore = Infinity;
  const evaluate = (angle) => {
    const candidate = clampState({ ...currentState, [key]: angle });
    const length = actuatorLengthForState(candidate, key);
    const score = Math.abs(length - targetLength) + Math.abs(angleDistance(candidate[key], currentState[key])) * 0.001;
    if (score < bestScore) {
      bestScore = score;
      bestState = candidate;
    }
  };
  for (let angle = angleLimit.min; angle <= angleLimit.max; angle += 1) evaluate(angle);
  const start = Math.max(angleLimit.min, bestState[key] - 1.5);
  const end = Math.min(angleLimit.max, bestState[key] + 1.5);
  for (let angle = start; angle <= end; angle += 0.02) evaluate(angle);
  return bestState;
}

export function stateFromActuatorStrokes(strokes, currentState = DEFAULT_STATE) {
  let nextState = clampState(currentState);
  ["arm1", "arm2", "arm3"].forEach((key) => {
    if (strokes[key] == null) return;
    nextState = stateForActuatorStroke(key, strokes[key], nextState);
  });
  return clampState(nextState);
}

export function solveStateForToolTarget(targetWorld, currentState = DEFAULT_STATE, options = {}) {
  let candidate = clampState(currentState);
  const referenceBase = candidate.base;
  const ikMode = normalizedIkMode(options.ikMode);
  const previousDelta = options.previousDelta || {};
  const target = {
    x: Number(targetWorld.x ?? computePose(candidate).toolCenter.x),
    y: Number(targetWorld.y ?? computePose(candidate).toolCenter.y),
    z: Number(targetWorld.z ?? computePose(candidate).toolCenter.z),
  };
  // Include base rotation so direct tool dragging can solve across the full 3D workspace.
  const keys = ["arm1", "arm2", "arm3", "base"];
  let step = 16;

  const score = (state) => {
    const tip = computePose(state).toolCenter;
    const rotatedTip = rotateXYAround(tip, referenceBase - state.base);
    const distance = Math.hypot(rotatedTip.x - target.x, rotatedTip.y - target.y, rotatedTip.z - target.z);
    return ikScoreFromDistance(distance, state, currentState, previousDelta, ikMode);
  };

  let bestScore = score(candidate);
  for (let iteration = 0; iteration < 240; iteration += 1) {
    let improved = false;
    for (const key of keys) {
      for (const direction of [-1, 1]) {
        const nextValue = key === "base" ? wrapDegrees(candidate[key] + direction * step) : candidate[key] + direction * step;
        const next = clampState({ ...candidate, [key]: nextValue });
        const nextScore = score(next);
        if (nextScore + 0.001 < bestScore) {
          candidate = next;
          bestScore = nextScore;
          improved = true;
        }
      }
    }
    if (!improved) step *= 0.62;
    if (step < 0.05) break;
  }

  return finalizeIkSolution(candidate, currentState, target, score, ikMode, bestScore, previousDelta, {
    rateLimit: ikMode !== IK_MODES.original.key,
  });
}

export function solveStateForDisplayedToolTarget(targetWorld, currentState = DEFAULT_STATE, displayOffset = {}, options = {}) {
  let candidate = clampState(currentState);
  const referenceBase = candidate.base;
  const ikMode = normalizedIkMode(options.ikMode);
  const previousDelta = options.previousDelta || {};
  const target = {
    x: Number(targetWorld.x ?? offsetPoint(computePose(candidate).toolCenter, displayOffset).x),
    y: Number(targetWorld.y ?? offsetPoint(computePose(candidate).toolCenter, displayOffset).y),
    z: Number(targetWorld.z ?? offsetPoint(computePose(candidate).toolCenter, displayOffset).z),
  };
  const keys = ["arm1", "arm2", "arm3", "base"];
  let step = 16;

  const score = (state) => {
    const displayTip = offsetPoint(computePose(state).toolCenter, displayOffset);
    const rotatedTip = rotateXYAround(displayTip, referenceBase - state.base);
    const distance = Math.hypot(rotatedTip.x - target.x, rotatedTip.y - target.y, rotatedTip.z - target.z);
    return ikScoreFromDistance(distance, state, currentState, previousDelta, ikMode);
  };

  let bestScore = score(candidate);
  for (let iteration = 0; iteration < 240; iteration += 1) {
    let improved = false;
    for (const key of keys) {
      for (const direction of [-1, 1]) {
        const nextValue = key === "base" ? wrapDegrees(candidate[key] + direction * step) : candidate[key] + direction * step;
        const next = clampState({ ...candidate, [key]: nextValue });
        const nextScore = score(next);
        if (nextScore + 0.001 < bestScore) {
          candidate = next;
          bestScore = nextScore;
          improved = true;
        }
      }
    }
    if (!improved) step *= 0.62;
    if (step < 0.05) break;
  }

  return finalizeIkSolution(candidate, currentState, target, score, ikMode, bestScore, previousDelta, {
    rateLimit: ikMode !== IK_MODES.original.key,
  });
}

export function worldDisplayedToolPointForState(rawState, displayOffset = {}) {
  const state = clampState(rawState);
  const displayTip = offsetPoint(computePose(state).toolCenter, displayOffset);
  return rotateXYAround(displayTip, -state.base);
}

export function solveStateForWorldDisplayedToolTarget(targetWorld, currentState = DEFAULT_STATE, displayOffset = {}, options = {}) {
  let candidate = clampState(currentState);
  const ikMode = normalizedIkMode(options.ikMode);
  const previousDelta = options.previousDelta || {};
  const currentDisplayTip = worldDisplayedToolPointForState(candidate, displayOffset);
  const target = {
    x: Number(targetWorld.x ?? currentDisplayTip.x),
    y: Number(targetWorld.y ?? currentDisplayTip.y),
    z: Number(targetWorld.z ?? currentDisplayTip.z),
  };
  const keys = ["arm1", "arm2", "arm3", "base"];
  let step = 16;

  const score = (state) => {
    const displayTip = worldDisplayedToolPointForState(state, displayOffset);
    const distance = Math.hypot(displayTip.x - target.x, displayTip.y - target.y, displayTip.z - target.z);
    return ikScoreFromDistance(distance, state, currentState, previousDelta, ikMode);
  };

  if (isFormalPhiIkMode(ikMode)) {
    const formalSample = solveFormalPhiIk(target, candidate, displayOffset, ikMode, {
      previousState: options.previousState,
      previousPreviousState: options.previousPreviousState,
    });
    if (formalSample) {
      const delta = ikDeltaDeg(formalSample.state, currentState);
      return {
        state: formalSample.state,
        pose: formalSample.pose,
        target,
        error: formalSample.residualMm,
        rawError: formalSample.residualMm,
        ikMode,
        delta,
        rateLimited: false,
        rateLimitScale: 1,
        metrics: ikStepMetrics(formalSample.state, currentState, previousDelta),
        actuatorViolation: formalSample.actuatorViolation,
        reachable: formalSample.residualMm < 1 && Math.abs(formalSample.toolVerticalErrorDeg) < 0.001,
        formalPhi: {
          phiDeg: formalSample.phiDeg,
          elbowSign: formalSample.elbowSign,
          score: formalSample.score,
          residualMm: formalSample.residualMm,
          toolVerticalErrorDeg: formalSample.toolVerticalErrorDeg,
          minimumNormalizedMargin: formalSample.minimumNormalizedMargin,
          baseAdaptation: {
            formula: "local = rotateXYAround(targetWorld, base); choose base so local.y equals displayOffset.y, then solve local.x/local.z with analytic phi",
            localTarget: formalSample.localTarget,
          },
        },
      };
    }
    const currentResidual = distance(currentDisplayTip, target);
    return {
      state: candidate,
      pose: computePose(candidate),
      target,
      error: currentResidual,
      rawError: currentResidual,
      ikMode,
      delta: { base: 0, arm1: 0, arm2: 0, arm3: 0, offset: 0 },
      rateLimited: false,
      rateLimitScale: 1,
      metrics: ikStepMetrics(candidate, currentState, previousDelta),
      actuatorViolation: actuatorStrokeViolationForState(candidate),
      reachable: false,
      formalPhi: {
        error: "no_strict_analytic_phi_candidate",
        baseAdaptation: {
          formula: "local = rotateXYAround(targetWorld, base); choose base so local.y equals displayOffset.y, then solve local.x/local.z with analytic phi",
        },
      },
    };
  }

  if (ikMode === IK_MODES.phiScan.key) {
    const phiCandidate = solvePhiScanIk(target, candidate, displayOffset, score, previousDelta);
    if (phiCandidate) {
      return finalizeIkSolution(phiCandidate, currentState, target, score, ikMode, score(phiCandidate), previousDelta, {
        rateLimit: false,
      });
    }
  }

  if (ikMode === IK_MODES.active5Dls.key) {
    const dlsCandidate = solveActive5DlsIk(target, candidate, displayOffset, previousDelta, {
      stepScale: options.stepScale,
    });
    return finalizeIkSolution(dlsCandidate, currentState, target, score, ikMode, score(dlsCandidate), previousDelta, {
      rateLimit: false,
    });
  }

  let bestScore = score(candidate);
  for (let iteration = 0; iteration < 240; iteration += 1) {
    let improved = false;
    for (const key of keys) {
      for (const direction of [-1, 1]) {
        const nextValue = key === "base" ? wrapDegrees(candidate[key] + direction * step) : candidate[key] + direction * step;
        const next = clampState({ ...candidate, [key]: nextValue });
        const nextScore = score(next);
        if (nextScore + 0.001 < bestScore) {
          candidate = next;
          bestScore = nextScore;
          improved = true;
        }
      }
    }
    if (!improved) step *= 0.62;
    if (step < 0.05) break;
  }

  return finalizeIkSolution(candidate, currentState, target, score, ikMode, bestScore, previousDelta, {
    rateLimit: ikMode !== IK_MODES.original.key,
  });
}
