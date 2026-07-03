import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import {
  ACTUATOR_GROUPS,
  ACTUATOR_STROKE_LIMITS,
  DEFAULT_STATE,
  JOINTS,
  LIMITS,
  PRESETS,
  TOOL_LENGTH_MM,
  applyPreset,
  clamp,
  clampState,
  computePose,
  degToRad,
  distance,
  solveStateForWorldDisplayedToolTarget,
  stateFromActuatorStrokes,
  worldDisplayedToolPointForState,
} from "./model.mjs";
import {
  COORDINATE_SYSTEM_NOTE,
  DEVICE_SCENE_ROTATION_Y_RAD,
  deviceToSceneVectorData,
  sceneToDevicePointData,
} from "./coordinates.mjs";

const SCRIPT_VERSION = "20260703-sync-actuator-ik";
const RENDER_SCALE = 1 / 1000;
const QT_STAGE_MODE = new URLSearchParams(window.location.search).has("qtStage");
if (QT_STAGE_MODE) document.documentElement.dataset.qtStage = "true";
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(9.5, 7.2, 11.6);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0.8, 2.2, 0);
const BASE_LINK_PIVOT_MM = { x: 118.258, y: 0, z: 0 };
const TOOL_BALL_STICK_OFFSET_MM = { x: 0, y: 262, z: 0 };
const IMPORTED_PATH_LINE_WIDTH_PX = 5;
const IMPORTED_REMAINING_PATH_LINE_WIDTH_PX = 2;
const IMPORTED_REMAINING_PATH_OPACITY = 0.05;
const DEFAULT_IMPORTED_PATH_URL = "assets/paths/cuboid-4000x2700x3300-layer20-y3600-viewXYZ.csv";
const DEFAULT_IMPORTED_PATH_NAME = "cuboid-4000x2700x3300-layer20-y3600-viewXYZ.csv";
const SHOW_BALL_STICK_BASE = false;
const SHOW_ARM1_ANCHOR_GUIDE = false;
const ARM1_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const ARM2_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const ARM3_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const TOOL_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const CYL1_XN_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const CYL1_XP_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const CYL2_XN_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const CYL2_XP_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const CYL3_MID_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const LINK_A1_XN_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const LINK_A1_XP_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const LINK_A2_MID_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const LINK_B1_XP_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const LINK_B1_XN_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const LINK_B2_MID_MODEL_REFERENCE_STATE = { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const SCENE_AXIS_FOR_DEVICE_X = new THREE.Vector3(1, 0, 0);
const SCENE_AXIS_FOR_DEVICE_Y = new THREE.Vector3(0, 0, 1);
const SCENE_AXIS_FOR_DEVICE_Z = new THREE.Vector3(0, 1, 0);
const controlKeys = ["arm1", "arm2", "arm3", "offset", "base"];
const strokeKeys = ["arm1", "arm2", "arm3"];
const state = { ...DEFAULT_STATE };
let driveMode = "angle";
let currentPose = computePose(state);
let modelEffect = QT_STAGE_MODE ? "transparent" : "solid";
let actuatorBallStickOnly = true;
let keepToolVertical = true;
let hasFramedInitialModel = false;
const arm1ReferencePose = computePose(DEFAULT_STATE);
const arm1ReferenceSegment = arm1ReferencePose.segments.find((segment) => segment.key === "arm1");
const arm2ReferenceSegment = arm1ReferencePose.segments.find((segment) => segment.key === "arm2");
const arm3ReferenceSegment = arm1ReferencePose.segments.find((segment) => segment.key === "arm3");
const toolReferenceSegment = arm1ReferencePose.segments.find((segment) => segment.key === "tool");
const cyl1XnReferenceActuator = getActuatorInstance(arm1ReferencePose, "arm1", -291);
const cyl1XpReferenceActuator = getActuatorInstance(arm1ReferencePose, "arm1", 291);
const cyl2XnReferenceActuator = getActuatorInstance(arm1ReferencePose, "arm2", -195.5);
const cyl2XpReferenceActuator = getActuatorInstance(arm1ReferencePose, "arm2", 195.5);
const cyl3MidReferenceActuator = getActuatorInstance(arm1ReferencePose, "arm3", 0);
const linkA1XnReference = getLinkageInstance(arm1ReferencePose, "A", -230);
const linkA1XpReference = getLinkageInstance(arm1ReferencePose, "A", 230);
const linkA2MidReference = getLinkageInstance(arm1ReferencePose, "A", 0);
const linkB1XpReference = getLinkageInstance(arm1ReferencePose, "B", 126);
const linkB1XnReference = getLinkageInstance(arm1ReferencePose, "B", -126);
const linkB2MidReference = getLinkageInstance(arm1ReferencePose, "B", 0);
const ARM1_MODEL_ROOT_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  ARM1_MODEL_REFERENCE_STATE,
  arm1ReferenceSegment.start,
  arm1ReferencePose,
);
const ARM2_MODEL_ROOT_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  ARM2_MODEL_REFERENCE_STATE,
  arm2ReferenceSegment.start,
  arm1ReferencePose,
);
const ARM3_MODEL_ROOT_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  ARM3_MODEL_REFERENCE_STATE,
  arm3ReferenceSegment.start,
  arm1ReferencePose,
);
const TOOL_MODEL_ROOT_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  TOOL_MODEL_REFERENCE_STATE,
  toolReferenceSegment.start,
  arm1ReferencePose,
);
const CYL1_XN_BASE_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL1_XN_MODEL_REFERENCE_STATE,
  cyl1XnReferenceActuator.tail,
  arm1ReferencePose,
);
const CYL1_XN_END_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL1_XN_MODEL_REFERENCE_STATE,
  cyl1XnReferenceActuator.front,
  arm1ReferencePose,
);
const CYL1_XP_BASE_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL1_XP_MODEL_REFERENCE_STATE,
  cyl1XpReferenceActuator.tail,
  arm1ReferencePose,
);
const CYL1_XP_END_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL1_XP_MODEL_REFERENCE_STATE,
  cyl1XpReferenceActuator.front,
  arm1ReferencePose,
);
const CYL2_XN_BASE_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL2_XN_MODEL_REFERENCE_STATE,
  cyl2XnReferenceActuator.tail,
  arm1ReferencePose,
);
const CYL2_XN_END_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL2_XN_MODEL_REFERENCE_STATE,
  cyl2XnReferenceActuator.front,
  arm1ReferencePose,
);
const CYL2_XP_BASE_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL2_XP_MODEL_REFERENCE_STATE,
  cyl2XpReferenceActuator.tail,
  arm1ReferencePose,
);
const CYL2_XP_END_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL2_XP_MODEL_REFERENCE_STATE,
  cyl2XpReferenceActuator.front,
  arm1ReferencePose,
);
const CYL3_MID_BASE_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL3_MID_MODEL_REFERENCE_STATE,
  cyl3MidReferenceActuator.tail,
  arm1ReferencePose,
);
const CYL3_MID_END_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  CYL3_MID_MODEL_REFERENCE_STATE,
  cyl3MidReferenceActuator.front,
  arm1ReferencePose,
);
const LINK_A1_XN_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  LINK_A1_XN_MODEL_REFERENCE_STATE,
  linkA1XnReference.link1Anchor,
  arm1ReferencePose,
);
const LINK_A1_XP_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  LINK_A1_XP_MODEL_REFERENCE_STATE,
  linkA1XpReference.link1Anchor,
  arm1ReferencePose,
);
const LINK_A2_MID_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  LINK_A2_MID_MODEL_REFERENCE_STATE,
  linkA2MidReference.link2Anchor,
  arm1ReferencePose,
);
const LINK_B1_XP_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  LINK_B1_XP_MODEL_REFERENCE_STATE,
  linkB1XpReference.link1Anchor,
  arm1ReferencePose,
);
const LINK_B1_XN_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  LINK_B1_XN_MODEL_REFERENCE_STATE,
  linkB1XnReference.link1Anchor,
  arm1ReferencePose,
);
const LINK_B2_MID_ANCHOR_LOCAL = makeReferenceSceneAnchor(
  LINK_B2_MID_MODEL_REFERENCE_STATE,
  linkB2MidReference.link2Anchor,
  arm1ReferencePose,
);
const ARM1_MODEL_TWO_POINT_ANCHORS = makeTwoPointAnchors(
  ARM1_MODEL_REFERENCE_STATE,
  arm1ReferenceSegment.start,
  arm1ReferenceSegment.end,
);

const controlRoot = document.querySelector("#controls");
const strokeRoot = document.querySelector("#strokeControls");
const linearRoot = document.querySelector("#linearControls");
const presetRoot = document.querySelector("#presets");
const metricsRoot = document.querySelector("#metrics");
const canvas = document.querySelector("#viewport");
const modelEffectSelect = document.querySelector("#modelEffectSelect");

let webglAvailable = true;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    logarithmicDepthBuffer: true,
  });
} catch (error) {
  webglAvailable = false;
  document.documentElement.dataset.webglUnavailable = "true";
  window.__lingzhuBootErrors = window.__lingzhuBootErrors || [];
  window.__lingzhuBootErrors.push(error?.message || String(error));
  const warning = document.createElement("div");
  warning.className = "webgl-warning";
  warning.textContent = "WebGL 初始化失败：控制界面已加载，但 3D 画布无法渲染。请刷新页面，或检查 Chrome 硬件加速。";
  document.querySelector(".stage")?.appendChild(warning);
  renderer = {
    domElement: canvas,
    setPixelRatio() {},
    setClearColor() {},
    setSize(width, height) {
      canvas.width = Math.max(1, Math.floor(width));
      canvas.height = Math.max(1, Math.floor(height));
    },
    render() {},
  };
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
if (renderer.shadowMap) {
  renderer.shadowMap.enabled = false;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = null;

const camera = new THREE.PerspectiveCamera(42, 1, 0.08, 85);
camera.position.copy(DEFAULT_CAMERA_POSITION);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.target.copy(DEFAULT_CAMERA_TARGET);
orbit.minDistance = 4;
orbit.maxDistance = 24;

const deviceSceneRoot = new THREE.Group();
deviceSceneRoot.rotation.y = DEVICE_SCENE_ROTATION_Y_RAD;
scene.add(deviceSceneRoot);

const root = new THREE.Group();
deviceSceneRoot.add(root);

const fixedModelRoot = new THREE.Group();
deviceSceneRoot.add(fixedModelRoot);

const modelRoot = new THREE.Group();
root.add(modelRoot);

const ballStickMotionRoot = new THREE.Group();
deviceSceneRoot.add(ballStickMotionRoot);

const ballStickRoot = new THREE.Group();
ballStickMotionRoot.add(ballStickRoot);

const pathRoot = new THREE.Group();
deviceSceneRoot.add(pathRoot);

const arm1AnchorGuideRoot = new THREE.Group();
deviceSceneRoot.add(arm1AnchorGuideRoot);

const grid = new THREE.GridHelper(11, 11, 0x444444, 0x1d1d1d);
grid.position.y = -1.2;
deviceSceneRoot.add(grid);

const staticGuideRoot = new THREE.Group();
deviceSceneRoot.add(staticGuideRoot);
createWorldGuides();

const pivotGuideRoot = new THREE.Group();
deviceSceneRoot.add(pivotGuideRoot);
createBaseLinkPivotGuide();
pivotGuideRoot.visible = false;

const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 2.05);
scene.add(hemi);

const leftKeyLight = new THREE.DirectionalLight(0xfffbf2, 1.35);
leftKeyLight.position.set(-9000, -7000, 13000);
scene.add(leftKeyLight);

const rightKeyLight = new THREE.DirectionalLight(0xfffbf2, 1.35);
rightKeyLight.position.set(9000, -7000, 13000);
scene.add(rightKeyLight);

const topFillLight = new THREE.DirectionalLight(0xffffff, 0.55);
topFillLight.position.set(0, 2000, 15000);
scene.add(topFillLight);

const materials = {
  arm1: new THREE.MeshStandardMaterial({ color: 0xf5b642, roughness: 0.42, metalness: 0.18 }),
  arm2: new THREE.MeshStandardMaterial({ color: 0x4ecdc4, roughness: 0.42, metalness: 0.16 }),
  arm3: new THREE.MeshStandardMaterial({ color: 0x66a6ff, roughness: 0.42, metalness: 0.16 }),
  tool: new THREE.MeshStandardMaterial({ color: 0xff5d5d, roughness: 0.35, metalness: 0.2 }),
  joint: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.25 }),
  actuator: new THREE.MeshStandardMaterial({ color: 0xd8dee9, roughness: 0.32, metalness: 0.4 }),
  actuatorDark: new THREE.MeshStandardMaterial({ color: 0x6f7d8c, roughness: 0.45, metalness: 0.28 }),
  linkage: new THREE.MeshStandardMaterial({ color: 0xc77dff, roughness: 0.38, metalness: 0.18 }),
  base: new THREE.MeshStandardMaterial({ color: 0x2b3138, roughness: 0.5, metalness: 0.3 }),
  linearHandle: new THREE.MeshBasicMaterial({ color: 0x4f8cff, transparent: true, opacity: 0.96, depthTest: false }),
  path: new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
  walkedPath: new LineMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    linewidth: IMPORTED_PATH_LINE_WIDTH_PX,
    depthWrite: false,
  }),
  remainingPath: new LineMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: IMPORTED_REMAINING_PATH_OPACITY,
    linewidth: IMPORTED_REMAINING_PATH_LINE_WIDTH_PX,
    dashed: true,
    dashSize: 0.12,
    gapSize: 0.09,
    depthWrite: false,
  }),
  importedPathPoint: new THREE.MeshBasicMaterial({ color: 0x9ee8ff, transparent: true, opacity: 0.92, depthTest: false }),
};

const glbMaterials = {
  transparent: new THREE.MeshStandardMaterial({
    color: 0xdde4ef,
    transparent: true,
    opacity: 0.22,
    roughness: 0.72,
    metalness: 0.02,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  }),
  solid: ({ tool = false } = {}) => new THREE.MeshStandardMaterial({
    color: tool ? 0xf4f5f3 : 0xebeeec,
    transparent: false,
    opacity: 1,
    roughness: 0.68,
    metalness: 0,
    emissive: 0x000000,
    emissiveIntensity: 0,
    side: THREE.DoubleSide,
    depthWrite: true,
    envMapIntensity: 0,
  }),
};

