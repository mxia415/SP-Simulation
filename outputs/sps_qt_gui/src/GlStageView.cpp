#include "GlStageView.h"

#include <QMouseEvent>
#include <QQuaternion>
#include <QWheelEvent>
#include <QtMath>

#include <algorithm>
#include <cmath>

namespace {

constexpr float kHtmlReferenceX = -3.05f;
constexpr float kHtmlReferenceY = -1.59f;
constexpr float kHtmlReferenceZ = -0.135f;
constexpr float kHtmlReferenceRzDegrees = -90.0f;
constexpr sps::Point kBaseLinkPivot{118.258, 0.0, 0.0};

QVector3D normalForTriangle(const float *v) {
  const QVector3D a(v[0], v[1], v[2]);
  const QVector3D b(v[3], v[4], v[5]);
  const QVector3D c(v[6], v[7], v[8]);
  QVector3D normal = QVector3D::normal(b - a, c - a);
  if (normal.lengthSquared() < 0.000001f) return QVector3D(0, 1, 0);
  return normal;
}

QVector3D scenePoint(sps::Point point) {
  return QVector3D(static_cast<float>(point.x / 1000.0), static_cast<float>(point.z / 1000.0), static_cast<float>(point.y / 1000.0));
}

QMatrix4x4 segmentFollowMatrix(sps::Point referenceStart, sps::Point referenceEnd, sps::Point currentStart, sps::Point currentEnd) {
  const QVector3D refStart = scenePoint(referenceStart);
  const QVector3D refEnd = scenePoint(referenceEnd);
  const QVector3D curStart = scenePoint(currentStart);
  const QVector3D curEnd = scenePoint(currentEnd);
  QVector3D refDir = refEnd - refStart;
  QVector3D curDir = curEnd - curStart;
  if (refDir.lengthSquared() < 0.000001f || curDir.lengthSquared() < 0.000001f) {
    QMatrix4x4 translateOnly;
    translateOnly.translate(curStart - refStart);
    return translateOnly;
  }

  refDir.normalize();
  curDir.normalize();
  const QQuaternion rotation = QQuaternion::rotationTo(refDir, curDir);
  QMatrix4x4 matrix;
  matrix.translate(curStart);
  matrix.rotate(rotation);
  matrix.translate(-refStart);
  return matrix;
}

}  // namespace

GlStageView::GlStageView(QWidget *parent) : QOpenGLWidget(parent) {
  setMinimumSize(560, 520);
  setFocusPolicy(Qt::StrongFocus);
  interactionResetTimer_.setSingleShot(true);
  interactionResetTimer_.setInterval(160);
  connect(&interactionResetTimer_, &QTimer::timeout, this, [this] {
    interacting_ = false;
    update();
  });
}

void GlStageView::setPose(const sps::Pose &pose) {
  pose_ = pose;
  update();
}

void GlStageView::setSolidModelEffect(bool solid) {
  solidModelEffect_ = solid;
  update();
}

void GlStageView::setModelsVisible(bool visible) {
  modelsVisible_ = visible;
  update();
}

void GlStageView::setModelVisible(const QString &assetName, bool visible) {
  modelPoses_[assetName].visible = visible;
  update();
}

void GlStageView::setModelTransform(const QString &assetName, double x, double y, double z, double rx, double ry, double rz, double scale) {
  ModelPose &pose = modelPoses_[assetName];
  pose.x = x;
  pose.y = y;
  pose.z = z;
  pose.rx = rx;
  pose.ry = ry;
  pose.rz = rz;
  pose.scale = std::max(0.01, scale);
  update();
}

void GlStageView::resetModelTransform(const QString &assetName) {
  const bool visible = modelPoses_[assetName].visible;
  modelPoses_[assetName] = ModelPose{};
  modelPoses_[assetName].visible = visible;
  update();
}

void GlStageView::setViewPreset(const QString &preset) {
  viewPreset_ = preset;
  if (preset == "TOP") {
    yaw_ = 0.0f;
    pitch_ = -89.0f;
    distance_ = 10.5f;
  } else if (preset == "XZ") {
    yaw_ = 0.0f;
    pitch_ = 0.0f;
    distance_ = 10.5f;
  } else if (preset == "YZ") {
    yaw_ = 90.0f;
    pitch_ = 0.0f;
    distance_ = 10.5f;
  } else {
    yaw_ = -28.0f;
    pitch_ = -12.0f;
    distance_ = 8.8f;
  }
  update();
}

