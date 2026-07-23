# SP-S Simulation

Browser-based control and simulation tool for the GL-3DPRT-SP-S mechanism.

The deployable web app lives in `outputs/html-version/`. Cloudflare Pages builds from the repository root with:

```bash
npm run build
```

The build script copies the web app into `dist/`.

## Current Source Files

- `outputs/html-version/model.mjs`: mechanism constants, pose math, actuator/linkage constraints, IK solvers, presets.
- `outputs/html-version/app.mjs`: Three.js scene, GLB loading/following, UI, path import, path simulation.
- `outputs/html-version/app-bundle.js`: bundled script loaded by the HTML page. Rebuild it after changing `app.mjs` or `model.mjs`.
- `outputs/html-version/index.html`: deployed page shell.
- `outputs/index.html`: redirect entry for static hosting.

## Project Notes

- Current state and geometry: `docs/SP-S-CURRENT-STATE.md`
- Local preview, Git LFS, verification, and deployment: `docs/LOCAL-PREVIEW-AND-DEPLOY.md`
- The current control-page state is synchronized to 2026-07-23. Do not rely on older thread-history files when these docs and `outputs/html-version/model.mjs` disagree.

## Current Web State

- Visible page version: `V1.9 · 2026-07-23`
- Current script/cache token: `20260723-defer-base`
- Default path control: `路径演示`; it loads the bundled demo CSV instead of showing a CSV/JSON upload button.
- Default IK mode: `posture_priority` / `强姿态解析 φ`
- Ordinary IK selector exposes exactly:
  - `greedy_continuity` / `局部贪心解析 φ`
  - `balanced_posture` / `平衡姿态解析 φ`
  - `posture_priority` / `强姿态解析 φ`
- GLB binding reference pose is the unclamped calibration pose. In particular, arm1 is calibrated at `90°` even though the motion limit is `83.8189°`.
- `base.glb` is Meshopt-compressed and deferred on Cloudflare so the moving arm, cylinders, linkages, and tool load first; keep `base-model.js` synchronized for `file://` fallback.
- Imported path simulation starts from the initial print pose `{ arm1: 81, arm2: 72, arm3: 49, offset: 50, base: 4 }`, then moves to the path start.

## Common Commands

```bash
node --check outputs/html-version/model.mjs
node --check outputs/html-version/app.mjs
node scripts/verify-formal-phi-ik.mjs
npm run verify:actuators
npm run verify:browser
npm run verify:coordinates
npm run verify:path
npm run build
```

When using a clean worktree without `git-lfs`, `.glb` assets may be checked out as 130 byte pointer files. See `docs/LOCAL-PREVIEW-AND-DEPLOY.md` before trusting local GLB loading status.
