# Windows 傻瓜包打包说明

当前 macOS 环境没有 Windows Qt 工具链，不能直接生成 Windows exe。请在 Windows 机器上执行下面步骤。

## 需要安装

1. Visual Studio 2022，勾选 `Desktop development with C++`
2. Qt 6.x Windows 版本，必须包含：
   - `MSVC 2022 64-bit`
   - `Qt WebEngine`
3. CMake
4. assimp，推荐用 vcpkg：

```powershell
git clone https://github.com/microsoft/vcpkg C:\vcpkg
C:\vcpkg\bootstrap-vcpkg.bat
C:\vcpkg\vcpkg install assimp:x64-windows
```

## 双击一键打包

在 Windows 机器上，进入项目目录后双击：

```text
outputs\sps_qt_gui\一键打包Windows傻瓜包.bat
```

脚本会自动调用 `package-windows.ps1`，生成可分享的 zip 包。

如果 Qt 没有安装在 `C:\Qt`，或自动识别失败，用下面的 PowerShell 命令手动指定 Qt 路径。

## 手动构建并打包

在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\outputs\sps_qt_gui\package-windows.ps1 `
  -QtDir "C:\Qt\6.8.3\msvc2022_64" `
  -VcpkgRoot "C:\vcpkg"
```

生成结果：

```text
outputs\sps_qt_gui\dist\windows\SP-S模拟-win64\
outputs\sps_qt_gui\dist\windows\SP-S模拟-win64.zip
```

## 发给别人

直接发送：

```text
outputs\sps_qt_gui\dist\windows\SP-S模拟-win64.zip
```

对方只需要：

1. 解压整个 zip。
2. 双击 `启动SP-S模拟.bat`。
3. 如果打不开，双击 `诊断环境.bat`，把截图发回。

包里会自带：

- `SP-S模拟.exe`
- `启动SP-S模拟.bat`
- `START.bat`
- `README-先看我.txt`
- `诊断环境.bat`
- Qt 运行库
- Qt 专用 HTML/Three.js 运行资源：`outputs\sps_qt_gui\runtime\lingzhu-control`