const solidGlbEdgeProfile = {
  drawEdges: true,
  edge: 0x9ea5a5,
  edgeOpacity: 0.18,
  edgeThreshold: 36,
  edgeVertexLimit: 900000,
  edgeDepthTest: true,
};
const SOLID_GLB_EDGE_MARKER = "lingzhuSolidGlbEdge";

const tipDragHandle = new THREE.Mesh(
  new THREE.SphereGeometry(0.11, 32, 20),
  new THREE.MeshStandardMaterial({
    color: 0x70e4ff,
    emissive: 0x0b6e7d,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.82,
    roughness: 0.3,
    metalness: 0.08,
    depthWrite: false,
  }),
);
tipDragHandle.name = "打印头拖拽手柄";
tipDragHandle.renderOrder = 80;
tipDragHandle.userData.draggablePrintHead = true;
scene.add(tipDragHandle);

const arm1AnchorGuide = createArm1AnchorGuide();

const linearMotion = {
  startWorld: null,
  endWorld: null,
  startState: null,
  pathPoints: null,
  pathMode: "interpolated",
  pathSourceName: "",
  pathStatus: "未导入路径文件",
  progress: 0,
  speed: 500,
  animationFrame: null,
  isSimulating: false,
  startedAt: 0,
};
const linearDrag = {
  active: false,
  hovering: false,
  pointerId: null,
  dragOffset: new THREE.Vector3(),
  lastWorld: null,
  lastDisplayWorld: null,
  lastRawDisplayWorld: null,
  handleWorld: null,
};
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const linearDragPlane = new THREE.Plane();
const linearDragIntersection = new THREE.Vector3();
let linearDragHandle = null;
let pathRenderStats = { walkedSegments: 0, remainingSegments: 0, mode: "none" };

