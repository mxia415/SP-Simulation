# SP-S Current State

Last synchronized from the Codex control thread on 2026-07-23.

## Coordinate Contract

- Units: millimeters.
- Web math uses world `X/Y/Z`.
- The displayed 3D view is the source of truth:
  - default 3D view: `X+` points left-up, `Y+` points right-up, `Z+` is height.
  - CSV path import uses the same `X/Y/Z` convention.
- Side-view mechanical coordinates are treated as `X/Z`; height maps to web `Z`.
- Lateral actuator separation is on web `Y`.
- Do not rotate the camera convention, `camera.up`, OrbitControls distances, or the stable coordinate mapping to hide a geometry problem.

## Current Geometry

Coordinate origin is the actuator 1 tail point: `[0, 0]` in side-view `X/Z`.

```js
BASE_ARM1_WORLD_XZ = [-450.742, 385.188];

SEGMENT_ORIGINS_WORLD = {
  arm1: [-450.742, 385.188],
  arm2: [-450.742, 3782.177],
  arm3: [2596.265, 3782.177],
};
```

Current axis distances:

- arm1: `3396.989 mm`
- arm2: `3047.007 mm`
- arm3: `2053.564 mm`
- printhead/tool centerline: `730 mm`
- total three-arm axis distance: `8497.560 mm`

The `arm3Tool` point is kept at `z = 1728.613` so arm3 remains `2053.564 mm` after the updated arm3 origin.

## Joint And Actuator Limits

```js
LIMITS = {
  base:   { min: -180,    max: 180 },
  arm1:   { min: 0,       max: 83.8189 },
  arm2:   { min: 16.0271, max: 177.9644 },
  arm3:   { min: 10.4567, max: 180 },
  offset: { min: -55,     max: 150 },
};

ACTUATOR_LIMITS = {
  arm1: { minLength: 1280.7, strokeLength: 750, maxLength: 2030.7 },
  arm2: { minLength: 1180.9, strokeLength: 680, maxLength: 1860.9 },
  arm3: { minLength: 1365.0, strokeLength: 580, maxLength: 1945.0 },
};
```

Default calibration pose remains an unclamped GLB/linkage reference. This is intentional: GLB and linkage coordinates were calibrated with arm1 at `90°`, even though the current arm1 motion limit clamps runtime motion to `83.8189°`. Do not recompute GLB anchors from a clamped default pose.

The user-facing startup print pose is:

```js
initialPrint = { arm1: 81, arm2: 72, arm3: 49, offset: 50, base: 4 };
```

Imported path simulation starts from this initial print pose, not from the vertical calibration pose.

## Actuator And Linkage Coordinates

```js
ACTUATORS = {
  arm1: {
    tailWorld: [0.0, 0.0],
    frontWorld: [-766.162, 1915.092],
    frontOn: "arm1",
  },
  arm2: {
    tailWorld: [-766.242, 2177.092],
    tailOn: "arm1",
    frontLinkage: "A",
  },
  arm3: {
    tailWorld: [818.447, 3901.033],
    tailOn: "arm2",
    frontLinkage: "B",
  },
};

LINKAGE_A = {
  commonWorld: [-226.672, 3691.4],
  commonOn: "arm2",
  link1: { anchorWorld: [-630.742, 3748.117], anchorOn: "arm1", length: 407.5 },
  link2: { anchorWorld: [-90.799, 3774.020], anchorOn: "arm2", length: 157.0 },
};

LINKAGE_B = {
  commonWorld: [2488.713, 3601.608],
  commonOn: "arm3",
  link1: { anchorWorld: [2548.758, 3988.982], anchorOn: "arm2", length: 392.0 },
  link2: { anchorWorld: [2627.740, 3507.291], anchorOn: "arm3", length: 168.0 },
};
```

Linkage bars are rigid fixed-length bars. Only actuator/cylinder rods vary in length.

