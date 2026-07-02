#include "MainWindow.h"
#include "GlbWireMesh.h"
#include "SpsModel.h"

#include <QApplication>
#include <QCoreApplication>
#include <QDir>
#include <QFileInfo>

#include <assimp/Importer.hpp>
#include <assimp/postprocess.h>
#include <assimp/scene.h>

#include <cmath>
#include <iostream>

namespace {

bool closeTo(double a, double b, double tolerance = 0.01) {
  return std::abs(a - b) <= tolerance;
}

int selfTest() {
  const auto pose = sps::computePose(sps::kDefaultState);
  if (!closeTo(pose.toolCenter.x, 2596.265) || !closeTo(pose.toolCenter.y, 0.0) || !closeTo(pose.toolCenter.z, 998.536)) return 1;
  if (!closeTo(pose.displayedTip.x, -2359.749) || !closeTo(pose.displayedTip.y, -262.0) || !closeTo(pose.displayedTip.z, 998.536)) return 2;
  if (!closeTo(pose.linkageA.common.x, -226.672) || !closeTo(pose.linkageA.common.z, 3695.359)) return 3;
  if (!closeTo(pose.linkageB.common.x, 2463.741) || !closeTo(pose.linkageB.common.z, 3606.735)) return 4;
  const auto stroke = sps::stateFromActuatorStrokes(1.0, 0.0, 0.5);
  if (!closeTo(stroke.arm1, 120.0) || !closeTo(stroke.arm2, 180.0) || !closeTo(stroke.arm3, 90.0)) return 5;
  const auto solve = sps::solveStateForWorldDisplayedToolTarget({380.258, -2478.007, 998.536});
  if (!solve.reachable || !closeTo(solve.state.arm1, 89.978, 0.01) || !closeTo(solve.state.base, 90.011, 0.02)) return 6;
  QStringList roots{QDir::currentPath(), QCoreApplication::applicationDirPath()};
  QDir cursor(QCoreApplication::applicationDirPath());
  for (int i = 0; i < 8; ++i) {
    roots << cursor.absolutePath();
    cursor.cdUp();
  }
  QString glbPath;
  for (const QString &root : roots) {
    const QString candidate = QDir(root).absoluteFilePath("inputs/glb-models/base.glb");
    if (QFileInfo::exists(candidate)) {
      glbPath = candidate;
      break;
    }
  }
  if (!QFileInfo::exists(glbPath)) return 7;
  Assimp::Importer importer;
  const aiScene *scene = importer.ReadFile(glbPath.toStdString(), aiProcess_Triangulate | aiProcess_JoinIdenticalVertices);
  if (!scene || scene->mNumMeshes == 0) return 8;
  const GlbWireMesh armMesh = loadGlbWireMesh("arm1.glb", 500);
  if (!armMesh.loaded || armMesh.edges.empty() || armMesh.triangles.empty()) return 9;
  std::cout << "sps_qt_gui self-test passed\n";
  return 0;
}

}  // namespace

int main(int argc, char *argv[]) {
  for (int i = 1; i < argc; ++i) {
    if (QString::fromLocal8Bit(argv[i]) == "--self-test") {
      QCoreApplication app(argc, argv);
      return selfTest();
    }
  }

  QApplication app(argc, argv);
  MainWindow window;
  window.show();
  return app.exec();
}