const modelControllers = {
  base: makeModelController(
    "base",
    "Base",
    "assets/base.glb",
    "assets/base-model.js",
    "base",
    { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 },
    null,
    { locked: true },
  ),
  baseLink: makeModelController(
    "baseLink",
    "Base Link",
    "assets/base_link.glb",
    "assets/base-link-model.js",
    "baseLink",
    { visible: true, x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 },
    "base",
    { locked: true, pivot: "origin", pivotPoint: BASE_LINK_PIVOT_MM },
  ),
  arm1: makeModelController(
    "arm1",
    "Arm1",
    "assets/arm1.glb",
    "assets/arm1-model.js",
    "arm1",
    ARM1_MODEL_REFERENCE_STATE,
    "arm1",
    {
      locked: true,
      followPlane: "yz",
      followReferenceAngle: 90,
      jointRotationSign: -1,
      referencePoseFollow: true,
      anchorLocal: ARM1_MODEL_ROOT_ANCHOR_LOCAL,
      anchorUnits: "scene",
      twoPointAnchors: ARM1_MODEL_TWO_POINT_ANCHORS,
    },
  ),
  arm2: makeModelController(
    "arm2",
    "Arm2",
    "assets/arm2.glb",
    "assets/arm2-model.js",
    "arm2",
    ARM2_MODEL_REFERENCE_STATE,
    "arm2",
    {
      locked: true,
      followPlane: "yz",
      followReferenceAngle: arm2ReferenceSegment.angle,
      jointRotationSign: -1,
      referencePoseFollow: true,
      anchorLocal: ARM2_MODEL_ROOT_ANCHOR_LOCAL,
      anchorUnits: "scene",
    },
  ),
  arm3: makeModelController(
    "arm3",
    "Arm3",
    "assets/arm3.glb",
    "assets/arm3-model.js",
    "arm3",
    ARM3_MODEL_REFERENCE_STATE,
    "arm3",
    {
      locked: true,
      followPlane: "yz",
      followReferenceAngle: arm3ReferenceSegment.angle,
      jointRotationSign: -1,
      referencePoseFollow: true,
      anchorLocal: ARM3_MODEL_ROOT_ANCHOR_LOCAL,
      anchorUnits: "scene",
    },
  ),
  tool: makeModelController(
    "tool",
    "Tool",
    "assets/tool.glb",
    "assets/tool-model.js",
    "tool",
    TOOL_MODEL_REFERENCE_STATE,
    "tool",
    {
      locked: true,
      followPlane: "yz",
      followReferenceAngle: toolReferenceSegment.angle,
      jointRotationSign: -1,
      referencePoseFollow: true,
      anchorLocal: TOOL_MODEL_ROOT_ANCHOR_LOCAL,
      anchorUnits: "scene",
    },
  ),
  cyl1XnBase: makeModelController(
    "cyl1XnBase",
    "Cyl1 X- Base",
    "assets/cyl1_xn_base.glb",
    "assets/cyl1-xn-base-model.js",
    "cyl1XnBase",
    CYL1_XN_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm1", side: -291, point: "tail" },
      anchorLocal: CYL1_XN_BASE_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl1XnEnd: makeModelController(
    "cyl1XnEnd",
    "Cyl1 X- End",
    "assets/cyl1_xn_end.glb",
    "assets/cyl1-xn-end-model.js",
    "cyl1XnEnd",
    CYL1_XN_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm1", side: -291, point: "front" },
      anchorLocal: CYL1_XN_END_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl1XpBase: makeModelController(
    "cyl1XpBase",
    "Cyl1 X+ Base",
    "assets/cyl1_xp_base.glb",
    "assets/cyl1-xp-base-model.js",
    "cyl1XpBase",
    CYL1_XP_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm1", side: 291, point: "tail" },
      anchorLocal: CYL1_XP_BASE_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl1XpEnd: makeModelController(
    "cyl1XpEnd",
    "Cyl1 X+ End",
    "assets/cyl1_xp_end.glb",
    "assets/cyl1-xp-end-model.js",
    "cyl1XpEnd",
    CYL1_XP_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm1", side: 291, point: "front" },
      anchorLocal: CYL1_XP_END_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl2XnBase: makeModelController(
    "cyl2XnBase",
    "Cyl2 X- Base",
    "assets/cyl2_xn_base.glb",
    "assets/cyl2-xn-base-model.js",
    "cyl2XnBase",
    CYL2_XN_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm2", side: -195.5, point: "tail" },
      anchorLocal: CYL2_XN_BASE_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl2XnEnd: makeModelController(
    "cyl2XnEnd",
    "Cyl2 X- End",
    "assets/cyl2_xn_end.glb",
    "assets/cyl2-xn-end-model.js",
    "cyl2XnEnd",
    CYL2_XN_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm2", side: -195.5, point: "front" },
      anchorLocal: CYL2_XN_END_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl2XpBase: makeModelController(
    "cyl2XpBase",
    "Cyl2 X+ Base",
    "assets/cyl2_xp_base.glb",
    "assets/cyl2-xp-base-model.js",
    "cyl2XpBase",
    CYL2_XP_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm2", side: 195.5, point: "tail" },
      anchorLocal: CYL2_XP_BASE_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl2XpEnd: makeModelController(
    "cyl2XpEnd",
    "Cyl2 X+ End",
    "assets/cyl2_xp_end.glb",
    "assets/cyl2-xp-end-model.js",
    "cyl2XpEnd",
    CYL2_XP_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm2", side: 195.5, point: "front" },
      anchorLocal: CYL2_XP_END_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl3MidBase: makeModelController(
    "cyl3MidBase",
    "Cyl3 Mid Base",
    "assets/cyl3_mid_base.glb",
    "assets/cyl3-mid-base-model.js",
    "cyl3MidBase",
    CYL3_MID_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm3", side: 0, point: "tail" },
      anchorLocal: CYL3_MID_BASE_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  cyl3MidEnd: makeModelController(
    "cyl3MidEnd",
    "Cyl3 Mid End",
    "assets/cyl3_mid_end.glb",
    "assets/cyl3-mid-end-model.js",
    "cyl3MidEnd",
    CYL3_MID_MODEL_REFERENCE_STATE,
    "actuator",
    {
      actuatorFollow: { group: "arm3", side: 0, point: "front" },
      anchorLocal: CYL3_MID_END_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  linkA1Xn: makeModelController(
    "linkA1Xn",
    "Link A1 X-",
    "assets/link_a1_xn.glb",
    "assets/link-a1-xn-model.js",
    "linkA1Xn",
    LINK_A1_XN_MODEL_REFERENCE_STATE,
    "linkage",
    {
      linkageFollow: { group: "A", side: -230, start: "link1Anchor", end: "common", point: "link1Anchor" },
      anchorLocal: LINK_A1_XN_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  linkA1Xp: makeModelController(
    "linkA1Xp",
    "Link A1 X+",
    "assets/link_a1_xp.glb",
    "assets/link-a1-xp-model.js",
    "linkA1Xp",
    LINK_A1_XP_MODEL_REFERENCE_STATE,
    "linkage",
    {
      linkageFollow: { group: "A", side: 230, start: "link1Anchor", end: "common", point: "link1Anchor" },
      anchorLocal: LINK_A1_XP_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  linkA2Mid: makeModelController(
    "linkA2Mid",
    "Link A2 Mid",
    "assets/link_a2_mid.glb",
    "assets/link-a2-mid-model.js",
    "linkA2Mid",
    LINK_A2_MID_MODEL_REFERENCE_STATE,
    "linkage",
    {
      linkageFollow: { group: "A", side: 0, start: "link2Anchor", end: "common", point: "link2Anchor" },
      anchorLocal: LINK_A2_MID_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  linkB1Xp: makeModelController(
    "linkB1Xp",
    "Link B1 X+",
    "assets/link_b1_xp.glb",
    "assets/link-b1-xp-model.js",
    "linkB1Xp",
    LINK_B1_XP_MODEL_REFERENCE_STATE,
    "linkage",
    {
      linkageFollow: { group: "B", side: 126, start: "link1Anchor", end: "common", point: "link1Anchor" },
      anchorLocal: LINK_B1_XP_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  linkB1Xn: makeModelController(
    "linkB1Xn",
    "Link B1 X-",
    "assets/link_b1_xn.glb",
    "assets/link-b1-xn-model.js",
    "linkB1Xn",
    LINK_B1_XN_MODEL_REFERENCE_STATE,
    "linkage",
    {
      linkageFollow: { group: "B", side: -126, start: "link1Anchor", end: "common", point: "link1Anchor" },
      anchorLocal: LINK_B1_XN_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
  linkB2Mid: makeModelController(
    "linkB2Mid",
    "Link B2 Mid",
    "assets/link_b2_mid.glb",
    "assets/link-b2-mid-model.js",
    "linkB2Mid",
    LINK_B2_MID_MODEL_REFERENCE_STATE,
    "linkage",
    {
      linkageFollow: { group: "B", side: 0, start: "link2Anchor", end: "common", point: "link2Anchor" },
      anchorLocal: LINK_B2_MID_ANCHOR_LOCAL,
      anchorUnits: "scene",
      locked: true,
    },
  ),
};

const qtModelKeyMap = {
  "base.glb": "base",
  "base_link.glb": "baseLink",
  "arm1.glb": "arm1",
  "arm2.glb": "arm2",
  "arm3.glb": "arm3",
  "tool.glb": "tool",
  "cyl1_xn_base.glb": "cyl1XnBase",
  "cyl1_xn_end.glb": "cyl1XnEnd",
  "cyl1_xp_base.glb": "cyl1XpBase",
  "cyl1_xp_end.glb": "cyl1XpEnd",
  "cyl2_xn_base.glb": "cyl2XnBase",
  "cyl2_xn_end.glb": "cyl2XnEnd",
  "cyl2_xp_base.glb": "cyl2XpBase",
  "cyl2_xp_end.glb": "cyl2XpEnd",
  "cyl3_mid_base.glb": "cyl3MidBase",
  "cyl3_mid_end.glb": "cyl3MidEnd",
  "link_a1_xn.glb": "linkA1Xn",
  "link_a1_xp.glb": "linkA1Xp",
  "link_a2_mid.glb": "linkA2Mid",
  "link_b1_xn.glb": "linkB1Xn",
  "link_b1_xp.glb": "linkB1Xp",
  "link_b2_mid.glb": "linkB2Mid",
};

window.__lingzhuModelLoadErrors = [];

function makeModelController(key, label, glbPath, fallbackPath, fallbackKey, initialState, follows, options = {}) {
  const group = new THREE.Group();
  const model = new THREE.Group();
  group.add(model);
  return {
    key,
    label,
    glbPath,
    fallbackPath,
    fallbackKey,
    follows,
    state: { ...initialState },
    homeState: { ...initialState },
    group,
    model,
    loaded: false,
    childCount: 0,
    stats: { source: "pending", bytes: 0 },
    error: null,
    locked: options.locked === true,
    pivot: options.pivot || "self",
    pivotPoint: options.pivotPoint || { x: 0, y: 0, z: 0 },
    anchorLocal: options.anchorLocal || null,
    anchorUnits: options.anchorUnits || "model",
    twoPointAnchors: options.twoPointAnchors || null,
    editAnchorsOnly: options.editAnchorsOnly === true,
    referencePoseFollow: options.referencePoseFollow === true,
    followPlane: options.followPlane || "xz",
    followReferenceAngle: options.followReferenceAngle,
    jointRotationSign: options.jointRotationSign ?? 1,
    actuatorFollow: options.actuatorFollow || null,
    linkageFollow: options.linkageFollow || null,
  };
}

function anchorOffsetVector(controller, quaternion, scale) {
  const anchor = controller.anchorLocal || { x: 0, y: 0, z: 0 };
  const unitScale = controller.anchorUnits === "scene" ? 1 : scale;
  return new THREE.Vector3(anchor.x, anchor.y, anchor.z)
    .multiplyScalar(unitScale)
    .applyQuaternion(quaternion);
}

function anchorLocalPointForWorld(controller, scale) {
  const anchor = controller.anchorLocal || { x: 0, y: 0, z: 0 };
  const localScale = controller.anchorUnits === "scene" ? 1 / scale : 1;
  return new THREE.Vector3(anchor.x, anchor.y, anchor.z).multiplyScalar(localScale);
}

function transformedByBaseRotation(localPoint, basePivot, baseQuaternion) {
  return localPoint.clone().sub(basePivot).applyQuaternion(baseQuaternion).add(basePivot);
}

function ballStickWorldPoint(point, pose) {
  const basePivot = deviceToScene(BASE_LINK_PIVOT_MM);
  const baseQuaternion = deviceAxisQuaternion(SCENE_AXIS_FOR_DEVICE_Z, degToRad(pose.baseAngle));
  return transformedByBaseRotation(deviceToScene(point), basePivot, baseQuaternion);
}

function getActuatorInstance(pose, groupKey, side) {
  const instances = pose.actuators?.[groupKey]?.instances || [];
  return instances.find((instance) => Math.abs((instance.side || 0) - side) < 0.001) || instances[0];
}

function getLinkageInstance(pose, groupKey, side) {
  const instances = pose.linkages?.[groupKey]?.instances || [];
  if (Math.abs(side || 0) < 0.001 && pose.linkages?.[groupKey]?.center) {
    const center = pose.linkages[groupKey].center;
    return {
      common: center.common,
      link1Anchor: center.link1Anchor,
      link2Anchor: center.link2Anchor,
      link1Length: pose.linkages[groupKey].link1?.length,
      link2Length: pose.linkages[groupKey].link2?.length,
      side: 0,
    };
  }
  return instances.find((instance) => Math.abs((instance.side || 0) - side) < 0.001) || instances[0];
}

function actuatorSideDirectionWorld(instance, pose, side) {
  const sidePoint = { ...instance.tail, y: side };
  const centerPoint = { ...instance.tail, y: 0 };
  return ballStickWorldPoint(sidePoint, pose)
    .sub(ballStickWorldPoint(centerPoint, pose))
    .normalize();
}

function linkageSideDirectionWorld(instance, pose, side, anchorKey) {
  const anchor = instance[anchorKey] || instance.common;
  const sidePoint = { ...anchor, y: side };
  const centerPoint = { ...anchor, y: 0 };
  return ballStickWorldPoint(sidePoint, pose)
    .sub(ballStickWorldPoint(centerPoint, pose))
    .normalize();
}

function frameQuaternionFromAxisAndSide(axis, sideHint) {
  const xAxis = axis.clone().normalize();
  let zAxis = sideHint.clone().sub(xAxis.clone().multiplyScalar(sideHint.dot(xAxis)));
  if (zAxis.lengthSq() < 1e-10) zAxis = SCENE_AXIS_FOR_DEVICE_Z.clone().sub(xAxis.clone().multiplyScalar(SCENE_AXIS_FOR_DEVICE_Z.dot(xAxis)));
  if (zAxis.lengthSq() < 1e-10) zAxis = SCENE_AXIS_FOR_DEVICE_X.clone().sub(xAxis.clone().multiplyScalar(SCENE_AXIS_FOR_DEVICE_X.dot(xAxis)));
  zAxis.normalize();
  const yAxis = zAxis.clone().cross(xAxis).normalize();
  zAxis = xAxis.clone().cross(yAxis).normalize();
  const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

function applyActuatorFollow(controller, pose, baseQuaternion, modelQuaternion, scale) {
  const follow = controller.actuatorFollow;
  const instance = getActuatorInstance(pose, follow.group, follow.side);
  const referenceInstance = getActuatorInstance(arm1ReferencePose, follow.group, follow.side);
  if (!instance || !referenceInstance) return false;

  const targetPoint = instance[follow.point];
  const targetWorld = ballStickWorldPoint(targetPoint, pose);
  const currentTail = ballStickWorldPoint(instance.tail, pose);
  const currentFront = ballStickWorldPoint(instance.front, pose);
  const referenceTail = ballStickWorldPoint(referenceInstance.tail, arm1ReferencePose);
  const referenceFront = ballStickWorldPoint(referenceInstance.front, arm1ReferencePose);
  const currentVector = currentFront.clone().sub(currentTail).normalize();
  const referenceVector = referenceFront.clone().sub(referenceTail).normalize();
  const currentSide = actuatorSideDirectionWorld(instance, pose, follow.side || 0);
  const referenceSide = actuatorSideDirectionWorld(referenceInstance, arm1ReferencePose, follow.side || 0);
  const currentFrame = frameQuaternionFromAxisAndSide(currentVector, currentSide);
  const referenceFrame = frameQuaternionFromAxisAndSide(referenceVector, referenceSide);
  const alignQuaternion = currentFrame.multiply(referenceFrame.invert());
  const finalQuaternion = alignQuaternion.multiply(modelQuaternion);
  const rootOffset = anchorOffsetVector(controller, finalQuaternion, scale);

  controller.group.position.set(0, 0, 0);
  controller.group.quaternion.identity();
  controller.group.scale.setScalar(1);
  controller.model.position.copy(targetWorld.clone().sub(rootOffset));
  controller.model.quaternion.copy(finalQuaternion);
  controller.model.scale.setScalar(scale);
  controller.model.updateWorldMatrix(true, true);

  const actualAnchorWorld = objectLocalToDeviceScene(controller.model, anchorLocalPointForWorld(controller, scale));
  const correction = targetWorld.clone().sub(actualAnchorWorld);
  controller.model.position.add(correction);
  controller.model.updateWorldMatrix(true, true);
  controller.lastAnchorCorrectionWorld = deviceSceneToDevice(correction);
  controller.lastModelAnchorWorld = deviceSceneToDevice(objectLocalToDeviceScene(controller.model, anchorLocalPointForWorld(controller, scale)));
  controller.lastTargetAnchorWorld = deviceSceneToDevice(targetWorld);
  controller.lastActuatorFollow = {
    group: follow.group,
    side: follow.side,
    point: follow.point,
    tailWorld: deviceSceneToDevice(currentTail),
    frontWorld: deviceSceneToDevice(currentFront),
  };
  return true;
}

function applyLinkageFollow(controller, pose, modelQuaternion, scale) {
  const follow = controller.linkageFollow;
  const instance = getLinkageInstance(pose, follow.group, follow.side);
  const referenceInstance = getLinkageInstance(arm1ReferencePose, follow.group, follow.side);
  if (!instance || !referenceInstance) return false;

  const startKey = follow.start || "link1Anchor";
  const endKey = follow.end || "common";
  const pointKey = follow.point || startKey;
  const targetPoint = instance[pointKey];
  const targetWorld = ballStickWorldPoint(targetPoint, pose);
  const currentStart = ballStickWorldPoint(instance[startKey], pose);
  const currentEnd = ballStickWorldPoint(instance[endKey], pose);
  if (controller.twoPointAnchors) {
    const localStart = controller.twoPointAnchors.start.clone();
    const localEnd = controller.twoPointAnchors.end.clone();
    const localVector = localEnd.clone().sub(localStart).applyQuaternion(modelQuaternion).normalize();
    const targetVector = currentEnd.clone().sub(currentStart).normalize();
    const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(localVector, targetVector);
    const finalQuaternion = alignQuaternion.multiply(modelQuaternion);
    const startOffset = localStart.multiplyScalar(scale).applyQuaternion(finalQuaternion);

    controller.group.position.set(0, 0, 0);
    controller.group.quaternion.identity();
    controller.group.scale.setScalar(1);
    controller.model.position.copy(currentStart.clone().sub(startOffset));
    controller.model.quaternion.copy(finalQuaternion);
    controller.model.scale.setScalar(scale);
    controller.model.updateWorldMatrix(true, true);

    const actualStartWorld = objectLocalToDeviceScene(controller.model, controller.twoPointAnchors.start.clone());
    const actualEndWorld = objectLocalToDeviceScene(controller.model, controller.twoPointAnchors.end.clone());
    controller.lastAnchorCorrectionWorld = { x: 0, y: 0, z: 0 };
    controller.lastModelAnchorWorld = deviceSceneToDevice(actualStartWorld);
    controller.lastTargetAnchorWorld = deviceSceneToDevice(currentStart);
    controller.lastLinkageFollow = {
      group: follow.group,
      side: follow.side,
      start: startKey,
      end: endKey,
      point: pointKey,
      startWorld: deviceSceneToDevice(currentStart),
      endWorld: deviceSceneToDevice(currentEnd),
      actualStartWorld: deviceSceneToDevice(actualStartWorld),
      actualEndWorld: deviceSceneToDevice(actualEndWorld),
      startError: Number(actualStartWorld.distanceTo(currentStart).toFixed(6)),
      endError: Number(actualEndWorld.distanceTo(currentEnd).toFixed(6)),
      length: currentStart.distanceTo(currentEnd) / RENDER_SCALE,
    };
    return true;
  }
  const referenceStart = ballStickWorldPoint(referenceInstance[startKey], arm1ReferencePose);
  const referenceEnd = ballStickWorldPoint(referenceInstance[endKey], arm1ReferencePose);
  const currentVector = currentEnd.clone().sub(currentStart).normalize();
  const referenceVector = referenceEnd.clone().sub(referenceStart).normalize();
  const currentSide = linkageSideDirectionWorld(instance, pose, follow.side || 0, startKey);
  const referenceSide = linkageSideDirectionWorld(referenceInstance, arm1ReferencePose, follow.side || 0, startKey);
  const currentFrame = frameQuaternionFromAxisAndSide(currentVector, currentSide);
  const referenceFrame = frameQuaternionFromAxisAndSide(referenceVector, referenceSide);
  const alignQuaternion = currentFrame.multiply(referenceFrame.invert());
  const finalQuaternion = alignQuaternion.multiply(modelQuaternion);
  const rootOffset = anchorOffsetVector(controller, finalQuaternion, scale);

  controller.group.position.set(0, 0, 0);
  controller.group.quaternion.identity();
  controller.group.scale.setScalar(1);
  controller.model.position.copy(targetWorld.clone().sub(rootOffset));
  controller.model.quaternion.copy(finalQuaternion);
  controller.model.scale.setScalar(scale);
  controller.model.updateWorldMatrix(true, true);

  const actualAnchorWorld = objectLocalToDeviceScene(controller.model, anchorLocalPointForWorld(controller, scale));
  const correction = targetWorld.clone().sub(actualAnchorWorld);
  controller.model.position.add(correction);
  controller.model.updateWorldMatrix(true, true);
  controller.lastAnchorCorrectionWorld = deviceSceneToDevice(correction);
  controller.lastModelAnchorWorld = deviceSceneToDevice(objectLocalToDeviceScene(controller.model, anchorLocalPointForWorld(controller, scale)));
  controller.lastTargetAnchorWorld = deviceSceneToDevice(targetWorld);
  controller.lastLinkageFollow = {
    group: follow.group,
    side: follow.side,
    start: startKey,
    end: endKey,
    point: pointKey,
    startWorld: deviceSceneToDevice(currentStart),
    endWorld: deviceSceneToDevice(currentEnd),
    length: currentStart.distanceTo(currentEnd) / RENDER_SCALE,
  };
  return true;
}

function makeReferenceSceneAnchor(modelState, worldPoint, pose) {
  const modelPosition = new THREE.Vector3(
    modelState.x * RENDER_SCALE,
    modelState.z * RENDER_SCALE,
    modelState.y * RENDER_SCALE,
  );
  const inverseModelQuaternion = deviceRotationQuaternion(modelState.rx, modelState.ry, modelState.rz).invert();
  const anchor = ballStickWorldPoint(worldPoint, pose)
    .sub(modelPosition)
    .applyQuaternion(inverseModelQuaternion);
  return { x: anchor.x, y: anchor.y, z: anchor.z };
}

function makeReferenceSceneAnchorFromScenePoint(modelState, scenePoint) {
  const modelPosition = new THREE.Vector3(
    modelState.x * RENDER_SCALE,
    modelState.z * RENDER_SCALE,
    modelState.y * RENDER_SCALE,
  );
  const inverseModelQuaternion = deviceRotationQuaternion(modelState.rx, modelState.ry, modelState.rz).invert();
  const anchor = scenePoint
    .clone()
    .sub(modelPosition)
    .applyQuaternion(inverseModelQuaternion);
  return { x: anchor.x, y: anchor.y, z: anchor.z };
}

function deviceRotationQuaternion(rx, ry, rz) {
  const qx = new THREE.Quaternion().setFromAxisAngle(SCENE_AXIS_FOR_DEVICE_X, degToRad(rx));
  const qy = new THREE.Quaternion().setFromAxisAngle(SCENE_AXIS_FOR_DEVICE_Y, degToRad(ry));
  const qz = new THREE.Quaternion().setFromAxisAngle(SCENE_AXIS_FOR_DEVICE_Z, degToRad(rz));
  return new THREE.Quaternion().multiply(qz).multiply(qy).multiply(qx);
}

function deviceAxisQuaternion(axis, radians) {
  return new THREE.Quaternion().setFromAxisAngle(axis, radians);
}

function rotateThreeOffsetAroundX(offset, angleRadians) {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  return new THREE.Vector3(
    offset.x,
    offset.y * cos - offset.z * sin,
    offset.y * sin + offset.z * cos,
  );
}

function rotateThreeOffsetInDisplayedYZ(offset, angleRadians) {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  return new THREE.Vector3(
    offset.x * cos - offset.y * sin,
    offset.x * sin + offset.y * cos,
    offset.z,
  );
}

function deviceToScene(point) {
  const vector = deviceToSceneVectorData(point, RENDER_SCALE);
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}

function offsetPoint(point, offset) {
  return {
    ...point,
    x: point.x + (offset.x || 0),
    y: (point.y || 0) + (offset.y || 0),
    z: point.z + (offset.z || 0),
  };
}

function displayedToolPoint(point) {
  return offsetPoint(point, TOOL_BALL_STICK_OFFSET_MM);
}

function makeTwoPointAnchors(modelState, startWorld, endWorld) {
  const modelPosition = new THREE.Vector3(
    modelState.x * RENDER_SCALE,
    modelState.z * RENDER_SCALE,
    modelState.y * RENDER_SCALE,
  );
  const modelQuaternion = deviceRotationQuaternion(modelState.rx, modelState.ry, modelState.rz);
  const inverseModelQuaternion = modelQuaternion.clone().invert();
  const scale = Math.max(0.001, modelState.scale) * (modelState.unitScale ?? RENDER_SCALE);
  const toLocalAnchor = (worldPoint) =>
    deviceToScene(worldPoint)
      .sub(modelPosition)
      .applyQuaternion(inverseModelQuaternion)
      .multiplyScalar(1 / scale);
  return {
    start: toLocalAnchor(startWorld),
    end: toLocalAnchor(endWorld),
  };
}

function applyBallStickBaseRotation(baseAngle) {
  const pivotPosition = deviceToScene(BASE_LINK_PIVOT_MM);
  ballStickMotionRoot.position.copy(pivotPosition);
  ballStickMotionRoot.rotation.y = degToRad(baseAngle);
  ballStickRoot.position.copy(pivotPosition).multiplyScalar(-1);
}

function sceneToDevice(vector) {
  const deviceSceneVector = deviceSceneRoot.worldToLocal(vector.clone());
  return sceneToDevicePointData(deviceSceneVector, RENDER_SCALE);
}

function deviceSceneToDevice(vector) {
  return sceneToDevicePointData(vector, RENDER_SCALE);
}

function objectLocalToDeviceScene(object, localPoint) {
  object.updateWorldMatrix(true, false);
  return deviceSceneRoot.worldToLocal(object.localToWorld(localPoint.clone()));
}

function roundedWorldPoint(point) {
  return {
    x: Number(point.x.toFixed(2)),
    y: Number((point.y || 0).toFixed(2)),
    z: Number(point.z.toFixed(2)),
  };
}

function formatAngleValue(value, digits = 1) {
  return Number(value).toFixed(digits).replace(/\.0$/, "");
}

function verticalToolOffsetForState(candidate) {
  return clamp(candidate.arm1 - candidate.arm2 - candidate.arm3 + 90, LIMITS.offset.min, LIMITS.offset.max);
}

function applyToolVerticalConstraint() {
  if (!keepToolVertical) return;
  state.offset = verticalToolOffsetForState(state);
}

function makeSphere(point, radius, material, parent = ballStickRoot) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 16), material);
  mesh.position.copy(deviceToScene(point));
  parent.add(mesh);
  return mesh;
}

function makeRod(start, end, radius, material, parent = ballStickRoot) {
  const startVector = deviceToScene(start);
  const endVector = deviceToScene(end);
  const direction = endVector.clone().sub(startVector);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, Math.max(length, 0.0001), 18), material);
  mesh.position.copy(startVector.clone().add(endVector).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  parent.add(mesh);
  return mesh;
}

function makeGuideRod(startPoint, endPoint, radius, material, parent = staticGuideRoot) {
  const start = deviceToScene(startPoint);
  const end = deviceToScene(endPoint);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, Math.max(length, 0.0001), 18), material);
  mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  parent.add(mesh);
  return mesh;
}

function makeTextSprite(text, position, color = 0xf7f5f0, scale = 1) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "900 44px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2);
  const texture = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.position.copy(position);
  sprite.scale.set(1.05 * scale, 0.26 * scale, 1);
  return sprite;
}

function axisArrow(start, end, color, label) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const startVector = deviceToScene(start);
  const endVector = deviceToScene(end);
  makeGuideRod(start, end, 0.026, material, group);
  const direction = endVector.clone().sub(startVector).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 28), material);
  cone.position.copy(endVector).addScaledVector(direction, -0.12);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  group.add(cone);
  group.add(makeTextSprite(label, endVector.clone().add(new THREE.Vector3(0.22, 0.22, 0.22)), color, 1.05));
  return group;
}

function axisTicks() {
  const group = new THREE.Group();
  const matX = new THREE.MeshBasicMaterial({ color: 0xff5d5d, transparent: true, opacity: 0.82 });
  const matY = new THREE.MeshBasicMaterial({ color: 0x70a7ff, transparent: true, opacity: 0.82 });
  const matZ = new THREE.MeshBasicMaterial({ color: 0x4bd3a5, transparent: true, opacity: 0.82 });
  [-2000, -1000, 1000, 2000].forEach((value) => {
    makeGuideRod({ x: value, y: -140, z: 0 }, { x: value, y: 140, z: 0 }, 0.01, matX, group);
    makeGuideRod({ x: -140, y: value, z: 0 }, { x: 140, y: value, z: 0 }, 0.01, matY, group);
  });
  [500, 1500].forEach((value) => {
    makeGuideRod({ x: -140, y: 0, z: value }, { x: 140, y: 0, z: value }, 0.01, matZ, group);
  });
  return group;
}

function createWorldGuides() {
  const axisLength = 2125;
  staticGuideRoot.add(axisArrow({ x: 0, y: 0, z: 0 }, { x: axisLength, y: 0, z: 0 }, 0xff5d5d, "X+"));
  staticGuideRoot.add(axisArrow({ x: 0, y: 0, z: 0 }, { x: 0, y: axisLength, z: 0 }, 0x70a7ff, "Y+"));
  staticGuideRoot.add(axisArrow({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: axisLength }, 0x4bd3a5, "Z+"));
  staticGuideRoot.add(axisTicks());
  staticGuideRoot.add(makeTextSprite("GL-3DPRT-SP-S", deviceToScene({ x: -5200, y: 4900, z: 40 }), 0xf7f5f0, 1.25));
}

function createBaseLinkPivotGuide() {
  const pivotMaterial = new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.98, depthTest: false });
  const crossMaterial = new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.88, depthTest: false });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthTest: false });
  const pivotPosition = deviceToScene(BASE_LINK_PIVOT_MM);
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 18), pivotMaterial);
  pivot.position.copy(pivotPosition);
  pivot.renderOrder = 20;
  pivotGuideRoot.add(pivot);
  const pointFromPivot = (offset) => ({
    x: BASE_LINK_PIVOT_MM.x + offset.x,
    y: BASE_LINK_PIVOT_MM.y + offset.y,
    z: BASE_LINK_PIVOT_MM.z + offset.z,
  });
  [
    [pointFromPivot({ x: -360, y: 0, z: 0 }), pointFromPivot({ x: 360, y: 0, z: 0 })],
    [pointFromPivot({ x: 0, y: -360, z: 0 }), pointFromPivot({ x: 0, y: 360, z: 0 })],
    [pointFromPivot({ x: 0, y: 0, z: -360 }), pointFromPivot({ x: 0, y: 0, z: 360 })],
  ].forEach(([start, end]) => {
    const rod = makeGuideRod(start, end, 0.018, crossMaterial, pivotGuideRoot);
    rod.renderOrder = 19;
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 12, 96), ringMaterial);
  ring.position.copy(pivotPosition);
  ring.rotation.x = Math.PI / 2;
  ring.renderOrder = 18;
  pivotGuideRoot.add(ring);
  const label = makeTextSprite("base_link旋转中心 (118.258,0,0)", pivotPosition.clone().add(new THREE.Vector3(0.18, 0.52, 0.2)), 0xffd43b, 1.45);
  label.renderOrder = 21;
  label.material.depthTest = false;
  pivotGuideRoot.add(label);
}

function createArm1AnchorGuide() {
  const startMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b30, depthTest: false });
  const endMaterial = new THREE.MeshBasicMaterial({ color: 0x70a7ff, depthTest: false });
  const modelAnchorMaterial = new THREE.MeshBasicMaterial({ color: 0x34f5c5, depthTest: false });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, depthTest: false });
  const start = new THREE.Mesh(new THREE.SphereGeometry(0.105, 28, 16), startMaterial);
  const end = new THREE.Mesh(new THREE.SphereGeometry(0.105, 28, 16), endMaterial);
  const modelAnchor = new THREE.Mesh(new THREE.SphereGeometry(0.075, 28, 16), modelAnchorMaterial);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMaterial);
  start.renderOrder = 40;
  end.renderOrder = 40;
  modelAnchor.renderOrder = 41;
  line.renderOrder = 39;
  arm1AnchorGuideRoot.add(line, start, end, modelAnchor);
  return { start, end, modelAnchor, line };
}

