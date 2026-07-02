#!/bin/zsh
set -e

cd "$(dirname "$0")/.."

APP="./outputs/SP-S原生模拟.app"
SRC="./outputs/sps_native_gui/SPSNativeGui.mm"
BIN="$APP/Contents/MacOS/SPSNativeGui"

if ! command -v clang++ >/dev/null 2>&1; then
  echo "未找到 clang++。请先安装 Apple 命令行工具：xcode-select --install"
  read "?按回车退出..."
  exit 1
fi

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"

clang++ -std=c++17 -Wall -Wextra -Werror -pedantic -fobjc-arc "$SRC" -framework Cocoa -o "$BIN"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>SPSNativeGui</string>
  <key>CFBundleIdentifier</key>
  <string>local.sps.native.simulator</string>
  <key>CFBundleName</key>
  <string>SP-S原生模拟</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

echo "已构建：$APP"
open "$APP"
