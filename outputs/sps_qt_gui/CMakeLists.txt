cmake_minimum_required(VERSION 3.21)
project(sps_qt_gui LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets OpenGLWidgets WebEngineWidgets)
find_package(assimp REQUIRED)

qt_add_executable(sps_qt_gui MACOSX_BUNDLE
  src/main.cpp
  src/MainWindow.cpp
  src/MainWindow.h
  src/HybridStageView.cpp
  src/HybridStageView.h
  src/GlStageView.cpp
  src/GlStageView.h
  src/GlbWireMesh.cpp
  src/GlbWireMesh.h
  src/SpsModel.cpp
  src/SpsModel.h
  src/StageView.cpp
  src/StageView.h
)

target_link_libraries(sps_qt_gui PRIVATE Qt6::Widgets Qt6::OpenGLWidgets Qt6::WebEngineWidgets assimp::assimp)
target_compile_definitions(sps_qt_gui PRIVATE GL_SILENCE_DEPRECATION)

set_target_properties(sps_qt_gui PROPERTIES
  MACOSX_BUNDLE_GUI_IDENTIFIER local.sps.qt.simulator
  MACOSX_BUNDLE_BUNDLE_NAME "SP-S Qt模拟"
  MACOSX_BUNDLE_SHORT_VERSION_STRING "1.0"
  MACOSX_BUNDLE_BUNDLE_VERSION "1.0"
)