function clearGroup(group) {
  group.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
  });
  group.clear();
}

function formatPoint(point, digits = 1) {
  return `(${point.x.toFixed(digits)}, ${(point.y || 0).toFixed(digits)}, ${point.z.toFixed(digits)})`;
}

function createControl(key) {
  const limit = LIMITS[key];
  const wrapper = document.createElement("section");
  wrapper.className = "control";
  wrapper.innerHTML = `
    <div class="control-head">
      <label for="${key}">${limit.label}</label>
      <output id="${key}Out">${state[key]}°</output>
    </div>
    <div class="range-line">
      <input id="${key}" type="range" min="${limit.min}" max="${limit.max}" step="1" value="${state[key]}" />
      <input class="number-input" id="${key}Number" type="number" min="${limit.min}" max="${limit.max}" step="1" value="${state[key]}" aria-label="${limit.label}" />
    </div>
    <div class="minmax"><span>${limit.min}°</span><span>${limit.max}°</span></div>
    ${key === "offset" ? `
      <label class="control-toggle">
        <input id="keepToolVertical" type="checkbox" ${keepToolVertical ? "checked" : ""} />
        <span>保持垂直</span>
      </label>
    ` : ""}
  `;
  controlRoot.appendChild(wrapper);
  const sync = (value) => {
    stopLinearSimulation();
    state[key] = Number(value);
    if (key !== "offset") applyToolVerticalConstraint();
    update();
  };
  wrapper.querySelector(`#${key}`).addEventListener("input", (event) => sync(event.target.value));
  wrapper.querySelector(`#${key}Number`).addEventListener("input", (event) => sync(event.target.value));
  if (key === "offset") {
    wrapper.querySelector("#keepToolVertical").addEventListener("change", (event) => {
      stopLinearSimulation();
      keepToolVertical = event.target.checked;
      applyToolVerticalConstraint();
      update();
    });
  }
}

function createStrokeControl(key) {
  const label = ACTUATOR_GROUPS[key].label;
  const strokeLimit = ACTUATOR_STROKE_LIMITS[key];
  const wrapper = document.createElement("section");
  wrapper.className = "control";
  wrapper.innerHTML = `
    <div class="control-head">
      <label for="${key}Stroke">${label}</label>
      <output id="${key}StrokeOut">0%</output>
    </div>
    <div class="range-line">
      <input id="${key}Stroke" type="range" min="0" max="100" step="1" value="0" />
      <input class="number-input" id="${key}StrokeNumber" type="number" min="0" max="100" step="1" value="0" aria-label="${label}" />
    </div>
    <div class="minmax"><span>${strokeLimit.minLength.toFixed(1)} mm</span><span>${strokeLimit.maxLength.toFixed(1)} mm</span></div>
  `;
  strokeRoot.appendChild(wrapper);
  const sync = (value) => {
    stopLinearSimulation();
    Object.assign(state, stateFromActuatorStrokes({ [key]: Number(value) / 100 }, state));
    applyToolVerticalConstraint();
    update();
  };
  wrapper.querySelector(`#${key}Stroke`).addEventListener("input", (event) => sync(event.target.value));
  wrapper.querySelector(`#${key}StrokeNumber`).addEventListener("input", (event) => sync(event.target.value));
}

function createStrokeBaseControl() {
  const limit = LIMITS.base;
  const wrapper = document.createElement("section");
  wrapper.className = "control";
  wrapper.innerHTML = `
    <div class="control-head">
      <label for="baseStrokeMode">${limit.label}</label>
      <output id="baseStrokeModeOut">${state.base}°</output>
    </div>
    <div class="range-line">
      <input id="baseStrokeMode" type="range" min="${limit.min}" max="${limit.max}" step="1" value="${state.base}" />
      <input class="number-input" id="baseStrokeModeNumber" type="number" min="${limit.min}" max="${limit.max}" step="1" value="${state.base}" aria-label="${limit.label}" />
    </div>
    <div class="minmax"><span>${limit.min}°</span><span>${limit.max}°</span></div>
  `;
  strokeRoot.appendChild(wrapper);
  const sync = (value) => {
    stopLinearSimulation();
    state.base = Number(value);
    update();
  };
  wrapper.querySelector("#baseStrokeMode").addEventListener("input", (event) => sync(event.target.value));
  wrapper.querySelector("#baseStrokeModeNumber").addEventListener("input", (event) => sync(event.target.value));
}

