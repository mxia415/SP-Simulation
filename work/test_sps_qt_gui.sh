#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/outputs/sps_qt_gui"
BUILD="$ROOT/outputs/sps_qt_gui/build"
APP="$BUILD/sps_qt_gui.app"

"$SRC/sync-html-runtime.sh"
cmake -S "$SRC" -B "$BUILD" -DCMAKE_PREFIX_PATH=/opt/homebrew/opt/qt
cmake --build "$BUILD" --config Release

test -d "$APP"
test -x "$APP/Contents/MacOS/sps_qt_gui"

"$APP/Contents/MacOS/sps_qt_gui" --self-test

echo "sps_qt_gui build test passed"