GlStageView::GlMesh GlStageView::makeMesh(const QString &assetName, int maxTriangles) {
  const QString loadName = assetName == "base.glb" ? QStringLiteral("base_local.stl") : assetName;
  const GlbWireMesh source = loadGlbWireMesh(loadName, 1, maxTriangles);
  GlMesh mesh;
  mesh.min = source.min;
  mesh.max = source.max;
  mesh.sourcePath = source.sourcePath;
  mesh.loaded = source.loaded && !source.triangles.empty();
  if (!mesh.loaded) return mesh;
  mesh.vertices.reserve(source.triangles.size() * 9);
  for (const auto &triangle : source.triangles) {
    for (sps::Point point : {triangle.a, triangle.b, triangle.c}) {
      mesh.vertices.push_back(static_cast<float>(point.x));
      mesh.vertices.push_back(static_cast<float>(point.y));
      mesh.vertices.push_back(static_cast<float>(point.z));
    }
  }
  return mesh;
}

void GlStageView::initializeGL() {
  initializeOpenGLFunctions();
  glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
  glEnable(GL_DEPTH_TEST);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
  glEnable(GL_NORMALIZE);
  glEnable(GL_COLOR_MATERIAL);
  glColorMaterial(GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE);
  glEnable(GL_LIGHT0);
  const GLfloat lightPosition[] = {3.5f, 7.0f, 4.5f, 0.0f};
  const GLfloat lightDiffuse[] = {0.74f, 0.78f, 0.76f, 1.0f};
  const GLfloat ambient[] = {0.28f, 0.31f, 0.30f, 1.0f};
  glLightfv(GL_LIGHT0, GL_POSITION, lightPosition);
  glLightfv(GL_LIGHT0, GL_DIFFUSE, lightDiffuse);
  glLightModelfv(GL_LIGHT_MODEL_AMBIENT, ambient);

  const QStringList assets{
      "base.glb",
      "base_link.glb",
      "arm1.glb",
      "arm2.glb",
      "arm3.glb",
      "tool.glb",
      "cyl1_xn_base.glb",
      "cyl1_xn_end.glb",
      "cyl1_xp_base.glb",
      "cyl1_xp_end.glb",
      "cyl2_xn_base.glb",
      "cyl2_xn_end.glb",
      "cyl2_xp_base.glb",
      "cyl2_xp_end.glb",
      "cyl3_mid_base.glb",
      "cyl3_mid_end.glb",
      "link_a1_xn.glb",
      "link_a1_xp.glb",
      "link_a2_mid.glb",
      "link_b1_xn.glb",
      "link_b1_xp.glb",
      "link_b2_mid.glb",
  };
  for (const QString &asset : assets) {
    meshes_.emplace(asset, makeMesh(asset, 220000));
    modelPoses_.emplace(asset, ModelPose{});
  }
}

void GlStageView::resizeGL(int width, int height) {
  glViewport(0, 0, width, height);
}

QMatrix4x4 GlStageView::htmlReferenceModelMatrix() const {
  QMatrix4x4 matrix;
  matrix.translate(kHtmlReferenceX, kHtmlReferenceY, kHtmlReferenceZ);
  matrix.rotate(kHtmlReferenceRzDegrees, 0.0f, 1.0f, 0.0f);
  return matrix;
}

