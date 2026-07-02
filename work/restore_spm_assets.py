from __future__ import annotations

import base64
import gzip
import shutil
from pathlib import Path


ROOT = Path("/Users/ming/Documents/Codex/2026-06-24/s")
ASSETS = ROOT / "outputs/lingzhu-control/assets"

SOURCES = {
    "base": Path("/Users/ming/Desktop/spm parts/base.glb"),
    "base_link": Path("/Users/ming/Desktop/spm parts/base_link.glb"),
    "arm1": Path("/Users/ming/Desktop/spm parts 90/arm1.glb"),
    "arm2": Path("/Users/ming/Desktop/spm parts 90/arm2.glb"),
    "arm3": Path("/Users/ming/Desktop/spm parts 90/arm3.glb"),
    "arm4": Path("/Users/ming/Desktop/spm parts 90/arm4.glb"),
}

MODEL_JS = {
    "base": "base-model.js",
    "base_link": "base-link-model.js",
    "arm1": "arm1-model.js",
    "arm2": "arm2-model.js",
    "arm3": "arm3-model.js",
    "arm4": "arm4-model.js",
}

FALLBACK_KEYS = {
    "base": "base",
    "base_link": "baseLink",
    "arm1": "arm1",
    "arm2": "arm2",
    "arm3": "arm3",
    "arm4": "arm4",
}


def write_fallback_js(glb_path: Path, js_path: Path, fallback_key: str) -> None:
    gz_bytes = gzip.compress(glb_path.read_bytes(), compresslevel=9)
    encoded = base64.b64encode(gz_bytes).decode("ascii")
    js_path.write_text(
        "\n".join(
            [
                "window.__LINGZHU_MODELS__ = window.__LINGZHU_MODELS__ || {};",
                f"window.__LINGZHU_MODELS__[{fallback_key!r}] = {encoded!r};",
                "",
            ],
        ),
    )


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / "raw").mkdir(parents=True, exist_ok=True)
    (ASSETS / "processed").mkdir(parents=True, exist_ok=True)

    rows = []
    for name, source in SOURCES.items():
        if not source.exists():
            raise SystemExit(f"missing source: {source}")

        target_name = f"{name}.glb"
        target = ASSETS / target_name
        raw_name = "base_link-raw.glb" if name == "base_link" else f"{name}-raw.glb"
        raw = ASSETS / "raw" / raw_name
        processed = ASSETS / "processed" / target_name

        shutil.copyfile(source, target)
        shutil.copyfile(source, raw)
        shutil.copyfile(source, processed)

        gz_path = ASSETS / f"{target_name}.gz"
        gz_path.write_bytes(gzip.compress(target.read_bytes(), compresslevel=9))
        write_fallback_js(target, ASSETS / MODEL_JS[name], FALLBACK_KEYS[name])
        rows.append((name, source.stat().st_size, target.stat().st_size, gz_path.stat().st_size))

    report = [
        "# GLB Compression Report",
        "",
        "Date: 2026-06-26",
        "",
        "SP/M model assets were restored from the Desktop source GLB files after accidental cleanup.",
        "The current deployable GLBs are direct restored copies, with gzip files and file:// fallback packages regenerated.",
        "",
        "| Model | Restored GLB | Gzip |",
        "| --- | ---: | ---: |",
    ]
    for name, _source_size, restored_size, gz_size in rows:
        report.append(f"| {name} | {restored_size / 1024 / 1024:.1f} MB | {gz_size / 1024 / 1024:.1f} MB |")
    report.extend(
        [
            "",
            "## Source mapping",
            "",
            "- Base and Base_link: `/Users/ming/Desktop/spm parts/`",
            "- Arm1, Arm2, Arm3, Tool: `/Users/ming/Desktop/spm parts 90/`",
            "",
            "## Visual material policy",
            "",
            "The page uses the latest stable transparent-body GLB policy from the SP/M controller: no generated surface edge overlays for non-Tool models, independent ball-stick reference, tightened camera clipping, and no shadow casting/receiving on imported transparent GLBs.",
            "",
        ],
    )
    (ASSETS / "compression-report.md").write_text("\n".join(report))
    print("restored", len(rows), "models")


if __name__ == "__main__":
    main()