function createLinearControls() {
  linearMotion.startWorld = currentTipWorld();
  linearMotion.startState = { ...state };
  linearMotion.endWorld = roundedWorldPoint({ ...linearMotion.startWorld, x: linearMotion.startWorld.x + 800 });

  const wrapper = document.createElement("section");
  wrapper.className = "control linear-control";
  wrapper.innerHTML = `
    <div class="control-head">
      <label for="linearProgress">打印头路径</label>
      <output id="linearProgressOut">0%</output>
    </div>
    <div class="linear-path-grid">
      <div class="linear-point-card">
        <strong>起点</strong>
        <label>X <input id="linearStartX" type="number" step="10" value="${linearMotion.startWorld.x}" /></label>
        <label>Y <input id="linearStartY" type="number" step="10" value="${linearMotion.startWorld.y}" /></label>
        <label>Z <input id="linearStartZ" type="number" step="10" value="${linearMotion.startWorld.z}" /></label>
      </div>
      <div class="linear-point-card">
        <strong>终点</strong>
        <label>X <input id="linearEndX" type="number" step="10" value="${linearMotion.endWorld.x}" /></label>
        <label>Y <input id="linearEndY" type="number" step="10" value="${linearMotion.endWorld.y}" /></label>
        <label>Z <input id="linearEndZ" type="number" step="10" value="${linearMotion.endWorld.z}" /></label>
      </div>
    </div>
    <div class="linear-grid">
      <label>末端速度 mm/s <input id="linearSpeed" type="number" min="1" step="10" value="${linearMotion.speed}" /></label>
      <label>路径长度 <output id="linearPathDistance">0 mm</output></label>
      <label>预计时间 <output id="linearDurationEstimate">0.0 s</output></label>
      <label>求解误差 <output id="linearSolveError">0 mm</output></label>
    </div>
    <div class="linear-import-panel">
      <div class="linear-import-head">
        <strong>路径导入</strong>
        <label class="linear-file-button">
          <span>CSV / JSON</span>
          <input id="linearPathFile" type="file" accept=".csv,.json,text/csv,application/json" />
        </label>
      </div>
      <p class="coordinate-note">${COORDINATE_SYSTEM_NOTE}</p>
      <div class="linear-grid">
        <label>路径模式
          <select id="linearPathMode">
            <option value="interpolated">折线插值</option>
            <option value="points">路径点步进</option>
          </select>
        </label>
        <label>模拟点数 <output id="linearPathPointCount">0</output></label>
      </div>
      <output id="linearPathStatus" class="linear-path-status">${linearMotion.pathStatus}</output>
    </div>
    <div class="range-line">
      <input id="linearProgress" type="range" min="0" max="100" step="1" value="0" />
      <input class="number-input" id="linearProgressNumber" type="number" min="0" max="100" step="1" value="0" aria-label="线性进度" />
    </div>
    <div class="linear-actions">
      <button id="setLinearStart" type="button">当前设为起点</button>
      <button id="setLinearEnd" type="button">当前设为终点</button>
      <button id="clearLinearPath" type="button">清除导入路径</button>
      <button id="simulateLinearMotion" type="button">模拟</button>
    </div>
  `;
  linearRoot.appendChild(wrapper);

  [["startWorld", "Start"], ["endWorld", "End"]].forEach(([kind, label]) => {
    ["X", "Y", "Z"].forEach((axis) => {
      document.querySelector(`#linear${label}${axis}`).addEventListener("change", (event) => {
        stopLinearSimulation();
        linearMotion[kind][axis.toLowerCase()] = Number(event.target.value);
        if (kind === "startWorld") linearMotion.startState = null;
        syncLinearReadouts();
        runLinearMotion();
      });
    });
  });
  document.querySelector("#linearSpeed").addEventListener("change", (event) => {
    linearMotion.speed = Math.max(1, Number(event.target.value) || 1);
    event.target.value = linearMotion.speed;
    syncLinearReadouts();
  });
  document.querySelector("#linearPathMode").addEventListener("change", (event) => {
    stopLinearSimulation();
    linearMotion.pathMode = event.target.value === "points" ? "points" : "interpolated";
    runLinearMotion();
  });
  document.querySelector("#linearPathFile").addEventListener("change", onLinearPathFileSelected);
  document.querySelector("#linearProgress").addEventListener("input", (event) => setLinearProgress(event.target.value));
  document.querySelector("#linearProgressNumber").addEventListener("change", (event) => setLinearProgress(event.target.value));
  document.querySelector("#setLinearStart").addEventListener("click", () => setLinearPoint("startWorld", currentTipWorld()));
  document.querySelector("#setLinearEnd").addEventListener("click", () => setLinearPoint("endWorld", currentTipWorld()));
  document.querySelector("#clearLinearPath").addEventListener("click", clearImportedLinearPath);
  document.querySelector("#simulateLinearMotion").addEventListener("click", startLinearSimulation);
  syncLinearReadouts();
}

function currentTipWorld() {
  return roundedWorldPoint(worldDisplayedToolPointForState(state, TOOL_BALL_STICK_OFFSET_MM));
}

function verticalPoseState() {
  return clampState(applyPreset("calibration", DEFAULT_STATE));
}

function verticalPoseToolWorld() {
  return roundedWorldPoint(worldDisplayedToolPointForState(verticalPoseState(), TOOL_BALL_STICK_OFFSET_MM));
}

function importedLinearPathActive() {
  return Array.isArray(linearMotion.pathPoints) && linearMotion.pathPoints.length >= 2;
}

function activeLinearPathPoints() {
  if (importedLinearPathActive()) return linearMotion.pathPoints;
  return [linearMotion.startWorld, linearMotion.endWorld].filter(Boolean);
}

function segmentDistance(a, b) {
  return a && b ? distance(a, b) : 0;
}

function linearPathDistance() {
  return pathDistanceForPoints(activeLinearPathPoints());
}

function pathDistanceForPoints(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += segmentDistance(points[index - 1], points[index]);
  }
  return total;
}

function splitPathAtProgress(points, progress) {
  if (points.length < 2) return { walked: points.slice(), remaining: [], walkedDistance: 0 };
  const total = pathDistanceForPoints(points);
  if (total < 0.001) return { walked: [points[0]], remaining: points.slice(), walkedDistance: 0 };
  const targetDistance = total * clamp(progress / 100, 0, 1);
  let remainingDistance = total * clamp(progress / 100, 0, 1);
  let walkedDistance = 0;
  const walked = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = segmentDistance(start, end);
    if (remainingDistance >= length) {
      walked.push(end);
      remainingDistance -= length;
      walkedDistance += length;
      continue;
    }
    const localT = length < 0.001 ? 0 : clamp(remainingDistance / length, 0, 1);
    const current = roundedWorldPoint({
      x: start.x + (end.x - start.x) * localT,
      y: start.y + (end.y - start.y) * localT,
      z: start.z + (end.z - start.z) * localT,
    });
    if (segmentDistance(walked[walked.length - 1], current) > 0.001) walked.push(current);
    walkedDistance += length * localT;
    return { walked, remaining: [current, ...points.slice(index)], walkedDistance: Math.min(walkedDistance, targetDistance) };
  }
  return { walked, remaining: [points[points.length - 1]], walkedDistance: total };
}

function addPathLine(points, material, name, dashed = false) {
  if (points.length < 2) return 0;
  const vectors = points.map((point) => deviceToScene(point));
  let line;
  if (material.isLineMaterial) {
    const geometry = new LineGeometry();
    geometry.setPositions(vectors.flatMap((vector) => [vector.x, vector.y, vector.z]));
    line = new Line2(geometry, material);
  } else {
    const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
    line = new THREE.Line(geometry, material);
  }
  line.name = name;
  if (dashed) line.computeLineDistances();
  pathRoot.add(line);
  return points.length - 1;
}

function syncLinearPointInputs(kind) {
  const point = linearMotion[kind];
  const prefix = kind === "startWorld" ? "linearStart" : "linearEnd";
  ["X", "Y", "Z"].forEach((axis) => {
    const input = document.querySelector(`#${prefix}${axis}`);
    if (input) input.value = point[axis.toLowerCase()];
  });
}

function syncLinearReadouts(error = 0) {
  const progress = clamp(linearMotion.progress, 0, 100);
  document.querySelector("#linearProgress").value = Math.round(progress);
  document.querySelector("#linearProgressNumber").value = Math.round(progress);
  document.querySelector("#linearProgressOut").value = `${Math.round(progress)}%`;
  document.querySelector("#linearPathDistance").value = `${linearPathDistance().toFixed(0)} mm`;
  document.querySelector("#linearDurationEstimate").value = `${(linearPathDistance() / linearMotion.speed).toFixed(1)} s`;
  document.querySelector("#linearSolveError").value = `${error.toFixed(1)} mm`;
  document.querySelector("#simulateLinearMotion").textContent = linearMotion.isSimulating ? "停止" : "模拟";
  const modeSelect = document.querySelector("#linearPathMode");
  if (modeSelect) modeSelect.value = linearMotion.pathMode;
  const countOutput = document.querySelector("#linearPathPointCount");
  if (countOutput) countOutput.value = importedLinearPathActive() ? String(linearMotion.pathPoints.length) : "0";
  const statusOutput = document.querySelector("#linearPathStatus");
  if (statusOutput) statusOutput.value = linearMotion.pathStatus;
  drawLinearPath();
}

function setLinearPoint(kind, point) {
  if (importedLinearPathActive()) {
    linearMotion.pathPoints = null;
    linearMotion.pathSourceName = "";
    linearMotion.pathStatus = "已切回手动起终点路径";
  }
  linearMotion[kind] = roundedWorldPoint(point);
  if (kind === "startWorld") linearMotion.startState = { ...state };
  syncLinearPointInputs(kind);
  syncLinearReadouts();
}

function normalizePathPoint(rawPoint, index = 0) {
  let point;
  if (Array.isArray(rawPoint)) {
    point = { x: rawPoint[0], y: rawPoint[1], z: rawPoint[2] };
  } else if (rawPoint && typeof rawPoint === "object") {
    point = {
      x: rawPoint.x ?? rawPoint.X,
      y: rawPoint.y ?? rawPoint.Y,
      z: rawPoint.z ?? rawPoint.Z,
    };
  }
  const normalized = {
    x: Number(point?.x),
    y: Number(point?.y),
    z: Number(point?.z),
  };
  if (!Number.isFinite(normalized.x) || !Number.isFinite(normalized.y) || !Number.isFinite(normalized.z)) {
    throw new Error(`第 ${index + 1} 个路径点缺少有效 X/Y/Z`);
  }
  return roundedWorldPoint(normalized);
}

function parseJsonPathPoints(text) {
  const payload = JSON.parse(text);
  const rows = Array.isArray(payload) ? payload : payload.points ?? payload.path ?? payload.positions;
  if (!Array.isArray(rows)) throw new Error("JSON 需要是点数组，或包含 points/path/positions 数组");
  return rows.map((row, index) => normalizePathPoint(row, index));
}

function splitCsvLine(line) {
  return line
    .trim()
    .split(/[,\t; ]+/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function parseCsvPathPoints(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (!lines.length) return [];
  const first = splitCsvLine(lines[0]);
  const hasHeader = first.some((cell) => Number.isNaN(Number(cell)));
  const header = hasHeader ? first.map((cell) => cell.toLowerCase()) : ["x", "y", "z"];
  const xIndex = header.indexOf("x");
  const yIndex = header.indexOf("y");
  const zIndex = header.indexOf("z");
  if (xIndex < 0 || yIndex < 0 || zIndex < 0) throw new Error("CSV 表头需要包含 x,y,z");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line, index) => {
    const cells = splitCsvLine(line);
    return normalizePathPoint({ x: cells[xIndex], y: cells[yIndex], z: cells[zIndex] }, index);
  });
}

function uniqueAdjacentPathPoints(points) {
  return points.filter((point, index) => index === 0 || segmentDistance(points[index - 1], point) > 0.001);
}

function applyImportedLinearPath(points, sourceName = "") {
  const cleanPoints = uniqueAdjacentPathPoints(points);
  if (cleanPoints.length < 2) throw new Error("路径至少需要 2 个不同点");
  const simulationPoints = uniqueAdjacentPathPoints([verticalPoseToolWorld(), ...cleanPoints]);
  stopLinearSimulation();
  linearMotion.pathPoints = simulationPoints;
  linearMotion.pathSourceName = sourceName;
  linearMotion.pathStatus = `已导入 ${cleanPoints.length} 点，模拟路径 ${simulationPoints.length} 点${sourceName ? ` · ${sourceName}` : ""}`;
  linearMotion.startWorld = roundedWorldPoint(simulationPoints[0]);
  linearMotion.endWorld = roundedWorldPoint(simulationPoints[simulationPoints.length - 1]);
  linearMotion.startState = verticalPoseState();
  linearMotion.progress = 0;
  syncLinearPointInputs("startWorld");
  syncLinearPointInputs("endWorld");
  runLinearMotion({ resetToStartState: true });
}

function parseLinearPathFile(file, text) {
  const name = file?.name || "";
  if (/\.json$/i.test(name) || /^\s*[\[{]/.test(text)) return parseJsonPathPoints(text);
  return parseCsvPathPoints(text);
}

async function onLinearPathFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    applyImportedLinearPath(parseLinearPathFile(file, text), file.name);
  } catch (error) {
    stopLinearSimulation();
    linearMotion.pathStatus = `导入失败：${error?.message || error}`;
    syncLinearReadouts();
  } finally {
    event.target.value = "";
  }
}

async function loadDefaultImportedLinearPath() {
  try {
    setDriveMode("linear");
    const response = await fetch(DEFAULT_IMPORTED_PATH_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    applyImportedLinearPath(parseCsvPathPoints(text), DEFAULT_IMPORTED_PATH_NAME);
  } catch (error) {
    linearMotion.pathStatus = `默认路径导入失败：${error?.message || error}`;
    syncLinearReadouts();
  }
}

function clearImportedLinearPath() {
  stopLinearSimulation();
  linearMotion.pathPoints = null;
  linearMotion.pathSourceName = "";
  linearMotion.pathStatus = "未导入路径文件";
  linearMotion.progress = 0;
  syncLinearReadouts();
  runLinearMotion();
}

function pointAtLinearProgress(points, progress) {
  if (!points.length) return currentTipWorld();
  if (points.length === 1) return roundedWorldPoint(points[0]);
  const t = clamp(progress / 100, 0, 1);
  if (linearMotion.pathMode === "points") {
    const index = clamp(Math.round(t * (points.length - 1)), 0, points.length - 1);
    return roundedWorldPoint(points[index]);
  }
  const total = linearPathDistance();
  if (total < 0.001) return roundedWorldPoint(points[0]);
  let remaining = total * t;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = segmentDistance(start, end);
    if (remaining <= length || index === points.length - 1) {
      const localT = length < 0.001 ? 0 : clamp(remaining / length, 0, 1);
      return roundedWorldPoint({
        x: start.x + (end.x - start.x) * localT,
        y: start.y + (end.y - start.y) * localT,
        z: start.z + (end.z - start.z) * localT,
      });
    }
    remaining -= length;
  }
  return roundedWorldPoint(points[points.length - 1]);
}

function linearTargetFromProgress() {
  return pointAtLinearProgress(activeLinearPathPoints(), linearMotion.progress);
}

function displayedLinearTargetFromProgress() {
  return linearTargetFromProgress();
}

function runLinearMotion({ resetToStartState = false } = {}) {
  if (resetToStartState && linearMotion.startState) {
    Object.assign(state, clampState(linearMotion.startState));
  }
  if (importedLinearPathActive() && linearMotion.startState && linearMotion.progress <= 0.001) {
    Object.assign(state, clampState(linearMotion.startState));
    update(0);
    return;
  }
  const solved = solveStateForWorldDisplayedToolTarget(linearTargetFromProgress(), state, TOOL_BALL_STICK_OFFSET_MM);
  Object.assign(state, solved.state);
  applyToolVerticalConstraint();
  update(solved.error);
}

function setLinearProgress(value) {
  stopLinearSimulation();
  linearMotion.progress = clamp(Number(value), 0, 100);
  runLinearMotion({ resetToStartState: importedLinearPathActive() });
}