QMatrix4x4 GlStageView::followMatrixForAsset(const QString &assetName, const QMatrix4x4 &referenceModel) const {
  const sps::Pose referencePose = sps::computePose(sps::kDefaultState);
  const QVector3D basePivot = scenePoint(kBaseLinkPivot);
  const float baseDelta = static_cast<float>(pose_.state.base - referencePose.state.base);

  QMatrix4x4 baseRotation;
  baseRotation.translate(basePivot);
  baseRotation.rotate(baseDelta, 0.0f, 1.0f, 0.0f);
  baseRotation.translate(-basePivot);

  if (assetName == "base.glb") return referenceModel;
  if (assetName == "base_link.glb") return baseRotation * referenceModel;

  auto segmentFollow = [&](sps::Point referenceStart, sps::Point referenceEnd, sps::Point currentStart, sps::Point currentEnd) {
    return baseRotation * segmentFollowMatrix(referenceStart, referenceEnd, currentStart, currentEnd) * referenceModel;
  };

  if (assetName == "cyl1_xn_base.glb" || assetName == "cyl1_xp_base.glb") {
    return segmentFollow(referencePose.actuator1.tail, referencePose.actuator1.front, pose_.actuator1.tail, pose_.actuator1.front);
  }
  if (assetName == "cyl1_xn_end.glb" || assetName == "cyl1_xp_end.glb") {
    return segmentFollow(referencePose.actuator1.front, referencePose.actuator1.tail, pose_.actuator1.front, pose_.actuator1.tail);
  }
  if (assetName == "cyl2_xn_base.glb" || assetName == "cyl2_xp_base.glb") {
    return segmentFollow(referencePose.actuator2.tail, referencePose.actuator2.front, pose_.actuator2.tail, pose_.actuator2.front);
  }
  if (assetName == "cyl2_xn_end.glb" || assetName == "cyl2_xp_end.glb") {
    return segmentFollow(referencePose.actuator2.front, referencePose.actuator2.tail, pose_.actuator2.front, pose_.actuator2.tail);
  }
  if (assetName == "cyl3_mid_base.glb") {
    return segmentFollow(referencePose.actuator3.tail, referencePose.actuator3.front, pose_.actuator3.tail, pose_.actuator3.front);
  }
  if (assetName == "cyl3_mid_end.glb") {
    return segmentFollow(referencePose.actuator3.front, referencePose.actuator3.tail, pose_.actuator3.front, pose_.actuator3.tail);
  }
  if (assetName == "link_a1_xn.glb" || assetName == "link_a1_xp.glb") {
    return segmentFollow(referencePose.linkageA.link1Anchor, referencePose.linkageA.common, pose_.linkageA.link1Anchor, pose_.linkageA.common);
  }
  if (assetName == "link_a2_mid.glb") {
    return segmentFollow(referencePose.linkageA.link2Anchor, referencePose.linkageA.common, pose_.linkageA.link2Anchor, pose_.linkageA.common);
  }
  if (assetName == "link_b1_xn.glb" || assetName == "link_b1_xp.glb") {
    return segmentFollow(referencePose.linkageB.link1Anchor, referencePose.linkageB.common, pose_.linkageB.link1Anchor, pose_.linkageB.common);
  }
  if (assetName == "link_b2_mid.glb") {
    return segmentFollow(referencePose.linkageB.link2Anchor, referencePose.linkageB.common, pose_.linkageB.link2Anchor, pose_.linkageB.common);
  }

  if (assetName == "arm1.glb") {
    return segmentFollow(referencePose.joints[0], referencePose.joints[1], pose_.joints[0], pose_.joints[1]);
  }
  if (assetName == "arm2.glb") {
    return segmentFollow(referencePose.joints[1], referencePose.joints[2], pose_.joints[1], pose_.joints[2]);
  }
  if (assetName == "arm3.glb") {
    return segmentFollow(referencePose.joints[2], referencePose.joints[3], pose_.joints[2], pose_.joints[3]);
  }
  if (assetName == "tool.glb") {
    return segmentFollow(referencePose.joints[3], referencePose.toolCenter, pose_.joints[3], pose_.toolCenter);
  }

  int jointIndex = -1;
  float angleDelta = 0.0f;
  if (assetName == "arm1.glb") {
    jointIndex = 0;
    angleDelta = static_cast<float>(pose_.absoluteAngles.arm1 - referencePose.absoluteAngles.arm1);
  } else if (assetName == "arm2.glb") {
    jointIndex = 1;
    angleDelta = static_cast<float>(pose_.absoluteAngles.arm2 - referencePose.absoluteAngles.arm2);
  } else if (assetName == "arm3.glb") {
    jointIndex = 2;
    angleDelta = static_cast<float>(pose_.absoluteAngles.arm3 - referencePose.absoluteAngles.arm3);
  } else if (assetName == "tool.glb") {
    jointIndex = 3;
    angleDelta = static_cast<float>(pose_.absoluteAngles.tool - referencePose.absoluteAngles.tool);
  }

  if (jointIndex < 0) return baseRotation * referenceModel;

  const QVector3D currentAnchor = scenePoint(pose_.joints[static_cast<size_t>(jointIndex)]);
  const QVector3D referenceAnchor = scenePoint(referencePose.joints[static_cast<size_t>(jointIndex)]);
  QMatrix4x4 jointFollow;
  jointFollow.translate(currentAnchor);
  jointFollow.rotate(angleDelta, 0.0f, 0.0f, 1.0f);
  jointFollow.translate(-referenceAnchor);
  return baseRotation * jointFollow * referenceModel;
}

