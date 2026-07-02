export const LIMITS = {
  arm1: { min: 0, max: 120, label: "臂1" },
  arm2: { min: 0, max: 180, label: "臂2" },
  arm3: { min: 0, max: 180, label: "臂3" },
  offset: { min: -270, max: 210, label: "打印头" },
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
  folded: {
    label: "折叠姿态",
    values: { arm1: 0, arm2: 180, arm3: 180, offset: 0, base: 180 },
    keepToolVertical: false,
  },
};

export const JOINTS = {
  baseArm1: { x: -450.742, y: 0, z: 385.188, name: "底座-臂1旋转轴心" },
  arm1Arm2: { x: -450.742, y: 0, z: 3782.1, name: "臂1-臂2旋转轴心" },
  arm2Arm3: { x: 2596.265, y: 0, z: 3782.1, name: "臂2-臂3旋转轴心" },
  arm3Tool: { x: 2596.265, y: 0, z: 1728.536, name: "臂3-打印头旋转轴心" },
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
      anchorWorldAtCalibration: { x: 2551.0, y: 0, z: 3988.9 },
      anchorOn: "arm2",
    },
    link2: {
      label: "连杆B-2",
      length: 168,
      anchorWorldAtCalibration: { x: 2627.74, y: 0, z: 3570.291 },
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
  const arm1 = state.arm1;
  const arm2 = state.arm1 - state.arm2;
  const arm3 = state.arm1 - state.arm2 - state.arm3;
  const tool = arm3 - state.offset;
  return { arm1, arm2, arm3, tool };
}

function calibrationFrames() {
  const angles = absoluteAnglesForState(CALIBRATION_STATE);
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
    arm1: { ...ACTUATOR_GROUPS.arm1, center: arm1Center, instances: makeActuatorInstances(ACTUATOR_GROUPS.arm1, arm1Center) },
    arm2: { ...ACTUATOR_GROUPS.arm2, center: arm2Center, instances: makeActuatorInstances(ACTUATOR_GROUPS.arm2, arm2Center) },
    arm3: { ...ACTUATOR_GROUPS.arm3, center: arm3Center, instances: makeActuatorInstances(ACTUATOR_GROUPS.arm3, arm3Center) },
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

export function computePose(rawState) {
  const state = clampState(rawState);
  const absoluteAngles = absoluteAnglesForState(state);
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

export function stateFromActuatorStrokes(strokes, currentState = DEFAULT_STATE) {
  return clampState({
    ...currentState,
    arm1: strokes.arm1 == null ? currentState.arm1 : LIMITS.arm1.min + (LIMITS.arm1.max - LIMITS.arm1.min) * clamp(strokes.arm1, 0, 1),
    arm2: strokes.arm2 == null ? currentState.arm2 : LIMITS.arm2.max - (LIMITS.arm2.max - LIMITS.arm2.min) * clamp(strokes.arm2, 0, 1),
    arm3: strokes.arm3 == null ? currentState.arm3 : LIMITS.arm3.max - (LIMITS.arm3.max - LIMITS.arm3.min) * clamp(strokes.arm3, 0, 1),
  });
}

export function solveStateForToolTarget(targetWorld, currentState = DEFAULT_STATE) {
  let candidate = clampState(currentState);
  const referenceBase = candidate.base;
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
    const continuity =
      Math.abs(angleDistance(state.arm1, currentState.arm1)) * 0.08 +
      Math.abs(angleDistance(state.arm2, currentState.arm2)) * 0.04 +
      Math.abs(angleDistance(state.arm3, currentState.arm3)) * 0.04 +
      Math.abs(angleDistance(state.base, currentState.base)) * 0.04;
    return distance + continuity;
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

  const pose = computePose(candidate);
  return {
    state: candidate,
    pose,
    target,
    error: score(candidate),
    reachable: bestScore < 35,
  };
}

export function solveStateForDisplayedToolTarget(targetWorld, currentState = DEFAULT_STATE, displayOffset = {}) {
  let candidate = clampState(currentState);
  const referenceBase = candidate.base;
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
    const continuity =
      Math.abs(angleDistance(state.arm1, currentState.arm1)) * 0.08 +
      Math.abs(angleDistance(state.arm2, currentState.arm2)) * 0.04 +
      Math.abs(angleDistance(state.arm3, currentState.arm3)) * 0.04 +
      Math.abs(angleDistance(state.base, currentState.base)) * 0.04;
    return distance + continuity;
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

  const pose = computePose(candidate);
  return {
    state: candidate,
    pose,
    target,
    error: score(candidate),
    reachable: bestScore < 35,
  };
}

export function worldDisplayedToolPointForState(rawState, displayOffset = {}) {
  const state = clampState(rawState);
  const displayTip = offsetPoint(computePose(state).toolCenter, displayOffset);
  return rotateXYAround(displayTip, -state.base);
}

export function solveStateForWorldDisplayedToolTarget(targetWorld, currentState = DEFAULT_STATE, displayOffset = {}) {
  let candidate = clampState(currentState);
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
    const continuity =
      Math.abs(angleDistance(state.arm1, currentState.arm1)) * 0.08 +
      Math.abs(angleDistance(state.arm2, currentState.arm2)) * 0.04 +
      Math.abs(angleDistance(state.arm3, currentState.arm3)) * 0.04 +
      Math.abs(angleDistance(state.base, currentState.base)) * 0.04;
    return distance + continuity;
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

  const pose = computePose(candidate);
  return {
    state: candidate,
    pose,
    target,
    error: score(candidate),
    reachable: bestScore < 35,
  };
}