function stopLinearSimulation() {
  if (linearMotion.animationFrame) cancelAnimationFrame(linearMotion.animationFrame);
  linearMotion.animationFrame = null;
  linearMotion.isSimulating = false;
  const button = document.querySelector("#simulateLinearMotion");
  if (button) button.textContent = "模拟";
}

function startLinearSimulation() {
  if (linearMotion.isSimulating) {
    stopLinearSimulation();
    return;
  }
  const pathDistance = linearPathDistance();
  if (pathDistance < 0.001) return;
  if (linearMotion.startState) Object.assign(state, clampState(linearMotion.startState));
  linearMotion.progress = 0;
  runLinearMotion();
  linearMotion.startedAt = performance.now();
  linearMotion.isSimulating = true;
  const durationMs = Math.max(1, (pathDistance / linearMotion.speed) * 1000);
  const step = (now) => {
    if (!linearMotion.isSimulating) return;
    linearMotion.progress = clamp(((now - linearMotion.startedAt) / durationMs) * 100, 0, 100);
    runLinearMotion();
    if (linearMotion.progress < 100) {
      linearMotion.animationFrame = requestAnimationFrame(step);
    } else {
      stopLinearSimulation();
    }
  };
  linearMotion.animationFrame = requestAnimationFrame(step);
}

function drawLinearPath() {
  clearGroup(pathRoot);
  linearDragHandle = null;
  pathRenderStats = { walkedSegments: 0, remainingSegments: 0, mode: "none" };
  const points = activeLinearPathPoints();
  if (points.length < 2) return;
  if (importedLinearPathActive()) {
    const split = splitPathAtProgress(points, linearMotion.progress);
    const remainingDashOffset = split.walkedDistance * RENDER_SCALE;
    materials.remainingPath.dashOffset = remainingDashOffset;
    pathRenderStats = {
      walkedSegments: addPathLine(split.walked, materials.walkedPath, "walkedPath", false),
      remainingSegments: addPathLine(split.remaining, materials.remainingPath, "remainingPath", true),
      mode: "progress",
      lineRenderer: "fat-line",
      lineWidthPx: IMPORTED_PATH_LINE_WIDTH_PX,
      remainingLineWidthPx: IMPORTED_REMAINING_PATH_LINE_WIDTH_PX,
      remainingOpacity: IMPORTED_REMAINING_PATH_OPACITY,
      remainingDashOffset,
    };
  } else {
    pathRenderStats = {
      walkedSegments: addPathLine(points, materials.path, "manualPath", false),
      remainingSegments: 0,
      mode: "manual",
      lineRenderer: "thin-line",
      lineWidthPx: 1,
    };
  }
  if (importedLinearPathActive()) {
    pathRenderStats.pointMarkers = 0;
    return;
  }
  points.forEach((point, index) => {
    makeSphere(point, index === 0 || index === points.length - 1 ? 0.055 : 0.032, materials.joint, pathRoot);
  });
  makeSphere(points[0], 0.06, materials.joint, pathRoot);
  makeSphere(points[points.length - 1], 0.06, materials.tool, pathRoot);
  pathRenderStats.pointMarkers = points.length + 2;
}

function updatePointerNdc(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
}

function scenePointForDisplayedTool(point) {
  ballStickMotionRoot.updateWorldMatrix(true, true);
  ballStickRoot.updateWorldMatrix(true, true);
  return ballStickRoot.localToWorld(deviceToScene(point));
}

function worldPointFromScene(scenePoint) {
  return roundedWorldPoint(sceneToDevice(scenePoint));
}

function updateTipDragHandle(pose) {
  const scenePoint = scenePointForDisplayedTool(displayedToolPoint(pose.toolCenter));
  tipDragHandle.position.copy(scenePoint);
  linearDrag.handleWorld = worldPointFromScene(scenePoint);
}

function linearHandleHit(event) {
  updatePointerNdc(event);
  raycaster.setFromCamera(pointerNdc, camera);
  tipDragHandle.updateWorldMatrix(true, false);
  return raycaster.intersectObject(tipDragHandle, false)[0] ?? null;
}

function linearPointFromDragEvent(event) {
  updatePointerNdc(event);
  raycaster.setFromCamera(pointerNdc, camera);
  if (!raycaster.ray.intersectPlane(linearDragPlane, linearDragIntersection)) return null;
  linearDragIntersection.add(linearDrag.dragOffset);
  return worldPointFromScene(linearDragIntersection);
}

function setLinearDraggedTarget(worldPoint) {
  if (!linearMotion.startWorld) return;
  stopLinearSimulation();
  if (importedLinearPathActive()) {
    linearMotion.pathPoints = null;
    linearMotion.pathSourceName = "";
    linearMotion.pathStatus = "已切回拖拽终点路径";
  }
  const targetWorld = roundedWorldPoint(worldPoint);
  const solved = solveStateForWorldDisplayedToolTarget(targetWorld, state, TOOL_BALL_STICK_OFFSET_MM);
  Object.assign(state, solved.state);
  applyToolVerticalConstraint();
  linearMotion.endWorld = targetWorld;
  linearMotion.progress = 100;
  linearDrag.lastWorld = linearMotion.endWorld;
  linearDrag.lastRawDisplayWorld = targetWorld;
  linearDrag.lastDisplayWorld = targetWorld;
  syncLinearPointInputs("endWorld");
  update(solved.error);
}

function updateLinearDragCursor(event) {
  if (linearDrag.active) return;
  const isHovering = Boolean(linearHandleHit(event));
  linearDrag.hovering = isHovering;
  renderer.domElement.style.cursor = isHovering ? "grab" : "";
}

function onLinearDragPointerDown(event) {
  if (event.button !== 0) return;
  const hit = linearHandleHit(event);
  if (!hit) return;
  event.preventDefault();
  stopLinearSimulation();
  linearDrag.active = true;
  linearDrag.pointerId = event.pointerId;
  linearDrag.lastWorld = linearTargetFromProgress();
  linearDrag.lastDisplayWorld = displayedLinearTargetFromProgress();
  orbit.enabled = false;
  renderer.domElement.style.cursor = "grabbing";
  const planeNormal = camera.getWorldDirection(new THREE.Vector3()).normalize();
  linearDragPlane.setFromNormalAndCoplanarPoint(planeNormal, tipDragHandle.position);
  updatePointerNdc(event);
  raycaster.setFromCamera(pointerNdc, camera);
  if (raycaster.ray.intersectPlane(linearDragPlane, linearDragIntersection)) {
    linearDrag.dragOffset.copy(tipDragHandle.position).sub(linearDragIntersection);
  } else {
    linearDrag.dragOffset.set(0, 0, 0);
  }
  renderer.domElement.setPointerCapture?.(event.pointerId);
}

function onLinearDragPointerMove(event) {
  if (!linearDrag.active) {
    updateLinearDragCursor(event);
    return;
  }
  if (event.pointerId !== linearDrag.pointerId) return;
  event.preventDefault();
  const point = linearPointFromDragEvent(event);
  if (point) setLinearDraggedTarget(point);
}

function stopLinearDrag(event) {
  if (!linearDrag.active) return;
  if (event?.pointerId !== undefined && event.pointerId !== linearDrag.pointerId) return;
  const pointerId = linearDrag.pointerId;
  linearDrag.active = false;
  linearDrag.pointerId = null;
  orbit.enabled = true;
  renderer.domElement.style.cursor = linearDrag.hovering ? "grab" : "";
  if (pointerId !== null) renderer.domElement.releasePointerCapture?.(pointerId);
}

function createPresets() {
  Object.entries(PRESETS).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.className = "preset-button";
    button.type = "button";
    button.innerHTML = `<strong>${preset.label}</strong><span>${preset.values.arm1} / ${preset.values.arm2} / ${preset.values.arm3} / ${preset.values.offset} / ${preset.values.base}</span>`;
    button.addEventListener("click", () => {
      stopLinearSimulation();
      if (preset.keepToolVertical !== undefined) keepToolVertical = Boolean(preset.keepToolVertical);
      Object.assign(state, applyPreset(key, state));
      applyToolVerticalConstraint();
      update();
    });
    presetRoot.appendChild(button);
  });
}

function createMetrics() {
  controlKeys.forEach((key) => {
    const metric = document.createElement("div");
    metric.className = "metric";
    metric.id = `${key}Metric`;
    metric.innerHTML = `<div><span>${LIMITS[key].label}</span><strong>0°</strong></div><div class="bar"><span></span></div>`;
    metricsRoot.appendChild(metric);
  });
}

function setControlValue(key, value) {
  const rounded = Math.round(value);
  const range = document.querySelector(`#${key}`);
  const number = document.querySelector(`#${key}Number`);
  range.value = rounded;
  number.value = rounded;
  if (key === "offset") {
    range.disabled = keepToolVertical;
    number.disabled = keepToolVertical;
    const toggle = document.querySelector("#keepToolVertical");
    if (toggle) toggle.checked = keepToolVertical;
  }
  document.querySelector(`#${key}Out`).value = `${rounded}°`;
}

function setStrokeValue(key, value) {
  const rounded = Math.round(value * 100);
  document.querySelector(`#${key}Stroke`).value = rounded;
  document.querySelector(`#${key}StrokeNumber`).value = rounded;
  document.querySelector(`#${key}StrokeOut`).value = `${rounded}%`;
}

function setStrokeBaseValue(value) {
  const rounded = Math.round(value);
  document.querySelector("#baseStrokeMode").value = rounded;
  document.querySelector("#baseStrokeModeNumber").value = rounded;
  document.querySelector("#baseStrokeModeOut").value = `${rounded}°`;
}

function updateMetrics(pose) {
  controlKeys.forEach((key) => {
    const metric = document.querySelector(`#${key}Metric`);
    const percent = ((pose[key] - LIMITS[key].min) / (LIMITS[key].max - LIMITS[key].min || 1)) * 100;
    metric.querySelector("strong").textContent = `${Math.round(pose[key])}°`;
    metric.querySelector(".bar span").style.width = `${percent}%`;
  });
  document.querySelector("#chainReadout").textContent = `${formatAngleValue(pose.arm1)} / ${formatAngleValue(pose.arm2)} / ${formatAngleValue(pose.arm3)} / ${formatAngleValue(pose.offset)} / ${formatAngleValue(pose.base)}`;
  const displayedTip = worldDisplayedToolPointForState(pose, TOOL_BALL_STICK_OFFSET_MM);
  document.querySelector("#tipReadout").textContent = `${displayedTip.x.toFixed(0)} / ${displayedTip.y.toFixed(0)} / ${displayedTip.z.toFixed(0)} mm`;
  document.querySelector("#totalArmAngle").textContent = `${pose.totalArmAngle}°`;
  document.querySelector("#couplerAngle").textContent = `${pose.couplerAngle}°`;
  document.querySelector("#baseAngle").textContent = `${pose.baseAngle}°`;
  document.querySelector("#baseLinkPivotReadout").textContent = `${BASE_LINK_PIVOT_MM.x.toFixed(3)} / ${BASE_LINK_PIVOT_MM.y.toFixed(0)} / ${BASE_LINK_PIVOT_MM.z.toFixed(0)} mm`;
  document.querySelector("#arm1Length").textContent = `${pose.armLengths.arm1.toFixed(3)} mm`;
  document.querySelector("#arm2Length").textContent = `${pose.armLengths.arm2.toFixed(3)} mm`;
  document.querySelector("#arm3Length").textContent = `${pose.armLengths.arm3.toFixed(3)} mm`;
  document.querySelector("#toolLength").textContent = `${TOOL_LENGTH_MM.toFixed(3)} mm`;
  document.querySelector("#totalAxisLength").textContent = `${pose.totalAxisDistance.toFixed(3)} mm`;
  strokeKeys.forEach((key) => {
    const actuator = pose.actuators[key];
    const strokeText = `${Math.round(actuator.stroke * 100)}%`;
    const stateText = actuator.withinStroke ? "" : " · 越界";
    document.querySelector(`#${key}Actuator`).textContent =
      `${actuator.instances[0].length.toFixed(1)} mm · ${strokeText} · ${actuator.count} 根${stateText}`;
  });
  document.querySelector("#jointReadout").textContent = pose.joints.map((joint) => formatPoint(joint, 1)).join(" | ");
  document.querySelector("#linkAReadout").textContent = `${pose.linkages.A.instances[0].link1Length.toFixed(1)} / ${pose.linkages.A.instances[0].link2Length.toFixed(1)} mm`;
  document.querySelector("#linkBReadout").textContent = `${pose.linkages.B.instances[0].link1Length.toFixed(1)} / ${pose.linkages.B.instances[0].link2Length.toFixed(1)} mm`;
}

function drawPose(pose) {
  clearGroup(ballStickRoot);
  applyBallStickBaseRotation(pose.baseAngle);
  if (!actuatorBallStickOnly && SHOW_BALL_STICK_BASE) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.58, 0.22, 42), materials.base);
    base.position.copy(deviceToScene({ x: JOINTS.baseArm1.x, y: 0, z: 0 }));
    ballStickRoot.add(base);
  }
  if (!actuatorBallStickOnly) {
    pose.segments.forEach((segment) => {
      const start = segment.key === "tool" ? offsetPoint(segment.start, TOOL_BALL_STICK_OFFSET_MM) : segment.start;
      const end = segment.key === "tool" ? offsetPoint(segment.end, TOOL_BALL_STICK_OFFSET_MM) : segment.end;
      makeRod(start, end, segment.key === "tool" ? 0.035 : 0.075, materials[segment.key]);
    });
    pose.joints.forEach((joint, index) => makeSphere(joint, index === 0 ? 0.13 : 0.105, materials.joint));
    makeSphere(offsetPoint(pose.toolCenter, TOOL_BALL_STICK_OFFSET_MM), 0.08, materials.tool);
  }
  Object.values(pose.actuators).forEach((actuator) => {
    actuator.instances.forEach((instance) => {
      makeRod(instance.tail, instance.front, 0.025, materials.actuator);
      makeSphere(instance.tail, 0.045, materials.actuatorDark);
      makeSphere(instance.front, 0.045, materials.actuatorDark);
    });
  });
  if (!actuatorBallStickOnly) {
    Object.values(pose.linkages).forEach((linkage) => {
      linkage.instances.forEach((instance) => {
        if (instance.drawLink1 !== false) {
          makeRod(instance.common, instance.link1Anchor, 0.021, materials.linkage);
          makeSphere(instance.common, 0.052, materials.linkage);
          makeSphere(instance.link1Anchor, 0.04, materials.linkage);
        }
        if (instance.drawLink2 !== false) {
          makeRod(instance.common, instance.link2Anchor, 0.021, materials.linkage);
          makeSphere(instance.common, 0.052, materials.linkage);
          makeSphere(instance.link2Anchor, 0.04, materials.linkage);
        }
      });
    });
  }
}