QMatrix4x4 GlStageView::finalModelMatrix(const ModelPose &pose, const QMatrix4x4 &baseModel) const {
  QMatrix4x4 matrix = baseModel;
  matrix.translate(static_cast<float>(pose.x / 1000.0), static_cast<float>(pose.z / 1000.0), static_cast<float>(pose.y / 1000.0));
  matrix.rotate(static_cast<float>(pose.rx), 1.0f, 0.0f, 0.0f);
  matrix.rotate(static_cast<float>(pose.ry), 0.0f, 1.0f, 0.0f);
  matrix.rotate(static_cast<float>(pose.rz), 0.0f, 0.0f, 1.0f);
  matrix.scale(static_cast<float>(pose.scale));
  return matrix;
}

void GlStageView::drawMeshSolid(const GlMesh &mesh, const ModelPose &pose, const QMatrix4x4 &model, const QVector3D &color) {
  if (!modelsVisible_ || !pose.visible || !mesh.loaded || mesh.vertices.empty()) return;
  glDisable(GL_BLEND);
  glDepthMask(GL_TRUE);
  glDisable(GL_CULL_FACE);
  glDisable(GL_LIGHTING);
  glMatrixMode(GL_MODELVIEW);
  glPushMatrix();
  const QMatrix4x4 finalModel = finalModelMatrix(pose, model);
  glMultMatrixf(finalModel.constData());
  glColor4f(color.x(), color.y(), color.z(), 1.0f);
  glBegin(GL_TRIANGLES);
  for (size_t i = 0; i + 8 < mesh.vertices.size(); i += 9) {
    const QVector3D normal = normalForTriangle(&mesh.vertices[i]);
    glNormal3f(normal.x(), normal.y(), normal.z());
    glVertex3f(mesh.vertices[i], mesh.vertices[i + 1], mesh.vertices[i + 2]);
    glVertex3f(mesh.vertices[i + 3], mesh.vertices[i + 4], mesh.vertices[i + 5]);
    glVertex3f(mesh.vertices[i + 6], mesh.vertices[i + 7], mesh.vertices[i + 8]);
  }
  glEnd();
  glDepthMask(GL_TRUE);
  glDisable(GL_BLEND);
  glPopMatrix();
}

void GlStageView::appendMeshTriangles(const GlMesh &mesh, const ModelPose &pose, const QMatrix4x4 &model, const QVector3D &color, const QVector3D &eye, const QVector3D &forward, int triangleStride, std::vector<RenderTriangle> &triangles) const {
  if (!modelsVisible_ || !pose.visible || !mesh.loaded || mesh.vertices.empty()) return;
  const QMatrix4x4 finalModel = finalModelMatrix(pose, model);
  const size_t step = static_cast<size_t>(std::max(1, triangleStride)) * 9;
  triangles.reserve(triangles.size() + mesh.vertices.size() / step);
  for (size_t i = 0; i + 8 < mesh.vertices.size(); i += step) {
    const QVector3D a = finalModel.map(QVector3D(mesh.vertices[i], mesh.vertices[i + 1], mesh.vertices[i + 2]));
    const QVector3D b = finalModel.map(QVector3D(mesh.vertices[i + 3], mesh.vertices[i + 4], mesh.vertices[i + 5]));
    const QVector3D c = finalModel.map(QVector3D(mesh.vertices[i + 6], mesh.vertices[i + 7], mesh.vertices[i + 8]));
    const QVector3D center = (a + b + c) / 3.0f;
    triangles.push_back({a, b, c, color, QVector3D::dotProduct(center - eye, forward)});
  }
}