## Path Import And Simulation

- Default imported path: `outputs/html-version/assets/paths/cuboid-4000x2700x3300-layer200-y3600-viewXYZ.csv`
- Path rules:
  - layer-by-layer cuboid path
  - layer height `200 mm`
  - no same-layer overlap
  - one-stroke style per layer
  - shape may use multiple curves
  - path area nearest distance in `X` direction is `3600 mm`
- Imported path rendering:
  - walked part: solid, full opacity
  - remaining part: dashed, `5%` opacity, thinner than walked line
  - no point markers on imported CSV paths

Simulation must move from the fixed initial print pose to the imported path start, then continue along the path. Return-to-start restores pose, progress, and IK history.

## IK Modes

The ordinary HTML selector exposes exactly three formal analytic phi modes:

- `greedy_continuity` / `局部贪心解析 φ`
- `balanced_posture` / `平衡姿态解析 φ`
- `posture_priority` / `强姿态解析 φ`

Default imported-path mode is `posture_priority` / `强姿态解析 φ`.

The older `Original`, `Balanced`, `Improved`, `Phi Scan`, and `Active-5 3D DLS` implementations may remain internally for experiments, but they must not be shown in the normal path-simulation IK dropdown unless the user explicitly asks for an experimental/debug UI.

Formal analytic phi solver contract:

- Use target `X/Y/Z` in the 3D viewport coordinate convention.
- Adapt 3D to the formal planar solver by solving base/yaw from target `XY`, then solving local `X/Z` with analytic phi.
- Candidate TCP must exactly hit the target before posture scoring; do not trade tracking error for posture.
- Candidate filtering must enforce joint hard limits, strict actuator stroke, correct linkage branch, and vertical tool angle.
- The printhead/tool target angle is `-90°`.
- Each mode maintains previous and previous-previous accepted states for continuity; reset this history when switching algorithms, clearing/reloading paths, returning to start, or restarting simulation.
- Speed/time playback in the control page is a display simulation. It is not the full offline dynamics trajectory time parameterization.

Formal scoring weights:

```js
greedy_continuity: { movement: 1.0, smoothness: 0.35, posture: 0 }
balanced_posture: { movement: 1.0, smoothness: 1.15, posture: 0.003 }
posture_priority: { movement: 0.8, smoothness: 2.5, posture: 0.012 }
```

## GLB Follow Contract

- GLB files themselves are not moved to satisfy a math update.
- Ball-stick coordinates are the source of truth.
- Runtime GLB pose follows ball-stick target points through reference-pose anchors.
- GLB binding reference pose must be generated from `CALIBRATION_STATE` with limit clamping disabled (`computePose(CALIBRATION_STATE, { clampLimits: false })` in the current code). Arm1 must remain `90°` in this reference.
- The deployable base model is Meshopt-compressed for Cloudflare loading speed. When replacing it, regenerate `outputs/html-version/assets/base-model.js` from the exact deployable GLB bytes for `file://` fallback.
- If ball-stick coordinates change but GLB files do not, recompute/follow against the new ball-stick points; do not hand-tune model positions.
- Verify `modelAnchorWorld` matches `targetAnchorWorld` for every followed GLB within `0.001 mm`.
- A local worktree without `git-lfs` may contain 130 byte `.glb` pointer files; that causes all GLBs to show as not loaded even when code is correct.

## Deployment Contract

- Cloudflare Pages entry is the repository root.
- Build command: `npm run build`.
- Output directory: `dist/`.
- The page loads `app-bundle.js`; after source edits, rebuild the bundle.
- Cache-bust `styles.css`, `app-bundle.js`, and script/model URLs by updating `SCRIPT_VERSION`.
- Root `outputs/index.html` redirects to `outputs/html-version/index.html` with the same version token.

Current visible metadata:

- Page version: `V1.9 · 2026-07-23`
- Script/cache token: `20260723-base-meshopt`
