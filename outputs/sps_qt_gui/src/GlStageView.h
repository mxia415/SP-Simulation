#pragma once

#include "GlbWireMesh.h"
#include "SpsModel.h"

#include <QMatrix4x4>
#include <QOpenGLFunctions>
#include <QOpenGLWidget>
#include <QTimer>
#include <QVector3D>
#include <map>

class GlStageView : public QOpenGLWidget, protected QOpenGLFunctions {
  Q_OBJECT

 public:
  explicit GlStageView(QWidget *parent = nullptr);

  void setPose(const sps::Pose &pose);
  void setSolidModelEffect(bool solid);
  void setModelsVisible(bool visible);
  void setModelVisible(const QString &assetName, bool visible);
  void setModelTransform(const QString &assetName, double x, double y, double z, double rx, double ry, double rz, double scale);
  void resetModelTransform(const QString &assetName);
  void setViewPreset(const QString &preset);

 protected:
  void initializeGL() override;
  void resizeGL(int width, int height) override;
  void paintGL() override;
  void mousePressEvent(QMouseEvent *event) override;
  void mouseMoveEvent(QMouseEvent *event) override;
  void mouseReleaseEvent(QMouseEvent *event) override;
  void wheelEvent(QWheelEvent *event) override;
  void mouseDoubleClickEvent(QMouseEvent *event) override;

 private:
  struct GlMesh {
    std::vector<float> vertices;
    sps::Point min;
    sps::Point max;
    QString sourcePath;
    bool loaded = false;
  };

  struct ModelPose {
    bool visible = true;
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
    double rx = 0.0;
    double ry = 0.0;
    double rz = 0.0;
    double scale = 1.0;
  };

  struct RenderTriangle {
    QVector3D a;
    QVector3D b;
    QVector3D c;
    QVector3D color;
    float depth = 0.0f;
  };

  GlMesh makeMesh(const QString &assetName, int maxTriangles);
  QMatrix4x4 finalModelMatrix(const ModelPose &pose, const QMatrix4x4 &baseModel) const;
  void drawMeshSolid(const GlMesh &mesh, const ModelPose &pose, const QMatrix4x4 &model, const QVector3D &color);
  void appendMeshTriangles(const GlMesh &mesh, const ModelPose &pose, const QMatrix4x4 &model, const QVector3D &color, const QVector3D &eye, const QVector3D &forward, int triangleStride, std::vector<RenderTriangle> &triangles) const;
  void drawTransparentTriangles(std::vector<RenderTriangle> &triangles);
  void drawMeshTransparentFast(const GlMesh &mesh, const ModelPose &pose, const QMatrix4x4 &model, const QVector3D &color, int triangleStride);
  void drawAsset(const QString &assetName, const QMatrix4x4 &baseModel, const QVector3D &color);
  void drawAssetTransparentFast(const QString &assetName, const QMatrix4x4 &baseModel, const QVector3D &color, int triangleStride);
  void appendAsset(const QString &assetName, const QMatrix4x4 &baseModel, const QVector3D &color, const QVector3D &eye, const QVector3D &forward, int triangleStride, std::vector<RenderTriangle> &triangles) const;
  QMatrix4x4 htmlReferenceModelMatrix() const;
  QMatrix4x4 followMatrixForAsset(const QString &assetName, const QMatrix4x4 &referenceModel) const;

  std::map<QString, GlMesh> meshes_;
  std::map<QString, ModelPose> modelPoses_;
  sps::Pose pose_ = sps::computePose(sps::kDefaultState);
  QPoint lastMousePos_;
  QTimer interactionResetTimer_;
  float yaw_ = -28.0f;
  float pitch_ = -12.0f;
  float distance_ = 8.8f;
  QVector3D target_{0.8f, 2.2f, 0.0f};
  QString viewPreset_ = "3D视角";
  bool dragging_ = false;
  bool panning_ = false;
  bool interacting_ = false;
  bool solidModelEffect_ = false;
  bool modelsVisible_ = true;
};
