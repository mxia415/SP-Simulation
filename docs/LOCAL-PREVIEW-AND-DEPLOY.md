# Local Preview And Deployment

Last synchronized on 2026-07-23.

## Clean Worktrees

The long-running main workspace often contains local experimental changes. Use a clean worktree for pushed changes:

```bash
git -c filter.lfs.smudge= -c filter.lfs.process= -c filter.lfs.required=false fetch origin main
git -c filter.lfs.smudge= -c filter.lfs.process= -c filter.lfs.required=false worktree add -b codex/<topic> ../SP-S-<topic> origin/main
```

Do not run `git reset --hard` or revert files from the main workspace just to get a clean diff.

## Git LFS And GLB Assets

This repo uses Git LFS for direct `.glb` assets. In environments without `git-lfs`, a clean checkout may contain pointer files such as:

```text
version https://git-lfs.github.com/spec/v1
```

Those files are about `130 B` and are not valid GLB binaries. If a local preview shows every GLB as `未加载`, check file size first:

```bash
ls -lh outputs/html-version/assets/base.glb
head -c 80 outputs/html-version/assets/base.glb | xxd -g 1
```

Expected valid GLB files start with `glTF`; pointer files start with `version https://`.

For local-only preview worktrees, copy real GLB binaries from a workspace that already has them:

```bash
for f in /Users/ming/Documents/Codex/2026-06-26/SP-S/outputs/html-version/assets/*.glb; do
  cp "$f" outputs/html-version/assets/
done
```

Do not commit copied GLB binaries from a LFS-disabled worktree unless the task is explicitly to replace model assets.

## Local Preview

Use HTTP, not `file://`, for normal verification:

```bash
python3 -m http.server 4175
```

Open:

```text
http://localhost:4175/outputs/html-version/index.html?v=<SCRIPT_VERSION>
```

If another server is already on that port, either stop it or use a new port. Be careful: an old local server can serve stale files while the browser URL looks correct.

## Rebuilding The Browser Bundle

The HTML page loads `outputs/html-version/app-bundle.js`. After changing `app.mjs` or `model.mjs`, rebuild:

```bash
test -e work || ln -s /Users/ming/Documents/Codex/2026-06-26/SP-S/work work
NODE_PATH=/Users/ming/Documents/Codex/2026-06-26/SP-S/work/node_modules \
  /Users/ming/Documents/Codex/2026-06-26/SP-S/work/node_modules/.bin/esbuild \
  outputs/html-version/app.mjs \
  --bundle --format=iife \
  --outfile=outputs/html-version/app-bundle.js \
  --legal-comments=inline
unlink work
```

If the project root already has dependencies available, the equivalent local `esbuild` command is fine.

## Verification

Run these before pushing behavior changes:

```bash
node --check outputs/html-version/model.mjs
node --check outputs/html-version/app.mjs
node --check scripts/verify-actuator-constraints.mjs
node --check scripts/verify-browser.mjs
node --check scripts/verify-formal-phi-ik.mjs
node scripts/verify-formal-phi-ik.mjs
npm run verify:actuators
npm run verify:browser
npm run build
```

For coordinate/path changes, also run:

```bash
npm run verify:coordinates
npm run verify:path
```

Browser verification currently checks:

- default path import
- formal analytic phi default IK selection
- exactly three normal IK dropdown options: `局部贪心解析 φ`, `平衡姿态解析 φ`, `强姿态解析 φ`
- theme switching
- printhead and arm angle ranges
- initial print pose preset
- imported path rendering style
- return-to-start behavior
- high-speed simulation startup behavior
- GLB follow anchor error for followed models

Formal IK verification (`scripts/verify-formal-phi-ik.mjs`) checks the three formal analytic phi modes on calibration, demo-path, and boundary-near targets. It reports maximum TCP residual and maximum single-step joint change. The current expected residual is below `1 mm`.

When debugging local GLB loading separately, verify all model controllers load:

```js
Object.keys(window.__lingzhuDebug || {})
  .filter((key) => key.endsWith("Model"))
  .map((key) => [key, window.__lingzhuDebug[key].loaded])
```

## Deployment

Cloudflare Pages:

- root directory: repository root
- build command: `npm run build`
- output directory: `dist/`

After push, Cloudflare should clone the latest Git commit. If it reports `Uploaded 0 files` and still shows an old site, check:

- the deployed commit hash
- `outputs/html-version/index.html` cache-bust token
- `outputs/index.html` redirect token
- `outputs/html-version/app-bundle.js` contents
- whether `scripts/build-cloudflare-pages.mjs` copies the changed files into `dist/`

The current Cloudflare build script copies `outputs/html-version/` and root redirect output into `dist/`.

Current control-page metadata:

- Visible version: `V1.9 · 2026-07-23`
- Script/cache token: `20260723-base-meshopt`
