#pragma once

#include "SpsModel.h"
#include "HybridStageView.h"

#include <QButtonGroup>
#include <QCheckBox>
#include <QDoubleSpinBox>
#include <QLabel>
#include <QMainWindow>
#include <QPushButton>
#include <QSlider>
#include <QTimer>

class MainWindow : public QMainWindow {
  Q_OBJECT

 public:
  explicit MainWindow(QWidget *parent = nullptr);

 private slots:
  void setMode(int mode);
  void angleInputChanged();
  void strokeInputChanged();
  void linearInputChanged();
  void applyPreset(const QString &key);
  void captureLinearStart();
  void captureLinearEnd();
  void toggleSimulation();
  void simulationTick();

 private:
  QWidget *buildLeftPanel();
  QWidget *buildStagePanel();
  QWidget *buildRightPanel();
  QWidget *buildAngleControls();
  QWidget *buildStrokeControls();
  QWidget *buildLinearControls();
  QWidget *buildPresetPanel();
  QWidget *buildModelTuner(const QString &eyebrow, const QString &name, const QString &assetName);
  QDoubleSpinBox *makeSpin(double min, double max, double value, double step = 1.0);
  QSlider *makeSlider(double min, double max, double value);
  void syncControlsFromState();
  void updatePose(double linearError = 0.0);
  void updateModeVisibility();
  void applyStyle();
  sps::Point currentDisplayedTip() const;
  double verticalToolOffsetForState(const sps::State &state) const;
  void setLinearProgress(double progress, bool solvePose = true);
  void setLinearPoint(QDoubleSpinBox *xSpin, QDoubleSpinBox *ySpin, QDoubleSpinBox *zSpin, const sps::Point &point, bool updateNow = true);
  void seedLinearPathFromCurrentPose();

  enum DriveMode { AngleMode = 0, StrokeMode = 1, LinearMode = 2 };

  sps::State state_ = sps::kDefaultState;
  sps::Pose pose_ = sps::computePose(sps::kDefaultState);
  DriveMode mode_ = AngleMode;
  bool syncingControls_ = false;
  bool keepToolVertical_ = true;

  HybridStageView *stage_ = nullptr;
  QButtonGroup *modeButtons_ = nullptr;
  QWidget *anglePanel_ = nullptr;
  QWidget *strokePanel_ = nullptr;
  QWidget *linearPanel_ = nullptr;

  QDoubleSpinBox *arm1Spin_ = nullptr;
  QDoubleSpinBox *arm2Spin_ = nullptr;
  QDoubleSpinBox *arm3Spin_ = nullptr;
  QDoubleSpinBox *offsetSpin_ = nullptr;
  QDoubleSpinBox *baseSpin_ = nullptr;
  QSlider *arm1Slider_ = nullptr;
  QSlider *arm2Slider_ = nullptr;
  QSlider *arm3Slider_ = nullptr;
  QSlider *offsetSlider_ = nullptr;
  QSlider *baseSlider_ = nullptr;
  QCheckBox *keepToolVerticalCheck_ = nullptr;

  QDoubleSpinBox *stroke1Spin_ = nullptr;
  QDoubleSpinBox *stroke2Spin_ = nullptr;
  QDoubleSpinBox *stroke3Spin_ = nullptr;
  QDoubleSpinBox *strokeBaseSpin_ = nullptr;
  QSlider *stroke1Slider_ = nullptr;
  QSlider *stroke2Slider_ = nullptr;
  QSlider *stroke3Slider_ = nullptr;
  QSlider *strokeBaseSlider_ = nullptr;

  QDoubleSpinBox *startX_ = nullptr;
  QDoubleSpinBox *startY_ = nullptr;
  QDoubleSpinBox *startZ_ = nullptr;
  QDoubleSpinBox *endX_ = nullptr;
  QDoubleSpinBox *endY_ = nullptr;
  QDoubleSpinBox *endZ_ = nullptr;
  QDoubleSpinBox *speedSpin_ = nullptr;
  QDoubleSpinBox *progressSpin_ = nullptr;
  QSlider *progressSlider_ = nullptr;
  QLabel *pathDistanceLabel_ = nullptr;
  QLabel *durationLabel_ = nullptr;
  QLabel *linearErrorLabel_ = nullptr;
  QPushButton *simulateButton_ = nullptr;
  QTimer *simulationTimer_ = nullptr;
  qint64 simulationStartedAt_ = 0;

  QLabel *chainReadout_ = nullptr;
  QLabel *tipReadout_ = nullptr;
  QLabel *arm1Metric_ = nullptr;
  QLabel *arm2Metric_ = nullptr;
  QLabel *arm3Metric_ = nullptr;
  QLabel *offsetMetric_ = nullptr;
  QLabel *baseMetric_ = nullptr;
  QLabel *totalArmAngleReadout_ = nullptr;
  QLabel *couplerAngleReadout_ = nullptr;
  QLabel *baseAngleReadout_ = nullptr;
  QLabel *arm1LengthReadout_ = nullptr;
  QLabel *arm2LengthReadout_ = nullptr;
  QLabel *arm3LengthReadout_ = nullptr;
  QLabel *toolLengthReadout_ = nullptr;
  QLabel *totalAxisLengthReadout_ = nullptr;
  QLabel *arm1ActuatorReadout_ = nullptr;
  QLabel *arm2ActuatorReadout_ = nullptr;
  QLabel *arm3ActuatorReadout_ = nullptr;
  QLabel *linkAReadout_ = nullptr;
  QLabel *linkBReadout_ = nullptr;
};
