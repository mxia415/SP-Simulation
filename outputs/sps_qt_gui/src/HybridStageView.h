#pragma once

#include "SpsModel.h"

#include <QWidget>

#include <functional>

class QWebEngineView;

class HybridStageView : public QWidget {
  Q_OBJECT

 public:
  explicit HybridStageView(QWidget *parent = nullptr);

  void setPose(const sps::Pose &pose);
  void setSolidModelEffect(bool solid);
  void setModelsVisible(bool visible);
  void setActuatorBallStickOnly(bool actuatorOnly);
  void setKeepToolVertical(bool keepVertical);
  void setModelVisible(const QString &assetName, bool visible);
  void setModelTransform(const QString &assetName, double x, double y, double z, double rx, double ry, double rz, double scale);
  void resetModelTransform(const QString &assetName);
  void setViewPreset(const QString &preset);
  void setDriveMode(const QString &mode);
  void setLinearPath(sps::Point start, sps::Point end, double progress, double speed, double error);
  void requestCurrentPose(std::function<void(sps::State state, sps::Point displayedTip, bool ok)> callback);

 private:
  void loadStage();
  void runStageScript(const QString &script);
  void flushState();
  QString stageHtmlPath() const;

  QWebEngineView *webView_ = nullptr;
  sps::Pose pose_ = sps::computePose(sps::kDefaultState);
  QString driveMode_ = "angle";
  sps::Point linearStart_;
  sps::Point linearEnd_;
  double linearProgress_ = 0.0;
  double linearSpeed_ = 200.0;
  double linearError_ = 0.0;
  bool hasLinearPath_ = false;
  bool loaded_ = false;
  bool solidModelEffect_ = false;
  bool modelsVisible_ = true;
  bool actuatorBallStickOnly_ = false;
  bool keepToolVertical_ = true;
};