void GlStageView::drawTransparentTriangles(std::vector<RenderTriangle> &triangles) {
  std::sort(triangles.begin(), triangles.end(), [](const RenderTriangle &left, const RenderTriangle &right) {
    return left.depth > right.depth;
  });
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
  glDepthMask(GL_FALSE);
  glDisable(GL_CULL_FACE);
  glDisable(GL_LIGHTING);
  glMatrixMode(GL_MODELVIEW);
  glColor4f(1.0f, 1.0f, 1.0f, 0.16f);
  glBegin(GL_TRIANGLES);
  for (const RenderTriangle &triangle : triangles) {
    glColor4f(triangle.color.x(), triangle.color.y(), triangle.color.z(), 0.16f);
    glVertex3f(triangle.a.x(), triangle.a.y(), triangle.a.z());
    glVertex3f(triangle.b.x(), triangle.b.y(), triangle.b.z());
    glVertex3f(triangle.c.x(), triangle.c.y(), triangle.c.z());
  }
  glEnd();
  glDepthMask(GL_TRUE);
  glDisable(GL_BLEND);
}

void GlStageView::drawMeshTransparentFast(const GlMesh &mesh, const ModelPose &pose, const QMatrix4x4 &model, const QVector3D &color, int triangleStride) {
  if (!modelsVisible_ || !pose.visible || !mesh.loaded || mesh.vertices.empty()) return;
  const size_t step = static_cast<size_t>(std::max(1, triangleStride)) * 9;
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
  glDepthMask(GL_FALSE);
  glDisable(GL_CULL_FACE);
  glDisable(GL_LIGHTING);
  glMatrixMode(GL_MODELVIEW);
  glPushMatrix();
  const QMatrix4x4 finalModel = finalModelMatrix(pose, model);
  glMultMatrixf(finalModel.constData());
  glColor4f(color.x(), color.y(), color.z(), 0.18f);
  glBegin(GL_TRIANGLES);
  for (size_t i = 0; i + 8 < mesh.vertices.size(); i += step) {
    glVertex3f(mesh.vertices[i], mesh.vertices[i + 1], mesh.vertices[i + 2]);
    glVertex3f(mesh.vertices[i + 3], mesh.vertices[i + 4], mesh.vertices[i + 5]);
    glVertex3f(mesh.vertices[i + 6], mesh.vertices[i + 7], mesh.vertices[i + 8]);
  }
  glEnd();
  glPopMatrix();
  glDepthMask(GL_TRUE);
  glDisable(GL_BLEND);
}

void GlStageView::drawAsset(const QString &assetName, const QMatrix4x4 &baseModel, const QVector3D &color) {
  drawMeshSolid(meshes_[assetName], modelPoses_[assetName], followMatrixForAsset(assetName, baseModel), color);
}

void GlStageView::drawAssetTransparentFast(const QString &assetName, const QMatrix4x4 &baseModel, const QVector3D &color, int triangleStride) {
  drawMeshTransparentFast(meshes_[assetName], modelPoses_[assetName], followMatrixForAsset(assetName, baseModel), color, triangleStride);
}

void GlStageView::appendAsset(const QString &assetName, const QMatrix4x4 &baseModel, const QVector3D &color, const QVector3D &eye, const QVector3D &forward, int triangleStride, std::vector<RenderTriangle> &triangles) const {
  const auto mesh = meshes_.find(assetName);
  const auto pose = modelPoses_.find(assetName);
  if (mesh == meshes_.end() || pose == modelPoses_.end()) return;
  appendMeshTriangles(mesh->second, pose->second, followMatrixForAsset(assetName, baseModel), color, eye, forward, triangleStride, triangles);
}

