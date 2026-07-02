#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE="$ROOT/outputs/lingzhu-control"
TARGET="$ROOT/outputs/sps_qt_gui/runtime/lingzhu-control"

if [[ ! -f "$SOURCE/index.html" ]]; then
  echo "未找到 HTML 运行源：$SOURCE/index.html" >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET")"
rsync -a --delete --exclude ".DS_Store" "$SOURCE/" "$TARGET/"
echo "已同步 Qt 专用 HTML 运行资源：$TARGET"
