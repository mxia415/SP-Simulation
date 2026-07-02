param(
  [string]$QtDir = "",
  [string]$VcpkgRoot = "",
  [string]$Generator = "Visual Studio 17 2022",
  [string]$Arch = "x64"
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  $scriptDir = Split-Path -Parent $PSCommandPath
  return (Resolve-Path (Join-Path $scriptDir "../..")).Path
}

function Require-Command($name) {
  $command = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "未找到命令：$name。请先安装并加入 PATH。"
  }
  return $command.Source
}

$repoRoot = Resolve-RepoRoot
$projectDir = Join-Path $repoRoot "outputs/sps_qt_gui"
$buildDir = Join-Path $projectDir "build-windows"
$distRoot = Join-Path $projectDir "dist/windows"
$packageDir = Join-Path $distRoot "SP-S模拟-win64"
$zipPath = Join-Path $distRoot "SP-S模拟-win64.zip"

Require-Command cmake | Out-Null

if (-not $QtDir) {
  $qtConfig = Get-ChildItem "C:\Qt" -Recurse -Filter Qt6Config.cmake -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match "msvc|mingw" } |
    Select-Object -First 1
  if ($qtConfig) {
    $QtDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $qtConfig.FullName)))
  }
}

if (-not $QtDir -or -not (Test-Path (Join-Path $QtDir "bin/windeployqt.exe"))) {
  throw "请用 -QtDir 指定 Windows Qt 目录，例如：C:\Qt\6.8.3\msvc2022_64。必须包含 Qt WebEngine 和 windeployqt.exe。"
}

$cmakeArgs = @(
  "-S", $projectDir,
  "-B", $buildDir,
  "-G", $Generator,
  "-A", $Arch,
  "-DCMAKE_PREFIX_PATH=$QtDir",
  "-DCMAKE_BUILD_TYPE=Release"
)

if ($VcpkgRoot) {
  $toolchain = Join-Path $VcpkgRoot "scripts/buildsystems/vcpkg.cmake"
  if (-not (Test-Path $toolchain)) {
    throw "未找到 vcpkg toolchain：$toolchain"
  }
  $cmakeArgs += "-DCMAKE_TOOLCHAIN_FILE=$toolchain"
  $cmakeArgs += "-DVCPKG_TARGET_TRIPLET=x64-windows"
}

cmake @cmakeArgs
cmake --build $buildDir --config Release --parallel

if (Test-Path $packageDir) {
  Remove-Item $packageDir -Recurse -Force
}
New-Item $packageDir -ItemType Directory -Force | Out-Null

$exe = Get-ChildItem $buildDir -Recurse -Filter "sps_qt_gui.exe" |
  Where-Object { $_.FullName -match "\\Release\\|/Release/" } |
  Select-Object -First 1
if (-not $exe) {
  $exe = Get-ChildItem $buildDir -Recurse -Filter "sps_qt_gui.exe" | Select-Object -First 1
}
if (-not $exe) {
  throw "构建完成但未找到 sps_qt_gui.exe"
}
Copy-Item $exe.FullName (Join-Path $packageDir "SP-S模拟.exe")

$outputsDir = Join-Path $packageDir "outputs"
New-Item $outputsDir -ItemType Directory -Force | Out-Null
New-Item (Join-Path $outputsDir "sps_qt_gui") -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $repoRoot "outputs/sps_qt_gui/assets") (Join-Path $outputsDir "sps_qt_gui/assets") -Recurse
New-Item (Join-Path $outputsDir "sps_qt_gui/runtime") -ItemType Directory -Force | Out-Null
$runtimeDir = Join-Path $repoRoot "outputs/sps_qt_gui/runtime/lingzhu-control"
if (-not (Test-Path (Join-Path $runtimeDir "index.html"))) {
  throw "缺少 Qt 专用 HTML 运行资源，请先运行 outputs/sps_qt_gui/sync-html-runtime.sh"
}
Copy-Item $runtimeDir (Join-Path $outputsDir "sps_qt_gui/runtime/lingzhu-control") -Recurse