function removeSolidGlbEdges(object) {
  const edges = [];
  object.traverse((child) => {
    if (child.userData?.[SOLID_GLB_EDGE_MARKER]) {
      edges.push(child);
    }
  });
  edges.forEach((edge) => {
    edge.parent?.remove(edge);
    edge.geometry?.dispose?.();
    edge.material?.dispose?.();
  });
}

function makeSolidGlbEdges(mesh) {
  if (!solidGlbEdgeProfile.drawEdges || !mesh.geometry?.attributes?.position) return null;
  const vertexCount = mesh.geometry.attributes.position.count;
  if (vertexCount > solidGlbEdgeProfile.edgeVertexLimit) return null;
  const geometry = new THREE.EdgesGeometry(mesh.geometry, solidGlbEdgeProfile.edgeThreshold);
  const material = new THREE.LineBasicMaterial({
    color: solidGlbEdgeProfile.edge,
    transparent: true,
    opacity: solidGlbEdgeProfile.edgeOpacity,
    depthTest: solidGlbEdgeProfile.edgeDepthTest,
    depthWrite: false,
  });
  const edge = new THREE.LineSegments(geometry, material);
  edge.userData[SOLID_GLB_EDGE_MARKER] = true;
  edge.renderOrder = 1;
  return edge;
}

function makeGlbMaterial(controller) {
  if (modelEffect === "transparent") {
    return glbMaterials.transparent.clone();
  }
  return glbMaterials.solid({ tool: controller?.key === "tool" });
}

function applyModelEffect(controller) {
  const object = controller.group;
  removeSolidGlbEdges(object);
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.material = makeGlbMaterial(controller);
    child.castShadow = false;
    child.receiveShadow = false;
    if (modelEffect === "solid") {
      const edge = makeSolidGlbEdges(child);
      if (edge) child.add(edge);
    }
  });
}

function refreshModelEffects() {
  Object.values(modelControllers).forEach((controller) => {
    if (!controller.loaded) return;
    applyModelEffect(controller);
  });
}

function frameModel(controller) {
  const box = new THREE.Box3().setFromObject(controller.group);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.62;
  orbit.target.copy(center);
  camera.position.copy(center.clone().add(new THREE.Vector3(radius * 0.92, radius * 0.7, radius * 1.12)));
  camera.near = Math.max(0.02, radius / 250);
  camera.far = Math.max(85, radius * 8);
  camera.updateProjectionMatrix();
  orbit.update();
}

function contentFrameBox() {
  const box = new THREE.Box3();
  const candidateBox = new THREE.Box3();
  const targets = [fixedModelRoot, modelRoot, ballStickMotionRoot, pathRoot, tipDragHandle];
  targets.forEach((object) => {
    if (!object.visible) return;
    object.updateWorldMatrix(true, true);
    candidateBox.setFromObject(object);
    if (!candidateBox.isEmpty()) box.union(candidateBox);
  });
  if (box.isEmpty()) {
    box.setFromCenterAndSize(new THREE.Vector3(0, 1.8, 0), new THREE.Vector3(7, 4.5, 4.5));
  }
  return box;
}

function fitCameraToBox(direction, up, padding = 1.35) {
  const box = contentFrameBox();
  const center = box.getCenter(new THREE.Vector3());
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
  const viewDir = direction.clone().normalize();
  const viewUp = up.clone().normalize();
  const viewRight = new THREE.Vector3().crossVectors(viewUp, viewDir).normalize();
  let halfWidth = 0.001;
  let halfHeight = 0.001;
  let halfDepth = 0.001;
  corners.forEach((corner) => {
    const offset = corner.clone().sub(center);
    halfWidth = Math.max(halfWidth, Math.abs(offset.dot(viewRight)));
    halfHeight = Math.max(halfHeight, Math.abs(offset.dot(viewUp)));
    halfDepth = Math.max(halfDepth, Math.abs(offset.dot(viewDir)));
  });
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(0.1, camera.aspect));
  const distance = Math.max(
    halfHeight / Math.tan(verticalFov / 2),
    halfWidth / Math.tan(horizontalFov / 2),
  ) * padding + halfDepth;
  orbit.target.copy(center);
  camera.up.copy(viewUp);
  camera.position.copy(center.clone().add(viewDir.multiplyScalar(Math.max(4, distance))));
  camera.lookAt(center);
  camera.near = Math.max(0.02, distance / 800);
  camera.far = Math.max(85, distance * 8);
  camera.updateProjectionMatrix();
  orbit.update();
}

function gzipBase64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}

function loadFallbackScript(controller) {
  return new Promise((resolve, reject) => {
    if (window.__LINGZHU_MODELS__?.[controller.fallbackKey]) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    const url = new URL(controller.fallbackPath, window.location.href);
    url.searchParams.set("v", SCRIPT_VERSION);
    script.src = url.href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`fallback load failed: ${controller.fallbackPath}`));
    document.head.appendChild(script);
  });
}

async function loadModel(controller) {
  const parent = controller.follows ? modelRoot : fixedModelRoot;
  parent.add(controller.group);
  const status = document.querySelector(`#${controller.key}ModelStatus`);
  try {
    let buffer;
    if (window.location.protocol === "file:") {
      await loadFallbackScript(controller);
      buffer = await gzipBase64ToArrayBuffer(window.__LINGZHU_MODELS__[controller.fallbackKey]);
      controller.stats.source = "embedded-js";
    } else {
      const url = new URL(controller.glbPath, window.location.href);
      url.searchParams.set("v", SCRIPT_VERSION);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`model fetch failed ${response.status}: ${controller.glbPath}`);
      buffer = await response.arrayBuffer();
      controller.stats.source = controller.glbPath;
    }
    controller.stats.bytes = buffer.byteLength;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await new Promise((resolve, reject) => loader.parse(buffer, "", resolve, reject));
    controller.model.add(gltf.scene);
    applyModelEffect(controller);
    controller.loaded = true;
    controller.childCount = controller.model.children.length;
    if (status) status.textContent = "已加载";
    update();
    if (!hasFramedInitialModel) hasFramedInitialModel = true;
    return;
  } catch (error) {
    controller.error = error.message || String(error);
    window.__lingzhuModelLoadErrors.push({ key: controller.key, error: controller.error });
    if (status) status.textContent = "未加载";
  }
  update();
}

function applyControllerTransform(controller, pose) {
  const s = controller.state;
  controller.group.visible = s.visible;
  const basePosition = new THREE.Vector3(s.x * RENDER_SCALE, s.z * RENDER_SCALE, s.y * RENDER_SCALE);
  const pivotPosition = deviceToScene(controller.pivotPoint);
  const target = controller.pivot === "origin" ? controller.model : controller.group;
  controller.group.position.copy(controller.pivot === "origin" ? pivotPosition : new THREE.Vector3(0, 0, 0));
  controller.group.rotation.set(0, 0, 0);
  controller.group.quaternion.identity();
  controller.group.scale.setScalar(1);
  target.position.copy(controller.pivot === "origin" ? basePosition.clone().sub(pivotPosition) : basePosition);
  target.quaternion.copy(deviceRotationQuaternion(s.rx, s.ry, s.rz));
  const unitScale = s.unitScale ?? RENDER_SCALE;
  const scale = Math.max(0.001, s.scale) * unitScale;
  target.scale.setScalar(scale);
  const follows = controller.follows;
  if (follows === "base") {
    const angleDelta = degToRad(pose.baseAngle - DEFAULT_STATE.base);
    if (controller.pivot === "origin") {
      controller.group.rotation.y = angleDelta;
    } else {
      target.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleDelta);
      target.quaternion.premultiply(deviceAxisQuaternion(SCENE_AXIS_FOR_DEVICE_Z, angleDelta));
    }
  }
  if (controller.actuatorFollow) {
    const modelQuaternion = deviceRotationQuaternion(s.rx, s.ry, s.rz);
    if (applyActuatorFollow(controller, pose, null, modelQuaternion, scale)) return;
  }
  if (controller.linkageFollow) {
    const modelQuaternion = deviceRotationQuaternion(s.rx, s.ry, s.rz);
    if (applyLinkageFollow(controller, pose, modelQuaternion, scale)) return;
  }
  if (follows && follows !== "base" && pose.segments.some((segment) => segment.key === follows)) {
    const segment = pose.segments.find((item) => item.key === follows);
    const anchor = follows === "tool" ? segment.start : segment.start;
    if (controller.referencePoseFollow) {
      const baseAngleDelta = degToRad(pose.baseAngle - DEFAULT_STATE.base);
      const baseQuaternion = deviceAxisQuaternion(SCENE_AXIS_FOR_DEVICE_Z, baseAngleDelta);
      const modelQuaternion = deviceRotationQuaternion(s.rx, s.ry, s.rz);
      const referenceAngle = controller.followReferenceAngle ?? DEFAULT_STATE[follows] ?? 0;
      const angleDelta = degToRad((segment.angle - referenceAngle) * controller.jointRotationSign);
      const localQuaternion = deviceAxisQuaternion(SCENE_AXIS_FOR_DEVICE_Y, angleDelta).multiply(modelQuaternion);
      const finalQuaternion = baseQuaternion.clone().multiply(localQuaternion);
      const targetWorld = ballStickWorldPoint(anchor, pose);
      const rootOffset = anchorOffsetVector(controller, finalQuaternion, scale);
      controller.group.position.set(0, 0, 0);
      controller.group.quaternion.identity();
      controller.group.scale.setScalar(1);
      controller.model.position.copy(targetWorld.clone().sub(rootOffset));
      controller.model.quaternion.copy(finalQuaternion);
      controller.model.scale.setScalar(scale);
      controller.model.updateWorldMatrix(true, true);
      const actualAnchorWorld = objectLocalToDeviceScene(controller.model, anchorLocalPointForWorld(controller, scale));
      const correction = targetWorld.clone().sub(actualAnchorWorld);
      controller.model.position.add(correction);
      controller.model.updateWorldMatrix(true, true);
      controller.lastAnchorCorrectionWorld = deviceSceneToDevice(correction);
      controller.lastModelAnchorWorld = deviceSceneToDevice(objectLocalToDeviceScene(controller.model, anchorLocalPointForWorld(controller, scale)));
      controller.lastTargetAnchorWorld = deviceSceneToDevice(targetWorld);
      return;
    }
    if (controller.twoPointAnchors && !controller.editAnchorsOnly) {
      const basePivot = deviceToScene(BASE_LINK_PIVOT_MM);
      const baseAngleDelta = degToRad(pose.baseAngle - DEFAULT_STATE.base);
      const startPosition = deviceToScene(segment.start);
      const endPosition = deviceToScene(segment.end);
      const modelQuaternion = deviceRotationQuaternion(s.rx, s.ry, s.rz);
      const scale = Math.max(0.001, s.scale) * (s.unitScale ?? RENDER_SCALE);
      const localStart = controller.twoPointAnchors.start.clone();
      const localEnd = controller.twoPointAnchors.end.clone();
      const localVector = localEnd.clone().sub(localStart).applyQuaternion(modelQuaternion).normalize();
      const targetVector = endPosition.clone().sub(startPosition).normalize();
      const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(localVector, targetVector);
      const finalQuaternion = alignQuaternion.multiply(modelQuaternion);
      const startOffset = localStart.multiplyScalar(scale).applyQuaternion(finalQuaternion);
      controller.group.position.copy(basePivot);
      controller.group.quaternion.copy(deviceAxisQuaternion(SCENE_AXIS_FOR_DEVICE_Z, baseAngleDelta));
      controller.group.scale.setScalar(1);
      controller.model.position.copy(startPosition.sub(basePivot).sub(startOffset));
      controller.model.quaternion.copy(finalQuaternion);
      controller.model.scale.setScalar(scale);
      return;
    }
    if (controller.followPlane === "yz") {
      const referenceAngle = controller.followReferenceAngle ?? DEFAULT_STATE[follows] ?? 0;
      const angleDelta = degToRad(referenceAngle - segment.angle);
      const referenceOffset = basePosition.clone().sub(anchorPosition);
      const modelQuaternion = deviceRotationQuaternion(s.rx, s.ry, s.rz);
      controller.group.position.copy(anchorPosition);
      controller.group.quaternion.copy(deviceAxisQuaternion(SCENE_AXIS_FOR_DEVICE_Y, angleDelta));
      controller.group.scale.setScalar(1);
      if (controller.anchorLocal) {
        const anchorOffset = anchorOffsetVector(controller, modelQuaternion, scale);
        controller.model.position.copy(anchorOffset.multiplyScalar(-1));
      } else {
        controller.model.position.copy(referenceOffset);
      }
      controller.model.quaternion.copy(modelQuaternion);
      controller.model.scale.setScalar(scale);
    } else {
      target.position.add(anchorPosition);
      target.quaternion.premultiply(deviceAxisQuaternion(SCENE_AXIS_FOR_DEVICE_Z, degToRad(segment.angle)));
    }
  }
}