void GlStageView::paintGL() {
  glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

  QMatrix4x4 projection;
  projection.perspective(42.0f, std::max(0.1f, width() / static_cast<float>(std::max(1, height()))), 0.05f, 80.0f);

  const float yaw = qDegreesToRadians(yaw_);
  const float pitch = qDegreesToRadians(pitch_);
  QVector3D eye;
  if (viewPreset_ == "TOP") {
    eye = target_ + QVector3D(0.0f, distance_, 0.0001f);
  } else if (viewPreset_ == "XZ") {
    eye = target_ + QVector3D(0.0f, 0.0f, distance_);
  } else if (viewPreset_ == "YZ") {
    eye = target_ + QVector3D(distance_, 0.0f, 0.0f);
  } else {
    eye = {
        target_.x() + distance_ * std::cos(pitch) * std::sin(yaw),
        target_.y() + distance_ * std::sin(pitch),
        target_.z() + distance_ * std::cos(pitch) * std::cos(yaw),
    };
  }
  QMatrix4x4 view;
  view.lookAt(eye, target_, QVector3D(0, 1, 0));
  QVector3D forward = target_ - eye;
  if (forward.lengthSquared() < 0.000001f) {
    forward = QVector3D(0.0f, 0.0f, -1.0f);
  } else {
    forward.normalize();
  }

  glMatrixMode(GL_PROJECTION);
  glLoadMatrixf(projection.constData());
  glMatrixMode(GL_MODELVIEW);
  glLoadMatrixf(view.constData());

  glDisable(GL_LIGHTING);
  glDisable(GL_BLEND);
  glDisable(GL_CULL_FACE);
  glDepthMask(GL_TRUE);
  glColor4f(0.08f, 0.11f, 0.14f, 1.0f);
  glBegin(GL_LINES);
  for (int i = -6; i <= 6; ++i) {
    glVertex3f(i, 0, -6);
    glVertex3f(i, 0, 6);
    glVertex3f(-6, 0, i);
    glVertex3f(6, 0, i);
  }
  glEnd();

  const QMatrix4x4 referenceModel = htmlReferenceModelMatrix();
  if (solidModelEffect_) {
    drawAsset("base.glb", referenceModel, QVector3D(0.72f, 0.76f, 0.74f));
    drawAsset("base_link.glb", referenceModel, QVector3D(0.86f, 0.89f, 0.88f));
    drawAsset("arm1.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f));
    drawAsset("arm2.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f));
    drawAsset("arm3.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f));
    drawAsset("tool.glb", referenceModel, QVector3D(0.95f, 0.96f, 0.94f));
    drawAsset("cyl1_xn_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f));
    drawAsset("cyl1_xn_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f));
    drawAsset("cyl1_xp_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f));
    drawAsset("cyl1_xp_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f));
    drawAsset("cyl2_xn_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f));
    drawAsset("cyl2_xn_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f));
    drawAsset("cyl2_xp_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f));
    drawAsset("cyl2_xp_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f));
    drawAsset("cyl3_mid_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f));
    drawAsset("cyl3_mid_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f));
    drawAsset("link_a1_xn.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f));
    drawAsset("link_a1_xp.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f));
    drawAsset("link_a2_mid.glb", referenceModel, QVector3D(0.98f, 0.78f, 0.48f));
    drawAsset("link_b1_xn.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f));
    drawAsset("link_b1_xp.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f));
    drawAsset("link_b2_mid.glb", referenceModel, QVector3D(0.98f, 0.78f, 0.48f));
  } else {
    if (interacting_) {
      const int triangleStride = 3;
      drawAssetTransparentFast("base.glb", referenceModel, QVector3D(0.72f, 0.76f, 0.74f), triangleStride);
      drawAssetTransparentFast("base_link.glb", referenceModel, QVector3D(0.86f, 0.89f, 0.88f), triangleStride);
      drawAssetTransparentFast("arm1.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f), triangleStride);
      drawAssetTransparentFast("arm2.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f), triangleStride);
      drawAssetTransparentFast("arm3.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f), triangleStride);
      drawAssetTransparentFast("tool.glb", referenceModel, QVector3D(0.95f, 0.96f, 0.94f), triangleStride);
      drawAssetTransparentFast("cyl1_xn_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), triangleStride);
      drawAssetTransparentFast("cyl1_xn_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), triangleStride);
      drawAssetTransparentFast("cyl1_xp_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), triangleStride);
      drawAssetTransparentFast("cyl1_xp_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), triangleStride);
      drawAssetTransparentFast("cyl2_xn_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), triangleStride);
      drawAssetTransparentFast("cyl2_xn_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), triangleStride);
      drawAssetTransparentFast("cyl2_xp_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), triangleStride);
      drawAssetTransparentFast("cyl2_xp_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), triangleStride);
      drawAssetTransparentFast("cyl3_mid_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), triangleStride);
      drawAssetTransparentFast("cyl3_mid_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), triangleStride);
      drawAssetTransparentFast("link_a1_xn.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f), triangleStride);
      drawAssetTransparentFast("link_a1_xp.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f), triangleStride);
      drawAssetTransparentFast("link_a2_mid.glb", referenceModel, QVector3D(0.98f, 0.78f, 0.48f), triangleStride);
      drawAssetTransparentFast("link_b1_xn.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f), triangleStride);
      drawAssetTransparentFast("link_b1_xp.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f), triangleStride);
      drawAssetTransparentFast("link_b2_mid.glb", referenceModel, QVector3D(0.98f, 0.78f, 0.48f), triangleStride);
    } else {
      const int sortedStride = 2;
      std::vector<RenderTriangle> triangles;
      appendAsset("base.glb", referenceModel, QVector3D(0.72f, 0.76f, 0.74f), eye, forward, sortedStride, triangles);
      appendAsset("base_link.glb", referenceModel, QVector3D(0.86f, 0.89f, 0.88f), eye, forward, sortedStride, triangles);
      appendAsset("arm1.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f), eye, forward, sortedStride, triangles);
      appendAsset("arm2.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f), eye, forward, sortedStride, triangles);
      appendAsset("arm3.glb", referenceModel, QVector3D(0.88f, 0.91f, 0.90f), eye, forward, sortedStride, triangles);
      appendAsset("tool.glb", referenceModel, QVector3D(0.95f, 0.96f, 0.94f), eye, forward, sortedStride, triangles);
      appendAsset("cyl1_xn_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), eye, forward, sortedStride, triangles);
      appendAsset("cyl1_xn_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), eye, forward, sortedStride, triangles);
      appendAsset("cyl1_xp_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), eye, forward, sortedStride, triangles);
      appendAsset("cyl1_xp_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), eye, forward, sortedStride, triangles);
      appendAsset("cyl2_xn_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), eye, forward, sortedStride, triangles);
      appendAsset("cyl2_xn_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), eye, forward, sortedStride, triangles);
      appendAsset("cyl2_xp_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), eye, forward, sortedStride, triangles);
      appendAsset("cyl2_xp_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), eye, forward, sortedStride, triangles);
      appendAsset("cyl3_mid_base.glb", referenceModel, QVector3D(0.68f, 0.80f, 0.94f), eye, forward, sortedStride, triangles);
      appendAsset("cyl3_mid_end.glb", referenceModel, QVector3D(0.72f, 0.86f, 1.00f), eye, forward, sortedStride, triangles);
      appendAsset("link_a1_xn.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f), eye, forward, sortedStride, triangles);
      appendAsset("link_a1_xp.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f), eye, forward, sortedStride, triangles);
      appendAsset("link_a2_mid.glb", referenceModel, QVector3D(0.98f, 0.78f, 0.48f), eye, forward, sortedStride, triangles);
      appendAsset("link_b1_xn.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f), eye, forward, sortedStride, triangles);
      appendAsset("link_b1_xp.glb", referenceModel, QVector3D(0.96f, 0.72f, 0.42f), eye, forward, sortedStride, triangles);
      appendAsset("link_b2_mid.glb", referenceModel, QVector3D(0.98f, 0.78f, 0.48f), eye, forward, sortedStride, triangles);
      drawTransparentTriangles(triangles);
    }
  }
}

void GlStageView::mousePressEvent(QMouseEvent *event) {
  lastMousePos_ = event->pos();
  dragging_ = true;
  interacting_ = true;
  panning_ = (event->button() == Qt::RightButton) || (event->modifiers() & Qt::ShiftModifier);
  update();
}

void GlStageView::mouseMoveEvent(QMouseEvent *event) {
  if (!dragging_) return;
  const QPoint delta = event->pos() - lastMousePos_;
  lastMousePos_ = event->pos();
  if (panning_) {
    target_ += QVector3D(-delta.x() * 0.006f, delta.y() * 0.006f, 0.0f);
  } else {
    if (viewPreset_ != "3D视角") return;
    yaw_ += delta.x() * 0.35f;
    pitch_ = std::clamp(pitch_ + delta.y() * 0.25f, -82.0f, 82.0f);
  }
  update();
}

void GlStageView::mouseReleaseEvent(QMouseEvent *event) {
  Q_UNUSED(event);
  dragging_ = false;
  interacting_ = false;
  update();
}

void GlStageView::wheelEvent(QWheelEvent *event) {
  interacting_ = true;
  interactionResetTimer_.start();
  distance_ *= event->angleDelta().y() > 0 ? 0.88f : 1.14f;
  distance_ = std::clamp(distance_, 2.5f, 35.0f);
  update();
}

void GlStageView::mouseDoubleClickEvent(QMouseEvent *event) {
  Q_UNUSED(event);
  yaw_ = -28.0f;
  pitch_ = -12.0f;
  distance_ = 8.8f;
  target_ = QVector3D(0.8f, 2.2f, 0.0f);
  update();
}
