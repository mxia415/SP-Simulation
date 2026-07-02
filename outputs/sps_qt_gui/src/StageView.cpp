#include "StageView.h"

#include <QPainter>
#include <QMouseEvent>
#include <QPaintEvent>
#include <QWheelEvent>

#include <algorithm>
#include <array>
#include <cmath>

StageView::StageView(QWidget *parent) : QWidget(parent), pose_(sps::computePose(sps::kDefaultState)) {
  setMinimumSize(560, 520);
  setAutoFillBackground(false);
  setMouseTracking(true);
  const QStringList assets{
      "base.glb",
      "base_link.glb",
      "arm1.glb",
      "arm2.glb",
      "arm3.glb",
      "tool.glb",
      "cyl1_xn_base.glb",
      "cyl2_xn_base.glb",
      "cyl3_mid_base.glb",
      "link_a1_xn.glb",
      "link_a2_mid.glb",
      "link_b1_xn.glb",
      "link_b2_mid.glb",
  };
  for (const QString &asset : assets) {
    meshes_.emplace(asset, loadGlbWireMesh(asset, asset == "base.glb" ? 1400 : 1900, asset == "base.glb" ? 650 : 900));
  }
}

void StageView::setPose(const sps::Pose &pose) {
  pose_ = pose;
  update();
}

void StageView::setPath(const sps::Point &start, const sps::Point &end, double progress, bool visible) {
  pathStart_ = start;
  pathEnd_ = end;
  pathProgress_ = progress;
  pathVisible_ = visible;
  update();
}

void StageView::setViewMode(ViewMode mode) {
  viewMode_ = mode;
  update();
}

void StageView::setShowBallStick(bool show) {
  showBallStick_ = show;
  update();
}

void StageView::setActuatorOnly(bool actuatorOnly) {
  actuatorOnly_ = actuatorOnly;
  update();
}

void StageView::setSolidModelEffect(bool solid) {
  solidModelEffect_ = solid;
  update();
}

void StageView::mouseDoubleClickEvent(QMouseEvent *event) {
  Q_UNUSED(event);
  pan_ = {0.0, 0.0};
  zoom_ = 1.0;
  yawDegrees_ = 0.0;
  update();
}

void StageView::mousePressEvent(QMouseEvent *event) {
  lastMousePos_ = event->pos();
  dragging_ = true;
  rotating_ = (event->button() == Qt::RightButton) || (event->modifiers() & Qt::ShiftModifier);
  setCursor(rotating_ ? Qt::SizeHorCursor : Qt::ClosedHandCursor);
}

void StageView::mouseMoveEvent(QMouseEvent *event) {
  if (!dragging_) return;
  const QPoint delta = event->pos() - lastMousePos_;
  lastMousePos_ = event->pos();
  if (rotating_) {
    yawDegrees_ += delta.x() * 0.35;
    update();
    return;
  }
  pan_ += QPointF(delta.x(), delta.y());
  update();
}

void StageView::mouseReleaseEvent(QMouseEvent *event) {
  Q_UNUSED(event);
  dragging_ = false;
  rotating_ = false;
  unsetCursor();
}

void StageView::wheelEvent(QWheelEvent *event) {
  const double factor = event->angleDelta().y() > 0 ? 1.12 : 1.0 / 1.12;
  zoom_ = std::clamp(zoom_ * factor, 0.25, 5.0);
  update();
}

QPointF StageView::project(const sps::Point &point) const {
  const double scale = std::min(width() / 7200.0, height() / 5400.0) * zoom_;
  const double cx = width() * 0.48;
  const double cy = height() * 0.78;
  double x = point.x;
  double y = point.y;
  double z = point.z;
  if (viewMode_ == ViewMode::Default3D || viewMode_ == ViewMode::Top) {
    const double yaw = yawDegrees_ * 3.14159265358979323846 / 180.0;
    const double rotatedX = x * std::cos(yaw) - y * std::sin(yaw);
    const double rotatedY = x * std::sin(yaw) + y * std::cos(yaw);
    x = rotatedX;
    y = rotatedY;
  }

  if (viewMode_ == ViewMode::Top) {
    return QPointF(cx + x * scale, height() * 0.5 - y * scale) + pan_;
  }
  if (viewMode_ == ViewMode::SideYZ) {
    return QPointF(width() * 0.5 + y * scale, cy - z * scale) + pan_;
  }
  if (viewMode_ == ViewMode::Default3D) {
    return QPointF(cx + (x + y * 0.42) * scale, cy - (z - y * 0.16) * scale) + pan_;
  }
  return QPointF(cx + x * scale, cy - z * scale) + pan_;
}

