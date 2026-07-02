@echo off
setlocal
cd /d "%~dp0\..\.."
echo 正在构建 SP-S Windows 傻瓜包...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\outputs\sps_qt_gui\package-windows.ps1"
if errorlevel 1 (
  echo.
  echo 打包失败。请确认已安装：
  echo 1. Visual Studio 2022 Desktop development with C++
  echo 2. Qt 6.x MSVC 2022 64-bit，并包含 Qt WebEngine
  echo 3. CMake
  echo 4. vcpkg assimp:x64-windows
  echo.
  pause
  exit /b 1
)
echo.
echo 打包完成，结果在 outputs\sps_qt_gui\dist\windows
pause
