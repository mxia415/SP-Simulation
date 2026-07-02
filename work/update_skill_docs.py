from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:80]!r}")
    path.write_text(text.replace(old, new, 1))


skills = Path("/Users/ming/.codex/skills")

mechanical = skills / "mechanical-device-control-webapp" / "SKILL.md"
replace_once(
    mechanical,
    """When importing GLBs:

- Preserve visual consistency across all imported models unless the user requests otherwise.
- If the user gives a desired material profile, apply it after loading by traversing meshes and replacing material.
- Keep Tool/print-head material separate if it needs to remain brighter than the arms.
- Avoid destructive compression that changes appearance unless the user explicitly approves the visual tradeoff.
- If compression is requested, test the optimized model visually against the original before replacing it.
""",
    """When importing GLBs:

- Preserve visual consistency across all imported models unless the user requests otherwise.
- If the user gives a desired material profile, apply it after loading by traversing meshes and replacing material.
- Keep Tool/print-head material separate if it needs to remain brighter than the arms.
- Keep the ball-stick reference model visually independent from imported GLB opacity or edge settings unless the user asks to couple them.
- For transparent mechanical GLBs, avoid generated coplanar `EdgesGeometry` overlays when zoomed-in views shimmer or lines appear to move on surfaces. Prefer stable transparent bodies plus the ball-stick reference.
- If transparent GLB surfaces shimmer, tighten camera near/far clipping, avoid excessive far ranges, use slight `polygonOffset` on surfaces, and disable `castShadow` / `receiveShadow` for imported transparent models.
- Avoid destructive compression that changes appearance unless the user explicitly approves the visual tradeoff.
- If compression is requested, test the optimized model visually against the original before replacing it.
""",
)

replace_once(
    mechanical,
    """- Browser or Playwright checks for visible controls, GLB load status, default pose, important readouts, and debug objects.
- Manual or screenshot QA for 3D framing, orbit controls, drag handles, and model alignment.
""",
    """- Browser or Playwright checks for visible controls, GLB load status, default pose, important readouts, and debug objects.
- Manual or screenshot QA for 3D framing, orbit controls, drag handles, model alignment, and zoomed-in GLB rendering stability.
""",
)

glb = skills / "glb-model-processing" / "SKILL.md"
replace_once(
    glb,
    """## Workflow

1. Keep the original GLB unchanged as the source file.
2. Save or label a raw backup, usually `<name>-raw.glb`.
3. Run the compression pipeline on a copy of the original.
4. Export the compressed result as the deployable file, usually `outputs/assets/<DEVICE>.glb`.
5. Compare original and compressed file sizes.
6. Visually inspect the compressed model before replacing a production asset.
7. Document the source file, compressed output, compression ratio/settings, and date when useful.
""",
    """## Workflow

1. Keep the original GLB unchanged as the source file.
2. Save or label a raw backup, usually `<name>-raw.glb`.
3. Run the compression pipeline on a copy of the original.
4. Export the compressed result as the deployable file, usually `outputs/assets/<DEVICE>.glb`.
5. For standalone local pages, also rebuild any `file://` fallback package such as `<name>-model.js` when the GLB changes.
6. Compare original and compressed file sizes.
7. Visually inspect the compressed model before replacing a production asset.
8. Document the source file, compressed output, compression ratio/settings, visual material policy, and date when useful.
""",
)

replace_once(
    glb,
    """## Verification Checklist

- The compressed `.glb` exists at the intended output path.
- File size is meaningfully smaller than the original.
- The compressed model opens in a GLB/glTF viewer or the project preview.
- Important geometry is still recognizable.
- No accidental overwrite of the only raw/original copy occurred.
- Compression settings and output file name are recorded if the project has docs.
""",
    """## Verification Checklist

- The compressed `.glb` exists at the intended output path.
- File size is meaningfully smaller than the original.
- The compressed model opens in a GLB/glTF viewer or the project preview.
- Important geometry is still recognizable.
- Local `file://` fallback files are regenerated when required by the app.
- Transparent material settings are visually checked at normal and zoomed-in views.
- Generated edge overlays are avoided or disabled if they shimmer on transparent mechanical surfaces.
- No accidental overwrite of the only raw/original copy occurred.
- Compression settings and output file name are recorded if the project has docs.
""",
)

workspace = skills / "device-motion-range-workspace" / "SKILL.md"
replace_once(
    workspace,
    """For GLB model delivery, keep page startup fast and local-file sharing reliable:

- Do not load or decode the model on page startup.
- On `http:` or `https:`, click-to-load `outputs/assets/<DEVICE>.glb`.
- On `file:`, click-to-load a classic-script fallback `outputs/assets/<DEVICE>-model.js` that sets `window.__GL3DPRT_MODELS__[<DEVICE>]` to base64, then decode it to an ArrayBuffer for `GLTFLoader.parse`.
- Generate or update the fallback JS whenever the GLB changes.
- Document both files in the matching说明 document so users can share the complete `outputs/assets` folder.
""",
    """For GLB model delivery, keep page startup fast and local-file sharing reliable:

- Do not load or decode the model on page startup.
- On `http:` or `https:`, click-to-load `outputs/assets/<DEVICE>.glb`.
- On `file:`, click-to-load a classic-script fallback `outputs/assets/<DEVICE>-model.js` that sets `window.__GL3DPRT_MODELS__[<DEVICE>]` to base64, then decode it to an ArrayBuffer for `GLTFLoader.parse`.
- Generate or update the fallback JS whenever the GLB changes.
- For transparent reference models, avoid coplanar generated edge overlays if zooming makes surface lines shimmer; prefer stable transparent materials, tightened camera clipping, and no shadow casting/receiving on transparent imported models.
- Document both files and the visual material policy in the matching说明 document so users can share the complete `outputs/assets` folder.
""",
)

print("updated skill docs")