$windeployqt = Join-Path $QtDir "bin/windeployqt.exe"
& $windeployqt --release --compiler-runtime --webenginecore --no-translations (Join-Path $packageDir "SP-S模拟.exe")

$assimpDlls = Get-ChildItem $buildDir -Recurse -Include "assimp*.dll" -ErrorAction SilentlyContinue
if ($VcpkgRoot) {
  $assimpDlls += Get-ChildItem (Join-Path $VcpkgRoot "installed/x64-windows/bin") -Filter "assimp*.dll" -ErrorAction SilentlyContinue
}
$assimpDll = $assimpDlls | Select-Object -First 1
if ($assimpDll) {
  Copy-Item $assimpDll.FullName $packageDir -Force
} else {
  Write-Warning "未自动找到 assimp*.dll。如果程序启动时报 assimp DLL 缺失，请从 vcpkg installed/x64-windows/bin 复制到打包目录。"
}

$launcher = @'
@echo off
setlocal
cd /d "%~dp0"
set QTWEBENGINE_DISABLE_SANDBOX=1
start "" "%~dp0SP-S模拟.exe"
'@
Set-Content -Path (Join-Path $packageDir "启动SP-S模拟.bat") -Value $launcher -Encoding ASCII
Set-Content -Path (Join-Path $packageDir "START.bat") -Value $launcher -Encoding ASCII

$diagnostics = @'
@echo off
setlocal
cd /d "%~dp0"
echo SP-S Windows package diagnostics
echo.
if exist "SP-S模拟.exe" (echo [OK] SP-S模拟.exe) else (echo [MISSING] SP-S模拟.exe)
if exist "outputs\sps_qt_gui\runtime\lingzhu-control\index.html" (echo [OK] HTML runtime) else (echo [MISSING] HTML runtime)
if exist "outputs\sps_qt_gui\runtime\lingzhu-control\app-bundle.js" (echo [OK] app-bundle.js) else (echo [MISSING] app-bundle.js)
if exist "outputs\sps_qt_gui\runtime\lingzhu-control\assets" (echo [OK] model assets) else (echo [MISSING] model assets)
if exist "Qt6Core.dll" (echo [OK] Qt6Core.dll) else (echo [MISSING] Qt6Core.dll)
if exist "Qt6WebEngineCore.dll" (echo [OK] Qt6WebEngineCore.dll) else (echo [MISSING] Qt6WebEngineCore.dll)
if exist "QtWebEngineProcess.exe" (echo [OK] QtWebEngineProcess.exe) else (echo [WARN] QtWebEngineProcess.exe may be under a Qt subfolder)
echo.
echo If the app cannot start, send this window screenshot to the developer.
pause
'@
Set-Content -Path (Join-Path $packageDir "诊断环境.bat") -Value $diagnostics -Encoding ASCII

$readme = @"
SP-S模拟 Windows 傻瓜包
========================

使用方法：
1. 先解压整个文件夹，不要直接在 zip 里运行。
2. 双击 启动SP-S模拟.bat。
3. 如果杀毒软件提示，请选择允许或信任本文件夹。

不要删除或移动：
- SP-S模拟.exe
- outputs 文件夹
- Qt*.dll、resources、translations、imageformats、platforms 等 Qt 文件夹

如果打不开：
1. 双击 诊断环境.bat。
2. 把诊断窗口截图发给开发者。

版本：
V1.0 · 2026-07-02 · ©Ming Xia
"@
Set-Content -Path (Join-Path $packageDir "README-先看我.txt") -Value $readme -Encoding UTF8
Set-Content -Path (Join-Path $packageDir "VERSION.txt") -Value "V1.0 · 2026-07-02 · ©Ming Xia" -Encoding UTF8

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath

Write-Host ""
Write-Host "Windows 打包完成："
Write-Host "  $packageDir"
Write-Host "  $zipPath"
