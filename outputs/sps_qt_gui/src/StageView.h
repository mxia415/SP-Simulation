#pragma once

#include "GlbWireMesh.h"
#include "SpsModel.h"

#include <QWidget>
#include <map>

class StageView : public QWidget {
  Q_OBJECT

 public:
  enum class ViewMode { Default3D, Top, FrontXZ, SideYZ };

  explicit StageView(QWidget *parent = nullptr);

  void setPose(const sps::Pose &pose);
  void setPath(const sps::Point &start, const sps::Point &end, double progress, bool visible);
  void setViewMode(ViewMode mode);
  void setShowBallStick(bool show);
  void setActuatorOnly(bool actuatorOnly);
  void setSolidModelEffect(bool solid);

 protected:
  void paintEvent(QPaintEvent *event) override;
  void mousePressEvent(QMouseEvent *event) override;
  void mouseMoveEvent(QMouseEvent *event) override;
  void mouseReleaseEvent(QMouseEvent *event) override;
  void wheelEvent(QWheelEvent *event) override;
  void mouseDoubleClickEvent(QMouseEvent *event) override;

 private:
  QPointF project(const sps::Point &point) const;
  void drawLine(QPainter &painter, sps::Point a, sps::Point b, const QColor &color, qreal width) const;
  void drawJoint(QPainter &painter, sps::Point point, const QColor &color, qreal radius) const;
  void drawMappedMesh(QPainter &painter, const GlbWireMesh &mesh, sps::Point start, sps::Point end, const QColor &edgeColor, const QColor &fillColor, qreal width, double thickness) const;
  void drawPlacedMesh(QPainter &painter, const GlbWireMesh &mesh, sps::Point center, double widthMm, double heightMm, const QColor &edgeColor, const QColor &fillColor, qreal lineWidth) const;
  void drawSegmentSolid(QPainter &painter, sps::Point start, sps::Point end, double thickness, const QColor &edgeColor, const QColor &fillColor, qreal edgeWidth) const;
  void drawBaseSolid(QPainter &painter, sps::Point center, double widthMm, double heightMm, const QColor &edgeColor, const QColor &fillColor) const;
  sps::Point mapMeshPoint(const GlbWireMesh &mesh, sps::Point local, sps::Point start, sps::Point end, double thickness) const;
  sps::Point mapPlacedPoint(const GlbWireMesh &mesh, sps::Point local, sps::Point center, double widthMm, double heightMm) const;
  double axisValue(sps::Point point, int axis) const;

  sps::Pose pose_;
  std::map<QString, GlbWireMesh> meshes_;
  sps::Point pathStart_{};
  sps::Point pathEnd_{};
  double pathProgress_ = 0.0;
  bool pathVisible_ = false;
  bool showBallStick_ = true;
  bool actuatorOnly_ = false;
  bool solidModelEffect_ = true;
  ViewMode viewMode_ = ViewMode::Default3D;
  QPoint lastMousePos_;
  QPointF pan_{0.0, 0.0};
  double zoom_ = 1.0;
  double yawDegrees_ = 0.0;
  bool dragging_ = false;
  bool rotating_ = false;
};
