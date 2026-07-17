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

## Common Commands

```bash
npm run verify:actuators
npm run verify:browser
npm run verify:coordinates
npm run verify:path
npm run build
```

When using a clean worktree without `git-lfs`, `.glb` assets may be checked out as 130 byte pointer files. See `docs/LOCAL-PREVIEW-AND-DEPLOY.md` before trusting local GLB loading status.
