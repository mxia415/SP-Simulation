# SP-S Qt Native GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Qt/C++ desktop app that visually and functionally approaches the existing HTML SP-S controller.

**Architecture:** Keep the motion model in a small C++ module shared by UI code. Build a Qt Widgets main window with left controls, center dark stage preview, and right model/readout panels. Use CMake to produce a macOS `.app` bundle.

**Tech Stack:** C++17, Qt 6 Widgets/OpenGLWidgets, CMake, Homebrew Qt.

---

### Task 1: Qt Project Skeleton

**Files:**
- Create: `outputs/sps_qt_gui/CMakeLists.txt`
- Create: `outputs/sps_qt_gui/src/main.cpp`
- Create: `outputs/构建并打开SP-S-Qt模拟.command`
- Test: `work/test_sps_qt_gui.sh`

- [x] Add CMake project using Qt6 Widgets and OpenGLWidgets.
- [x] Add a minimal `main.cpp` that launches `MainWindow`.
- [x] Add build script that configures with `-DCMAKE_PREFIX_PATH=/opt/homebrew/opt/qt`.
- [x] Verify the `.app` bundle is generated.

### Task 2: C++ Motion Model

**Files:**
- Create: `outputs/sps_qt_gui/src/SpsModel.h`
- Create: `outputs/sps_qt_gui/src/SpsModel.cpp`

- [x] Port constants and pose calculation from `outputs/lingzhu-control/model.mjs`.
- [x] Include angle clamp, preset, actuator stroke, displayed tool point, linkage solve, and linear target solve.
- [x] Verify default pose and key values match the existing command-line C++ test.

### Task 3: HTML-Aligned Qt UI

**Files:**
- Create: `outputs/sps_qt_gui/src/MainWindow.h`
- Create: `outputs/sps_qt_gui/src/MainWindow.cpp`
- Create: `outputs/sps_qt_gui/src/StageView.h`
- Create: `outputs/sps_qt_gui/src/StageView.cpp`

- [x] Build left panel with title, READY status, mode segmented buttons, angle controls, stroke controls, linear controls, and presets.
- [x] Build center stage with black background, HUDs, axis labels, view buttons, model/path drawing.
- [x] Build right panel with model display toggles, effect selector, collapsible model tuners, and metric readouts.
- [x] Apply Qt stylesheet approximating `outputs/lingzhu-control/styles.css`.

### Task 4: Verification

**Files:**
- Modify: `work/test_sps_qt_gui.sh`

- [x] Build the app with CMake.
- [x] Confirm executable and bundle exist.
- [x] Run model CLI smoke checks through the Qt model where practical.
