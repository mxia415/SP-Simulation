#!/bin/zsh
set -e

cd "$(dirname "$0")/.."

SRC="./outputs/sps_qt_gui"
BUILD="./outputs/sps_qt_gui/build"
APP="$BUILD/sps_qt_gui.app"

if ! command -v cmake >/dev/null 2>&1; then
  echo "未找到 CMake。请先运行：brew install cmake qt"
  read "?按回车退出..."
  exit 1
fi

"$SRC/sync-html-runtime.sh"
cmake -S "$SRC" -B "$BUILD" -DCMAKE_PREFIX_PATH=/opt/homebrew/opt/qt
cmake --build "$BUILD" --config Release
open "$APP"