function bindModelControls(controller) {
  const prefix = `${controller.key}Model`;
  const visible = document.querySelector(`#${prefix}Visible`);
  if (visible) {
    visible.checked = controller.state.visible;
    visible.addEventListener("change", (event) => {
      controller.state.visible = event.target.checked;
      update();
    });
  }
  [["X", "x"], ["Y", "y"], ["Z", "z"], ["Rx", "rx"], ["Ry", "ry"], ["Rz", "rz"], ["Scale", "scale"]].forEach(([suffix, key]) => {
    const input = document.querySelector(`#${prefix}${suffix}`);
    if (!input) return;
    input.value = controller.state[key];
    input.disabled = controller.locked;
    input.addEventListener("input", (event) => {
      if (controller.locked) return;
      controller.state[key] = Number(event.target.value);
      update();
    });
  });
  const resetButton = document.querySelector(`#${prefix}Reset`);
  if (resetButton && controller.locked) {
    resetButton.disabled = true;
    resetButton.title = "模型坐标已锁定";
  }
  resetButton?.addEventListener("click", () => {
    if (controller.locked) return;
    controller.state = { ...controller.homeState };
    bindModelControlValues(controller);
    update();
  });
}

function bindModelControlValues(controller) {
  const prefix = `${controller.key}Model`;
  [["X", "x"], ["Y", "y"], ["Z", "z"], ["Rx", "rx"], ["Ry", "ry"], ["Rz", "rz"], ["Scale", "scale"]].forEach(([suffix, key]) => {
    const input = document.querySelector(`#${prefix}${suffix}`);
    if (input) input.value = controller.state[key];
  });
  const visible = document.querySelector(`#${prefix}Visible`);
  if (visible) visible.checked = controller.state.visible;
}

function updateArm1AnchorGuide() {
  if (!SHOW_ARM1_ANCHOR_GUIDE) {
    arm1AnchorGuideRoot.visible = false;
    return;
  }
  const controller = modelControllers.arm1;
  const segment = currentPose.segments.find((item) => item.key === "arm1");
  if (!controller || !controller.state.visible || !segment) {
    arm1AnchorGuideRoot.visible = false;
    return;
  }
  ballStickMotionRoot.updateWorldMatrix(true, true);
  ballStickRoot.updateWorldMatrix(true, true);
  const start = objectLocalToDeviceScene(ballStickRoot, deviceToScene(segment.start));
  const end = objectLocalToDeviceScene(ballStickRoot, deviceToScene(segment.end));
  arm1AnchorGuideRoot.visible = true;
  arm1AnchorGuide.start.position.copy(start);
  arm1AnchorGuide.end.position.copy(end);
  arm1AnchorGuide.line.geometry.setFromPoints([start, end]);
  if (controller.anchorLocal) {
    controller.model.updateWorldMatrix(true, true);
    const scale = Math.max(0.001, controller.state.scale) * (controller.state.unitScale ?? RENDER_SCALE);
    const modelAnchor = objectLocalToDeviceScene(controller.model, anchorLocalPointForWorld(controller, scale));
    arm1AnchorGuide.modelAnchor.visible = true;
    arm1AnchorGuide.modelAnchor.position.copy(modelAnchor);
    controller.lastModelAnchorWorld = deviceSceneToDevice(modelAnchor);
    controller.lastTargetAnchorWorld = deviceSceneToDevice(start);
  } else {
    arm1AnchorGuide.modelAnchor.visible = false;
    controller.lastModelAnchorWorld = null;
    controller.lastTargetAnchorWorld = deviceSceneToDevice(start);
  }
}

function setViewMode(mode) {
  if (mode === "top") {
    fitCameraToBox(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), 1.45);
    return;
  }
  if (mode === "front") {
    fitCameraToBox(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), 1.45);
    return;
  }
  if (mode === "side") {
    fitCameraToBox(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 1.45);
    return;
  }
  fitCameraToBox(DEFAULT_CAMERA_POSITION.clone().normalize(), new THREE.Vector3(0, 1, 0), 1.5);
}

function update(linearError = 0) {
  Object.assign(state, clampState(state));
  applyToolVerticalConstraint();
  currentPose = computePose(state);
  controlKeys.forEach((key) => setControlValue(key, currentPose[key]));
  setStrokeValue("arm1", currentPose.actuators.arm1.stroke);
  setStrokeValue("arm2", currentPose.actuators.arm2.stroke);
  setStrokeValue("arm3", currentPose.actuators.arm3.stroke);
  setStrokeBaseValue(currentPose.base);
  updateMetrics(currentPose);
  drawPose(currentPose);
  updateTipDragHandle(currentPose);
  Object.values(modelControllers).forEach((controller) => applyControllerTransform(controller, currentPose));
  updateArm1AnchorGuide();
  pathRoot.visible = driveMode === "linear";
  if (linearRoot && !linearRoot.hidden) syncLinearReadouts(linearError);
  if (driveMode !== "linear") clearGroup(pathRoot);
  window.__lingzhuDebug = {
    renderMode: "three-js",
    device: "GL-3DPRT-SP-S",
    scriptVersion: SCRIPT_VERSION,
    coordinateSystem: COORDINATE_SYSTEM_NOTE,
    deviceSceneRotationY: DEVICE_SCENE_ROTATION_Y_RAD,
    webglAvailable,
    modelEffect,
    actuatorBallStickOnly,
    keepToolVertical,
    pose: currentPose,
    dynamicObjectCount: ballStickRoot.children.length,
    linearPathObjectCount: pathRoot.children.length,
    pathRender: pathRenderStats,
    actuatorCount: Object.values(currentPose.actuators).reduce((sum, actuator) => sum + actuator.instances.length, 0),
    linkageCount: Object.values(currentPose.linkages).reduce(
      (sum, linkage) =>
        sum +
        linkage.instances.reduce(
          (instanceSum, instance) =>
            instanceSum + (instance.drawLink1 === false ? 0 : 1) + (instance.drawLink2 === false ? 0 : 1),
          0,
        ),
      0,
    ),
    linearMotion: { ...linearMotion, animationFrame: Boolean(linearMotion.animationFrame) },
    importedLinearPath: {
      active: importedLinearPathActive(),
      mode: linearMotion.pathMode,
      sourceName: linearMotion.pathSourceName,
      pointCount: linearMotion.pathPoints?.length || 0,
      distance: linearPathDistance(),
      status: linearMotion.pathStatus,
    },
    tipDrag: {
      enabled: true,
      isDragging: linearDrag.active,
      handleWorld: linearDrag.handleWorld,
      targetWorld: linearDrag.lastDisplayWorld,
    },
    linearDrag: {
      active: linearDrag.active,
      hovering: linearDrag.hovering,
      lastWorld: linearDrag.lastWorld,
      lastDisplayWorld: linearDrag.lastDisplayWorld,
      lastRawDisplayWorld: linearDrag.lastRawDisplayWorld,
      dragOffset: linearDrag.dragOffset.toArray(),
      targetWorld: linearMotion.startWorld && linearMotion.endWorld ? linearTargetFromProgress() : null,
      displayTargetWorld: linearMotion.startWorld && linearMotion.endWorld ? displayedLinearTargetFromProgress() : null,
      toolDisplayWorld: currentTipWorld(),
      handleWorld: linearDrag.handleWorld,
      hasHandle: Boolean(tipDragHandle),
    },
    ...Object.fromEntries(Object.entries(modelControllers).map(([key, controller]) => [`${key}Model`, {
      loaded: controller.loaded,
      childCount: controller.childCount,
      stats: controller.stats,
      state: controller.state,
      follows: controller.follows,
      pivot: controller.pivot,
      pivotPoint: controller.pivotPoint,
      modelPosition: controller.model.position.toArray(),
      modelQuaternion: controller.model.quaternion.toArray(),
      modelScale: controller.model.scale.toArray(),
      anchorLocal: controller.anchorLocal,
      anchorUnits: controller.anchorUnits,
      modelAnchorWorld: controller.lastModelAnchorWorld,
      targetAnchorWorld: controller.lastTargetAnchorWorld,
      actuatorFollow: controller.lastActuatorFollow,
      linkageFollow: controller.lastLinkageFollow,
      followPlane: controller.followPlane,
      error: controller.error,
      locked: controller.locked,
    }])),
  };
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  [materials.walkedPath, materials.remainingPath].forEach((material) => {
    material.resolution.set(Math.max(1, rect.width), Math.max(1, rect.height));
  });
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function setDriveMode(nextMode) {
  driveMode = nextMode;
  pathRoot.visible = driveMode === "linear";
  if (driveMode !== "linear") {
    stopLinearDrag();
    stopLinearSimulation();
    clearGroup(pathRoot);
    renderer.domElement.style.cursor = "";
  }
  controlRoot.hidden = driveMode !== "angle";
  strokeRoot.hidden = driveMode !== "stroke";
  linearRoot.hidden = driveMode !== "linear";
  document.querySelector("#angleModeButton").classList.toggle("is-active", driveMode === "angle");
  document.querySelector("#strokeModeButton").classList.toggle("is-active", driveMode === "stroke");
  document.querySelector("#linearModeButton").classList.toggle("is-active", driveMode === "linear");
  update();
}

window.__spsQtStage = {
  setDriveMode(nextMode) {
    const mode = ["angle", "stroke", "linear"].includes(nextMode) ? nextMode : "angle";
    setDriveMode(mode);
  },
  setLinearPath(payload = {}) {
    if (Array.isArray(payload.points)) {
      try {
        applyImportedLinearPath(payload.points.map((point, index) => normalizePathPoint(point, index)), payload.sourceName || "API");
      } catch (error) {
        linearMotion.pathStatus = `导入失败：${error?.message || error}`;
      }
    } else if (payload.clearPoints) {
      linearMotion.pathPoints = null;
      linearMotion.pathSourceName = "";
      linearMotion.pathStatus = "未导入路径文件";
    }
    if (payload.start) linearMotion.startWorld = roundedWorldPoint(payload.start);
    if (payload.end) linearMotion.endWorld = roundedWorldPoint(payload.end);
    if (payload.mode) linearMotion.pathMode = payload.mode === "points" ? "points" : "interpolated";
    if (Number.isFinite(Number(payload.progress))) linearMotion.progress = clamp(Number(payload.progress), 0, 100);
    if (Number.isFinite(Number(payload.speed))) linearMotion.speed = Math.max(1, Number(payload.speed));
    syncLinearPointInputs("startWorld");
    syncLinearPointInputs("endWorld");
    syncLinearReadouts(Number(payload.error) || 0);
    pathRoot.visible = driveMode === "linear";
  },
  setPose(nextState = {}) {
    Object.assign(state, clampState({ ...state, ...nextState }));
    update();
  },
  setKeepToolVertical(checked) {
    keepToolVertical = Boolean(checked);
    const input = document.querySelector("#keepToolVertical");
    if (input) input.checked = keepToolVertical;
    update();
  },
  setModelEffect(nextEffect) {
    modelEffect = nextEffect === "solid" ? "solid" : "transparent";
    if (modelEffectSelect) modelEffectSelect.value = modelEffect;
    refreshModelEffects();
    update();
  },
  setModelsVisible(visible) {
    const checked = Boolean(visible);
    ballStickRoot.visible = checked;
    Object.values(modelControllers).forEach((controller) => {
      controller.state.visible = checked;
      bindModelControlValues(controller);
    });
    update();
  },
  setActuatorBallStickOnly(checked) {
    actuatorBallStickOnly = Boolean(checked);
    const input = document.querySelector("#actuatorBallStickOnly");
    if (input) input.checked = actuatorBallStickOnly;
    update();
  },
  setModelVisible(key, visible) {
    const controller = modelControllers[key] || modelControllers[qtModelKeyMap[key]];
    if (!controller) return;
    controller.state.visible = Boolean(visible);
    bindModelControlValues(controller);
    update();
  },
  setModelTransform(key, transform = {}) {
    const controller = modelControllers[key] || modelControllers[qtModelKeyMap[key]];
    if (!controller) return;
    Object.assign(controller.state, {
      x: Number(transform.x ?? controller.state.x),
      y: Number(transform.y ?? controller.state.y),
      z: Number(transform.z ?? controller.state.z),
      rx: Number(transform.rx ?? controller.state.rx),
      ry: Number(transform.ry ?? controller.state.ry),
      rz: Number(transform.rz ?? controller.state.rz),
      scale: Number(transform.scale ?? controller.state.scale),
    });
    bindModelControlValues(controller);
    update();
  },
  resetModelTransform(key) {
    const controller = modelControllers[key] || modelControllers[qtModelKeyMap[key]];
    if (!controller) return;
    controller.state = { ...controller.homeState };
    bindModelControlValues(controller);
    update();
  },
  setViewPreset(preset) {
    const map = { "3D视角": "default", TOP: "top", XZ: "front", YZ: "side" };
    setViewMode(map[preset] || preset || "default");
  },
};

controlKeys.forEach(createControl);
strokeKeys.forEach(createStrokeControl);
createStrokeBaseControl();
createLinearControls();
createPresets();
createMetrics();
Object.values(modelControllers).forEach((controller) => {
  bindModelControls(controller);
  loadModel(controller);
});

document.querySelector("#resetButton").addEventListener("click", () => {
  stopLinearSimulation();
  Object.assign(state, DEFAULT_STATE);
  applyToolVerticalConstraint();
  update();
});
document.querySelector("#angleModeButton").addEventListener("click", () => setDriveMode("angle"));
document.querySelector("#strokeModeButton").addEventListener("click", () => setDriveMode("stroke"));
document.querySelector("#linearModeButton").addEventListener("click", () => setDriveMode("linear"));
document.querySelector("#ballStickVisible").addEventListener("change", (event) => {
  ballStickRoot.visible = event.target.checked;
});
document.querySelector("#actuatorBallStickOnly").addEventListener("change", (event) => {
  actuatorBallStickOnly = event.target.checked;
  update();
});
modelEffectSelect?.addEventListener("change", (event) => {
  modelEffect = event.target.value === "transparent" ? "transparent" : "solid";
  refreshModelEffects();
  update();
});
document.querySelectorAll(".view-controls button").forEach((button) => {
  button.addEventListener("click", () => setViewMode(button.dataset.view));
});

renderer.domElement.addEventListener("pointerdown", onLinearDragPointerDown);
renderer.domElement.addEventListener("pointermove", onLinearDragPointerMove);
renderer.domElement.addEventListener("pointerup", stopLinearDrag);
renderer.domElement.addEventListener("pointercancel", stopLinearDrag);
renderer.domElement.addEventListener("lostpointercapture", stopLinearDrag);
window.addEventListener("resize", resize);

function animate() {
  orbit.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

resize();
update();
loadDefaultImportedLinearPath();
animate();