void StageView::drawLine(QPainter &painter, sps::Point a, sps::Point b, const QColor &color, qreal width) const {
  QPen pen(color, width, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
  painter.setPen(pen);
  painter.drawLine(project(a), project(b));
}

void StageView::drawJoint(QPainter &painter, sps::Point point, const QColor &color, qreal radius) const {
  painter.setPen(Qt::NoPen);
  painter.setBrush(color);
  painter.drawEllipse(project(point), radius, radius);
}

double StageView::axisValue(sps::Point point, int axis) const {
  if (axis == 0) return point.x;
  if (axis == 1) return point.y;
  return point.z;
}

sps::Point StageView::mapMeshPoint(const GlbWireMesh &mesh, sps::Point local, sps::Point start, sps::Point end, double thickness) const {
  const double dx = end.x - start.x;
  const double dz = end.z - start.z;
  const double length = std::max(1.0, std::sqrt(dx * dx + dz * dz));
  const double ux = dx / length;
  const double uz = dz / length;
  const double px = -uz;
  const double pz = ux;

  const std::array<double, 3> extent{
      std::max(0.000001, mesh.max.x - mesh.min.x),
      std::max(0.000001, mesh.max.y - mesh.min.y),
      std::max(0.000001, mesh.max.z - mesh.min.z),
  };
  int longAxis = 0;
  if (extent[1] > extent[longAxis]) longAxis = 1;
  if (extent[2] > extent[longAxis]) longAxis = 2;
  const int lateralAxisA = (longAxis + 1) % 3;
  const int lateralAxisB = (longAxis + 2) % 3;
  const std::array<double, 3> minValue{mesh.min.x, mesh.min.y, mesh.min.z};

  const double nx = (axisValue(local, longAxis) - minValue[longAxis]) / extent[longAxis];
  const double lateralA = ((axisValue(local, lateralAxisA) - minValue[lateralAxisA]) / extent[lateralAxisA]) - 0.5;
  const double lateralB = ((axisValue(local, lateralAxisB) - minValue[lateralAxisB]) / extent[lateralAxisB]) - 0.5;
  const double lateral = (lateralA * 0.65 + lateralB * 0.35) * thickness;

  return {
      start.x + ux * (nx * length) + px * lateral,
      start.y + lateralA * thickness,
      start.z + uz * (nx * length) + pz * lateral,
  };
}

void StageView::drawMappedMesh(QPainter &painter, const GlbWireMesh &mesh, sps::Point start, sps::Point end, const QColor &edgeColor, const QColor &fillColor, qreal width, double thickness) const {
  if (!mesh.loaded) return;
  painter.setPen(Qt::NoPen);
  painter.setBrush(fillColor);
  for (const auto &triangle : mesh.triangles) {
    QPolygonF polygon;
    polygon << project(mapMeshPoint(mesh, triangle.a, start, end, thickness));
    polygon << project(mapMeshPoint(mesh, triangle.b, start, end, thickness));
    polygon << project(mapMeshPoint(mesh, triangle.c, start, end, thickness));
    painter.drawPolygon(polygon);
  }
  QPen pen(edgeColor, width, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
  painter.setPen(pen);
  for (const auto &edge : mesh.edges) {
    painter.drawLine(project(mapMeshPoint(mesh, edge.a, start, end, thickness)), project(mapMeshPoint(mesh, edge.b, start, end, thickness)));
  }
}

void StageView::drawPlacedMesh(QPainter &painter, const GlbWireMesh &mesh, sps::Point center, double widthMm, double heightMm, const QColor &edgeColor, const QColor &fillColor, qreal lineWidth) const {
  if (!mesh.loaded) return;
  painter.setPen(Qt::NoPen);
  painter.setBrush(fillColor);
  for (const auto &triangle : mesh.triangles) {
    QPolygonF polygon;
    polygon << project(mapPlacedPoint(mesh, triangle.a, center, widthMm, heightMm));
    polygon << project(mapPlacedPoint(mesh, triangle.b, center, widthMm, heightMm));
    polygon << project(mapPlacedPoint(mesh, triangle.c, center, widthMm, heightMm));
    painter.drawPolygon(polygon);
  }
  QPen pen(edgeColor, lineWidth, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
  painter.setPen(pen);
  for (const auto &edge : mesh.edges) {
    painter.drawLine(project(mapPlacedPoint(mesh, edge.a, center, widthMm, heightMm)), project(mapPlacedPoint(mesh, edge.b, center, widthMm, heightMm)));
  }
}

void StageView::drawSegmentSolid(QPainter &painter, sps::Point start, sps::Point end, double thickness, const QColor &edgeColor, const QColor &fillColor, qreal edgeWidth) const {
  const double dx = end.x - start.x;
  const double dz = end.z - start.z;
  const double length = std::max(1.0, std::sqrt(dx * dx + dz * dz));
  const double px = -dz / length * thickness * 0.5;
  const double pz = dx / length * thickness * 0.5;
  const sps::Point a{start.x + px, start.y, start.z + pz};
  const sps::Point b{end.x + px, end.y, end.z + pz};
  const sps::Point c{end.x - px, end.y, end.z - pz};
  const sps::Point d{start.x - px, start.y, start.z - pz};

  QPolygonF body;
  body << project(a) << project(b) << project(c) << project(d);
  painter.setPen(QPen(edgeColor, edgeWidth, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
  painter.setBrush(fillColor);
  painter.drawPolygon(body);
  painter.setBrush(fillColor.lighter(115));
  painter.drawEllipse(project(start), std::max(3.0, thickness * zoom_ / 95.0), std::max(3.0, thickness * zoom_ / 95.0));
  painter.drawEllipse(project(end), std::max(3.0, thickness * zoom_ / 95.0), std::max(3.0, thickness * zoom_ / 95.0));
}

void StageView::drawBaseSolid(QPainter &painter, sps::Point center, double widthMm, double heightMm, const QColor &edgeColor, const QColor &fillColor) const {
  const double halfW = widthMm * 0.5;
  const double halfH = heightMm * 0.5;
  QPolygonF body;
  body << project({center.x - halfW, center.y, center.z - halfH})
       << project({center.x + halfW, center.y, center.z - halfH * 0.65})
       << project({center.x + halfW * 0.82, center.y, center.z + halfH})
       << project({center.x - halfW * 0.82, center.y, center.z + halfH});
  painter.setPen(QPen(edgeColor, 1.2, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
  painter.setBrush(fillColor);
  painter.drawPolygon(body);
}

sps::Point StageView::mapPlacedPoint(const GlbWireMesh &mesh, sps::Point local, sps::Point center, double widthMm, double heightMm) const {
  const double sourceX = std::max(1.0, mesh.max.x - mesh.min.x);
  const double sourceZ = std::max(1.0, mesh.max.z - mesh.min.z);
  const double nx = ((local.x - mesh.min.x) / sourceX) - 0.5;
  const double nz = ((local.z - mesh.min.z) / sourceZ) - 0.5;
  return {center.x + nx * widthMm, center.y, center.z + nz * heightMm};
}

void StageView::paintEvent(QPaintEvent *event) {
  Q_UNUSED(event);
  QPainter painter(this);
  painter.setRenderHint(QPainter::Antialiasing, true);
  painter.fillRect(rect(), QColor(0, 0, 0));

  painter.setPen(QPen(QColor(30, 34, 40), 1));
  for (int i = 0; i < 14; ++i) {
    const int y = static_cast<int>(height() * 0.15 + i * height() * 0.06);
    painter.drawLine(0, y, width(), y);
  }
  for (int i = 0; i < 12; ++i) {
    const int x = static_cast<int>(i * width() / 11.0);
    painter.drawLine(x, 0, x, height());
  }

  painter.setPen(QColor(168, 177, 190));
  painter.setFont(QFont("Arial", 11, QFont::Medium));
  painter.drawText(22, 26, "GH Chain");
  painter.setPen(Qt::white);
  painter.setFont(QFont("Menlo", 17, QFont::Bold));
  painter.drawText(22, 52, QString("%1 / %2 / %3 / %4 / %5")
                             .arg(pose_.state.arm1, 0, 'f', 0)
                             .arg(pose_.state.arm2, 0, 'f', 0)
                             .arg(pose_.state.arm3, 0, 'f', 0)
                             .arg(pose_.state.offset, 0, 'f', 0)
                             .arg(pose_.state.base, 0, 'f', 0));

  const QColor armColor(88, 154, 255);
  const QColor toolColor(50, 224, 151);
  const QColor actuatorColor(255, 181, 76);
  const QColor linkageColor(180, 128, 255);
  const QColor pathColor(79, 140, 255);
  const QColor modelFill = solidModelEffect_ ? QColor(232, 238, 235, 68) : QColor(125, 172, 218, 30);
  const QColor modelEdge = solidModelEffect_ ? QColor(228, 235, 232, 158) : QColor(122, 184, 255, 110);
  const QColor toolFill = solidModelEffect_ ? QColor(244, 245, 243, 86) : QColor(80, 224, 170, 36);
  const QColor actuatorFill = solidModelEffect_ ? QColor(255, 181, 76, 60) : QColor(255, 181, 76, 30);
  const QColor linkageFill = solidModelEffect_ ? QColor(180, 128, 255, 58) : QColor(180, 128, 255, 28);

  if (showBallStick_ && !actuatorOnly_) {
    drawBaseSolid(painter, {-450, 0, 170}, 1500, 560, modelEdge, modelFill);
    drawSegmentSolid(painter, {118, 0, 180}, pose_.joints[0], 360, modelEdge, modelFill, 1.0);
    drawSegmentSolid(painter, pose_.joints[0], pose_.joints[1], 390, modelEdge, modelFill, 1.0);
    drawSegmentSolid(painter, pose_.joints[1], pose_.joints[2], 340, modelEdge, modelFill, 1.0);
    drawSegmentSolid(painter, pose_.joints[2], pose_.joints[3], 300, modelEdge, modelFill, 1.0);
    drawSegmentSolid(painter, pose_.joints[3], pose_.toolCenter, 250, QColor(240, 245, 243, 172), toolFill, 1.0);
  }

  drawSegmentSolid(painter, pose_.actuator1.tail, pose_.actuator1.front, 90, actuatorColor.lighter(115), actuatorFill, 1.0);
  drawSegmentSolid(painter, pose_.actuator2.tail, pose_.actuator2.front, 90, actuatorColor.lighter(115), actuatorFill, 1.0);
  drawSegmentSolid(painter, pose_.actuator3.tail, pose_.actuator3.front, 90, actuatorColor.lighter(115), actuatorFill, 1.0);

  if (showBallStick_ && !actuatorOnly_) {
    drawSegmentSolid(painter, pose_.linkageA.link1Anchor, pose_.linkageA.common, 80, linkageColor.lighter(115), linkageFill, 1.0);
    drawSegmentSolid(painter, pose_.linkageA.link2Anchor, pose_.linkageA.common, 70, linkageColor.lighter(115), linkageFill, 1.0);
    drawSegmentSolid(painter, pose_.linkageB.link1Anchor, pose_.linkageB.common, 80, linkageColor.lighter(115), linkageFill, 1.0);
    drawSegmentSolid(painter, pose_.linkageB.link2Anchor, pose_.linkageB.common, 70, linkageColor.lighter(115), linkageFill, 1.0);

    for (const sps::Point &joint : pose_.joints) {
      drawJoint(painter, joint, Qt::white, 5);
    }
    drawJoint(painter, pose_.toolCenter, toolColor, 6);
  }

  if (!showBallStick_ || actuatorOnly_) {
    drawLine(painter, pose_.actuator1.tail, pose_.actuator1.front, actuatorColor, 2);
    drawLine(painter, pose_.actuator2.tail, pose_.actuator2.front, actuatorColor, 2);
    drawLine(painter, pose_.actuator3.tail, pose_.actuator3.front, actuatorColor, 2);
  }

  if (pathVisible_) {
    drawLine(painter, pathStart_, pathEnd_, pathColor, 3);
    drawJoint(painter, pathStart_, QColor(230, 235, 245), 5);
    drawJoint(painter, pathEnd_, toolColor, 6);
    drawJoint(painter, sps::lerp(pathStart_, pathEnd_, pathProgress_ / 100.0), pathColor, 7);
  }

  painter.setPen(QColor(180, 190, 204));
  painter.setFont(QFont("Arial", 11, QFont::Medium));
  painter.drawText(22, height() - 42, "Tip XYZ");
  painter.setPen(Qt::white);
  painter.setFont(QFont("Menlo", 15, QFont::Bold));
  painter.drawText(22, height() - 18, QString("%1 / %2 / %3 mm")
                                       .arg(pose_.displayedTip.x, 0, 'f', 0)
                                       .arg(pose_.displayedTip.y, 0, 'f', 0)
                                       .arg(pose_.displayedTip.z, 0, 'f', 0));

  painter.setFont(QFont("Arial", 12, QFont::Bold));
  painter.setPen(QColor(255, 101, 91));
  painter.drawText(width() - 86, height() - 70, "X");
  painter.setPen(QColor(80, 210, 136));
  painter.drawText(width() - 58, height() - 44, "Y");
  painter.setPen(QColor(80, 160, 255));
  painter.drawText(width() - 32, height() - 70, "Z");
}
