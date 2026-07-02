#include "MainWindow.h"

#include <QAbstractSpinBox>
#include <QApplication>
#include <QCheckBox>
#include <QComboBox>
#include <QCoreApplication>
#include <QDateTime>
#include <QDir>
#include <QFileInfo>
#include <QFormLayout>
#include <QFrame>
#include <QGridLayout>
#include <QGroupBox>
#include <QHBoxLayout>
#include <QPushButton>
#include <QScrollArea>
#include <QStackedWidget>
#include <QTimer>
#include <QToolButton>
#include <QVBoxLayout>

#include <assimp/Importer.hpp>
#include <assimp/postprocess.h>
#include <assimp/scene.h>

#include <algorithm>
#include <cmath>

namespace {

QLabel *label(const QString &text, const QString &className = {}) {
  auto *result = new QLabel(text);
  if (!className.isEmpty()) result->setProperty("class", className);
  return result;
}

QFrame *line() {
  auto *frame = new QFrame;
  frame->setFrameShape(QFrame::HLine);
  frame->setProperty("class", "divider");
  return frame;
}

QLabel *valueLabel(const QString &text = "-") {
  auto *result = label(text, "partValue");
  result->setAlignment(Qt::AlignRight | Qt::AlignVCenter);
  result->setWordWrap(true);
  return result;
}

QWidget *partRow(const QString &name, QLabel **value, const QString &initial = "-") {
  auto *row = new QWidget;
  row->setProperty("class", "partRow");
  auto *layout = new QHBoxLayout(row);
  layout->setContentsMargins(0, 0, 0, 0);
  layout->setSpacing(12);
  auto *nameLabel = label(name, "partName");
  *value = valueLabel(initial);
  layout->addWidget(nameLabel, 1);
  layout->addWidget(*value, 1);
  return row;
}

QWidget *rangeControlRow(const QString &name, QSlider *slider, QDoubleSpinBox *spin, const QString &suffix = "°") {
  auto *row = new QWidget;
  row->setProperty("class", "control");
  auto *layout = new QVBoxLayout(row);
  layout->setContentsMargins(12, 12, 12, 12);
  layout->setSpacing(8);

  auto *head = new QHBoxLayout;
  head->setContentsMargins(0, 0, 0, 0);
  auto *title = label(name, "fieldLabel");
  auto *out = label(QString("%1%2").arg(spin->value(), 0, 'f', 0).arg(suffix), "controlOut");
  out->setAlignment(Qt::AlignRight | Qt::AlignVCenter);
  head->addWidget(title, 1);
  head->addWidget(out);
  layout->addLayout(head);

  auto *rangeLine = new QHBoxLayout;
  rangeLine->setContentsMargins(0, 0, 0, 0);
  rangeLine->setSpacing(10);
  spin->setProperty("class", "numberInput");
  rangeLine->addWidget(slider, 1);
  rangeLine->addWidget(spin);
  layout->addLayout(rangeLine);

  QObject::connect(slider, &QSlider::valueChanged, row, [spin](int value) {
    spin->setValue(value / 10.0);
  });
  QObject::connect(spin, qOverload<double>(&QDoubleSpinBox::valueChanged), row, [slider, out, suffix](double value) {
    const int scaled = static_cast<int>(std::round(value * 10.0));
    if (slider->value() != scaled) {
      slider->blockSignals(true);
      slider->setValue(scaled);
      slider->blockSignals(false);
    }
    out->setText(QString("%1%2").arg(value, 0, 'f', 0).arg(suffix));
  });
  return row;
}

QString mm(double value) {
  return QString("%1 mm").arg(value, 0, 'f', 0);
}

QString glbStatusText(const QString &assetName) {
  QFileInfo foundInfo;
  QString lastError;
  QStringList roots{QDir::currentPath(), QCoreApplication::applicationDirPath()};
  QDir cursor(QCoreApplication::applicationDirPath());
  for (int i = 0; i < 8; ++i) {
    roots << cursor.absolutePath();
    cursor.cdUp();
  }

  QStringList candidates;
  for (const QString &root : roots) {
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/assets/" + (assetName == "base.glb" ? "base_local.stl" : assetName));
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/runtime/lingzhu-control/assets/" + assetName);
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/runtime/lingzhu-control/assets/processed/" + assetName);
    candidates << QDir(root).absoluteFilePath("inputs/glb-models/" + assetName);
  }

  candidates.removeDuplicates();
  for (const QString &candidate : candidates) {
    QFileInfo info(candidate);
    if (!info.exists()) continue;
    foundInfo = info;
    Assimp::Importer importer;
    const aiScene *scene = importer.ReadFile(info.absoluteFilePath().toStdString(), aiProcess_Triangulate | aiProcess_JoinIdenticalVertices | aiProcess_PreTransformVertices);
    if (!scene) {
      lastError = QString::fromUtf8(importer.GetErrorString());
      continue;
    }

    unsigned int vertices = 0;
    unsigned int faces = 0;
    for (unsigned int i = 0; i < scene->mNumMeshes; ++i) {
      vertices += scene->mMeshes[i]->mNumVertices;
      faces += scene->mMeshes[i]->mNumFaces;
    }
    return QString("已加载 · %1 meshes · %2 verts · %3 faces · %4 MB")
        .arg(scene->mNumMeshes)
        .arg(vertices)
        .arg(faces)
        .arg(info.size() / 1024.0 / 1024.0, 0, 'f', 1);
  }

  if (foundInfo.exists()) {
    return lastError.isEmpty() ? "读取失败" : "读取失败 · " + lastError.left(44);
  }
  return "未找到";
}

QStringList glbCandidatePaths(const QString &assetName) {
  QStringList roots{QDir::currentPath(), QCoreApplication::applicationDirPath()};
  QDir cursor(QCoreApplication::applicationDirPath());
  for (int i = 0; i < 8; ++i) {
    roots << cursor.absolutePath();
    cursor.cdUp();
  }
  QStringList candidates;
  for (const QString &root : roots) {
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/assets/" + (assetName == "base.glb" ? "base_local.stl" : assetName));
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/runtime/lingzhu-control/assets/" + assetName);
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/runtime/lingzhu-control/assets/processed/" + assetName);
    candidates << QDir(root).absoluteFilePath("inputs/glb-models/" + assetName);
  }
  candidates.removeDuplicates();
  return candidates;
}

QString qtAssetPath(const QString &fileName) {
  QStringList roots{QDir::currentPath(), QCoreApplication::applicationDirPath()};
  QDir cursor(QCoreApplication::applicationDirPath());
  for (int i = 0; i < 8; ++i) {
    roots << cursor.absolutePath();
    cursor.cdUp();
  }
  roots.removeDuplicates();
  for (const QString &root : roots) {
    const QString candidate = QDir(root).absoluteFilePath("outputs/sps_qt_gui/assets/" + fileName);
    if (QFileInfo::exists(candidate)) return candidate;
  }
  return QDir::current().absoluteFilePath("outputs/sps_qt_gui/assets/" + fileName);
}

}  // namespace

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
  setWindowTitle("SP-S模拟");
  resize(1360, 820);
  setMinimumSize(1180, 720);

  simulationTimer_ = new QTimer(this);
  simulationTimer_->setInterval(16);
  connect(simulationTimer_, &QTimer::timeout, this, &MainWindow::simulationTick);

  auto *root = new QWidget;
  auto *layout = new QHBoxLayout(root);
  layout->setContentsMargins(0, 0, 0, 0);
  layout->setSpacing(0);

  layout->addWidget(buildLeftPanel());
  layout->addWidget(buildStagePanel(), 1);
  layout->addWidget(buildRightPanel());
  setCentralWidget(root);

  applyStyle();
  syncControlsFromState();
  updatePose();
}

QDoubleSpinBox *MainWindow::makeSpin(double min, double max, double value, double step) {
  auto *spin = new QDoubleSpinBox;
  spin->setRange(min, max);
  spin->setValue(value);
  spin->setSingleStep(step);
  spin->setDecimals(step < 1.0 ? 2 : 0);
  spin->setKeyboardTracking(false);
  spin->setButtonSymbols(QAbstractSpinBox::NoButtons);
  return spin;
}

QSlider *MainWindow::makeSlider(double min, double max, double value) {
  auto *slider = new QSlider(Qt::Horizontal);
  slider->setRange(static_cast<int>(min * 10.0), static_cast<int>(max * 10.0));
  slider->setValue(static_cast<int>(value * 10.0));
  return slider;
}

QWidget *MainWindow::buildLeftPanel() {
  auto *panel = new QWidget;
  panel->setObjectName("leftPanel");
  panel->setFixedWidth(420);
  auto *layout = new QVBoxLayout(panel);
  layout->setContentsMargins(20, 20, 20, 20);
  layout->setSpacing(14);

  auto *brandRow = new QHBoxLayout;
  auto *brandText = new QVBoxLayout;
  brandText->addWidget(label("GL-3DPRT-SP Simulation", "eyebrow"));
  brandText->addWidget(label("SP-S模拟", "title"));
  brandText->addWidget(label("V1.0 · 2026-07-02· ©Ming Xia", "subtle"));
  brandRow->addLayout(brandText, 1);
  layout->addLayout(brandRow);

  modeButtons_ = new QButtonGroup(this);
  modeButtons_->setExclusive(true);
  auto *modeRow = new QWidget;
  modeRow->setObjectName("modeSwitch");
  auto *modeLayout = new QHBoxLayout(modeRow);
  modeLayout->setContentsMargins(4, 4, 4, 4);
  modeLayout->setSpacing(0);
  const QStringList modes{"角度驱动", "电缸行程驱动", "线性驱动"};
  for (int i = 0; i < modes.size(); ++i) {
    auto *button = new QPushButton(modes[i]);
    button->setCheckable(true);
    button->setProperty("class", "modeButton");
    if (i == 0) button->setChecked(true);
    modeButtons_->addButton(button, i);
    modeLayout->addWidget(button);
  }
  connect(modeButtons_, &QButtonGroup::idClicked, this, &MainWindow::setMode);
  layout->addWidget(modeRow);

  anglePanel_ = buildAngleControls();
  strokePanel_ = buildStrokeControls();
  linearPanel_ = buildLinearControls();
  layout->addWidget(anglePanel_);
  layout->addWidget(strokePanel_);
  layout->addWidget(linearPanel_);
  layout->addStretch(1);
  layout->addWidget(buildPresetPanel());
  updateModeVisibility();
  return panel;
}

QWidget *MainWindow::buildStagePanel() {
  auto *panel = new QWidget;
  panel->setObjectName("stagePanel");
  auto *layout = new QVBoxLayout(panel);
  layout->setContentsMargins(0, 0, 0, 0);
  layout->setSpacing(0);
  stage_ = new HybridStageView;
  layout->addWidget(stage_, 1);
  return panel;
}

QWidget *MainWindow::buildAngleControls() {
  auto *panel = new QWidget;
  panel->setProperty("class", "controlBlock");
  auto *layout = new QVBoxLayout(panel);
  layout->setContentsMargins(12, 12, 12, 12);
  layout->setSpacing(14);
  arm1Spin_ = makeSpin(0, 120, state_.arm1);
  arm2Spin_ = makeSpin(0, 180, state_.arm2);
  arm3Spin_ = makeSpin(0, 180, state_.arm3);
  offsetSpin_ = makeSpin(-270, 210, state_.offset);
  baseSpin_ = makeSpin(-180, 180, state_.base);
  arm1Slider_ = makeSlider(0, 120, state_.arm1);
  arm2Slider_ = makeSlider(0, 180, state_.arm2);
  arm3Slider_ = makeSlider(0, 180, state_.arm3);
  offsetSlider_ = makeSlider(-270, 210, state_.offset);
  baseSlider_ = makeSlider(-180, 180, state_.base);
  layout->addWidget(rangeControlRow("臂1", arm1Slider_, arm1Spin_));
  layout->addWidget(rangeControlRow("臂2", arm2Slider_, arm2Spin_));
  layout->addWidget(rangeControlRow("臂3", arm3Slider_, arm3Spin_));
  layout->addWidget(rangeControlRow("打印头", offsetSlider_, offsetSpin_));
  keepToolVerticalCheck_ = new QCheckBox("保持打印头空间垂直");
  keepToolVerticalCheck_->setChecked(keepToolVertical_);
  keepToolVerticalCheck_->setProperty("class", "inlineOption");
  layout->addWidget(keepToolVerticalCheck_);
  layout->addWidget(rangeControlRow("旋转", baseSlider_, baseSpin_));
  for (auto *spin : {arm1Spin_, arm2Spin_, arm3Spin_, offsetSpin_, baseSpin_}) {
    connect(spin, qOverload<double>(&QDoubleSpinBox::valueChanged), this, &MainWindow::angleInputChanged);
  }
  connect(keepToolVerticalCheck_, &QCheckBox::toggled, this, [this](bool checked) {
    if (syncingControls_) return;
    keepToolVertical_ = checked;
    if (stage_) stage_->setKeepToolVertical(checked);
    if (offsetSpin_) offsetSpin_->setEnabled(!checked);
    if (offsetSlider_) offsetSlider_->setEnabled(!checked);
    if (checked) {
      state_.offset = verticalToolOffsetForState(state_);
      syncControlsFromState();
      updatePose();
    }
  });
  offsetSpin_->setEnabled(!keepToolVertical_);
  offsetSlider_->setEnabled(!keepToolVertical_);
  return panel;
}

QWidget *MainWindow::buildStrokeControls() {
  auto *panel = new QWidget;
  panel->setProperty("class", "controlBlock");
  auto *layout = new QVBoxLayout(panel);
  layout->setContentsMargins(12, 12, 12, 12);
  layout->setSpacing(14);
  stroke1Spin_ = makeSpin(0, 100, 75, 1);
  stroke2Spin_ = makeSpin(0, 100, 50, 1);
  stroke3Spin_ = makeSpin(0, 100, 50, 1);
  strokeBaseSpin_ = makeSpin(-180, 180, state_.base, 1);
  stroke1Slider_ = makeSlider(0, 100, 75);
  stroke2Slider_ = makeSlider(0, 100, 50);
  stroke3Slider_ = makeSlider(0, 100, 50);
  strokeBaseSlider_ = makeSlider(-180, 180, state_.base);
  layout->addWidget(rangeControlRow("电缸1", stroke1Slider_, stroke1Spin_, "%"));
  layout->addWidget(rangeControlRow("电缸2", stroke2Slider_, stroke2Spin_, "%"));
  layout->addWidget(rangeControlRow("电缸3", stroke3Slider_, stroke3Spin_, "%"));
  layout->addWidget(rangeControlRow("旋转", strokeBaseSlider_, strokeBaseSpin_));
  for (auto *spin : {stroke1Spin_, stroke2Spin_, stroke3Spin_, strokeBaseSpin_}) {
    connect(spin, qOverload<double>(&QDoubleSpinBox::valueChanged), this, &MainWindow::strokeInputChanged);
  }
  return panel;
}

QWidget *MainWindow::buildLinearControls() {
  auto *panel = new QWidget;
  panel->setProperty("class", "linearPanel");
  auto *layout = new QVBoxLayout(panel);
  layout->setContentsMargins(0, 0, 0, 0);
  layout->setSpacing(10);

  sps::Point start = currentDisplayedTip();
  sps::Point end{start.x + 800.0, start.y, start.z};

  auto *pointGrid = new QGridLayout;
  pointGrid->setSpacing(8);
  pointGrid->addWidget(label("起点", "sectionTitle"), 0, 0, 1, 3);
  pointGrid->addWidget(label("终点", "sectionTitle"), 0, 3, 1, 3);
  startX_ = makeSpin(-9000, 9000, start.x, 10);
  startY_ = makeSpin(-9000, 9000, start.y, 10);
  startZ_ = makeSpin(-1000, 9000, start.z, 10);
  endX_ = makeSpin(-9000, 9000, end.x, 10);
  endY_ = makeSpin(-9000, 9000, end.y, 10);
  endZ_ = makeSpin(-1000, 9000, end.z, 10);
  const QList<QDoubleSpinBox *> pointSpins{startX_, startY_, startZ_, endX_, endY_, endZ_};
  const QStringList axis{"X", "Y", "Z", "X", "Y", "Z"};
  for (int i = 0; i < pointSpins.size(); ++i) {
    pointGrid->addWidget(label(axis[i]), 1 + (i % 3), i < 3 ? 0 : 3);
    pointGrid->addWidget(pointSpins[i], 1 + (i % 3), i < 3 ? 1 : 4, 1, 2);
    connect(pointSpins[i], qOverload<double>(&QDoubleSpinBox::valueChanged), this, &MainWindow::linearInputChanged);
  }
  layout->addLayout(pointGrid);

  auto *meta = new QGridLayout;
  speedSpin_ = makeSpin(1, 2000, 200, 10);
  progressSpin_ = makeSpin(0, 100, 0, 0.1);
  progressSpin_->setDecimals(1);
  progressSlider_ = makeSlider(0, 100, 0);
  pathDistanceLabel_ = label("-");
  durationLabel_ = label("-");
  linearErrorLabel_ = label("-");
  meta->addWidget(label("末端速度 mm/s"), 0, 0);
  meta->addWidget(speedSpin_, 0, 1);
  meta->addWidget(label("路径长度"), 1, 0);
  meta->addWidget(pathDistanceLabel_, 1, 1);
  meta->addWidget(label("预计时间"), 2, 0);
  meta->addWidget(durationLabel_, 2, 1);
  meta->addWidget(label("求解误差"), 3, 0);
  meta->addWidget(linearErrorLabel_, 3, 1);
  layout->addLayout(meta);

  layout->addWidget(progressSlider_);
  layout->addWidget(progressSpin_);
  auto *actions = new QHBoxLayout;
  auto *captureStart = new QPushButton("取当前为起点");
  auto *captureEnd = new QPushButton("取当前为终点");
  simulateButton_ = new QPushButton("模拟过程");
  actions->addWidget(captureStart);
  actions->addWidget(captureEnd);
  actions->addWidget(simulateButton_);
  layout->addLayout(actions);

  connect(speedSpin_, qOverload<double>(&QDoubleSpinBox::valueChanged), this, &MainWindow::linearInputChanged);
  connect(progressSpin_, qOverload<double>(&QDoubleSpinBox::valueChanged), this, [this](double value) {
    progressSlider_->blockSignals(true);
    progressSlider_->setValue(static_cast<int>(value * 10));
    progressSlider_->blockSignals(false);
    linearInputChanged();
  });
  connect(progressSlider_, &QSlider::valueChanged, this, [this](int value) {
    progressSpin_->blockSignals(true);
    progressSpin_->setValue(value / 10.0);
    progressSpin_->blockSignals(false);
    linearInputChanged();
  });
  connect(captureStart, &QPushButton::clicked, this, &MainWindow::captureLinearStart);
  connect(captureEnd, &QPushButton::clicked, this, &MainWindow::captureLinearEnd);
  connect(simulateButton_, &QPushButton::clicked, this, &MainWindow::toggleSimulation);
  return panel;
}

QWidget *MainWindow::buildPresetPanel() {
  auto *box = new QGroupBox("姿态预设");
  auto *layout = new QGridLayout(box);
  auto *reset = new QPushButton("恢复 GH 默认值");
  auto *calibration = new QPushButton("垂直姿态\n90 / 90 / 90 / 0 / 0");
  auto *folded = new QPushButton("折叠姿态\n0 / 180 / 180 / 0 / 180");
  layout->addWidget(reset, 0, 0, 1, 2);
  layout->addWidget(calibration, 1, 0);
  layout->addWidget(folded, 1, 1);
  connect(reset, &QPushButton::clicked, this, [this] { applyPreset("default"); });
  connect(calibration, &QPushButton::clicked, this, [this] { applyPreset("calibration"); });
  connect(folded, &QPushButton::clicked, this, [this] { applyPreset("folded"); });
  return box;
}

QWidget *MainWindow::buildRightPanel() {
  auto *scroll = new QScrollArea;
  scroll->setObjectName("rightPanel");
  scroll->setFixedWidth(300);
  scroll->setWidgetResizable(true);
  auto *inner = new QWidget;
  auto *layout = new QVBoxLayout(inner);
  layout->setContentsMargins(18, 18, 18, 18);
  layout->setSpacing(12);

  layout->addWidget(label("MODEL POSE", "eyebrow"));
  auto *showBallStick = new QCheckBox("显示所有球棍模型");
  showBallStick->setChecked(true);
  auto *actuatorOnly = new QCheckBox("仅显示电缸球棍模型");
  auto *effect = new QComboBox;
  effect->addItems({"透明实体", "浅色实体"});
  effect->setCurrentIndex(0);
  layout->addWidget(showBallStick);
  layout->addWidget(actuatorOnly);
  layout->addWidget(label("模型效果", "fieldLabel"));
  layout->addWidget(effect);
  connect(showBallStick, &QCheckBox::toggled, this, [this](bool checked) {
    if (stage_) stage_->setModelsVisible(checked);
  });
  connect(actuatorOnly, &QCheckBox::toggled, this, [this](bool checked) {
    if (stage_) stage_->setActuatorBallStickOnly(checked);
  });
  connect(effect, qOverload<int>(&QComboBox::currentIndexChanged), this, [this](int index) {
    stage_->setSolidModelEffect(index == 1);
  });

  struct TunerDef {
    QString eyebrow;
    QString name;
    QString asset;
  };
  const QList<TunerDef> tuners{
      {"BASE GLB", "Base", "base.glb"},
      {"BASE_LINK GLB", "Base_link", "base_link.glb"},
      {"ARM1 GLB", "Arm1", "arm1.glb"},
      {"ARM2 GLB", "Arm2", "arm2.glb"},
      {"ARM3 GLB", "Arm3", "arm3.glb"},
      {"TOOL.GLB", "Tool", "tool.glb"},
      {"CYLINDER GLB", "Cyl1 XN Base", "cyl1_xn_base.glb"},
      {"CYLINDER GLB", "Cyl1 XN End", "cyl1_xn_end.glb"},
      {"CYLINDER GLB", "Cyl1 XP Base", "cyl1_xp_base.glb"},
      {"CYLINDER GLB", "Cyl1 XP End", "cyl1_xp_end.glb"},
      {"CYLINDER GLB", "Cyl2 XN Base", "cyl2_xn_base.glb"},
      {"CYLINDER GLB", "Cyl2 XN End", "cyl2_xn_end.glb"},
      {"CYLINDER GLB", "Cyl2 XP Base", "cyl2_xp_base.glb"},
      {"CYLINDER GLB", "Cyl2 XP End", "cyl2_xp_end.glb"},
      {"CYLINDER GLB", "Cyl3 Mid Base", "cyl3_mid_base.glb"},
      {"CYLINDER GLB", "Cyl3 Mid End", "cyl3_mid_end.glb"},
      {"LINKAGE GLB", "Link A1 XN", "link_a1_xn.glb"},
      {"LINKAGE GLB", "Link A1 XP", "link_a1_xp.glb"},
      {"LINKAGE GLB", "Link A2 Mid", "link_a2_mid.glb"},
      {"LINKAGE GLB", "Link B1 XN", "link_b1_xn.glb"},
      {"LINKAGE GLB", "Link B1 XP", "link_b1_xp.glb"},
      {"LINKAGE GLB", "Link B2 Mid", "link_b2_mid.glb"},
  };
  layout->addWidget(line());

  layout->addWidget(label("ANGLES", "eyebrow"));
  layout->addWidget(partRow("臂1", &arm1Metric_));
  layout->addWidget(partRow("臂2", &arm2Metric_));
  layout->addWidget(partRow("臂3", &arm3Metric_));
  layout->addWidget(partRow("打印头", &offsetMetric_));
  layout->addWidget(partRow("旋转", &baseMetric_));

  layout->addWidget(label("LOGIC", "eyebrow"));
  layout->addWidget(partRow("臂角累加", &totalArmAngleReadout_));
  layout->addWidget(partRow("打印头姿态", &couplerAngleReadout_));
  layout->addWidget(partRow("整体旋转", &baseAngleReadout_));

  layout->addWidget(label("AXIS DISTANCE", "eyebrow"));
  layout->addWidget(partRow("臂1 轴距", &arm1LengthReadout_));
  layout->addWidget(partRow("臂2 轴距", &arm2LengthReadout_));
  layout->addWidget(partRow("臂3 轴距", &arm3LengthReadout_));
  layout->addWidget(partRow("打印头中心线", &toolLengthReadout_));
  layout->addWidget(partRow("三节合计", &totalAxisLengthReadout_));

  layout->addWidget(label("ACTUATOR STATE", "eyebrow"));
  layout->addWidget(partRow("臂1电缸", &arm1ActuatorReadout_));
  layout->addWidget(partRow("臂2电缸", &arm2ActuatorReadout_));
  layout->addWidget(partRow("臂3电缸", &arm3ActuatorReadout_));

  layout->addWidget(label("LINKAGE STATE", "eyebrow"));
  layout->addWidget(partRow("连接杆A：A-1 / A-2", &linkAReadout_));
  layout->addWidget(partRow("连接杆B：B-1 / B-2", &linkBReadout_));

  layout->addWidget(label("BLOCK STREAM", "eyebrow"));
  QLabel *blockInstance = nullptr;
  QLabel *rotate3d = nullptr;
  QLabel *point = nullptr;
  QLabel *explodeTree = nullptr;
  layout->addWidget(partRow("Block Instance", &blockInstance, "9"));
  layout->addWidget(partRow("Rotate 3D", &rotate3d, "8"));
  layout->addWidget(partRow("Point", &point, "5"));
  layout->addWidget(partRow("Explode Tree", &explodeTree, "6"));
  layout->addStretch(1);
  scroll->setWidget(inner);
  return scroll;
}

QWidget *MainWindow::buildModelTuner(const QString &eyebrow, const QString &name, const QString &assetName) {
  auto *box = new QWidget;
  box->setProperty("class", "modelTuner");
  auto *outer = new QVBoxLayout(box);
  outer->setContentsMargins(0, 0, 0, 0);
  outer->setSpacing(0);

  auto *header = new QToolButton;
  header->setCheckable(true);
  header->setChecked(false);
  header->setArrowType(Qt::RightArrow);
  header->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
  header->setProperty("class", "modelTunerHead");
  header->setText(QString("%1 · %2").arg(eyebrow, name));
  outer->addWidget(header);

  auto *body = new QWidget;
  body->setVisible(false);
  auto *layout = new QGridLayout(body);
  layout->setContentsMargins(10, 8, 10, 10);
  layout->setHorizontalSpacing(8);
  layout->setVerticalSpacing(8);
  auto *status = label(glbStatusText(assetName), "assetStatus");
  status->setWordWrap(true);
  layout->addWidget(status, 0, 0, 1, 4);
  auto *visible = new QCheckBox("显示");
  visible->setChecked(true);
  layout->addWidget(visible, 1, 0, 1, 2);
  connect(visible, &QCheckBox::toggled, this, [this, assetName](bool checked) {
    if (stage_) stage_->setModelVisible(assetName, checked);
  });
  const QStringList fields{"X", "Y", "Z", "RX", "RY", "RZ", "Scale"};
  QList<QDoubleSpinBox *> spins;
  for (int i = 0; i < fields.size(); ++i) {
    layout->addWidget(label(fields[i], "partName"), 2 + i / 2, (i % 2) * 2);
    auto *spin = makeSpin(i == 6 ? 0.01 : -9999, i == 6 ? 10 : 9999, i == 6 ? 1 : 0, i == 6 ? 0.01 : 1);
    spins << spin;
    layout->addWidget(spin, 2 + i / 2, (i % 2) * 2 + 1);
  }
  auto applyTransform = [this, assetName, spins] {
    if (!stage_ || spins.size() != 7) return;
    stage_->setModelTransform(assetName, spins[0]->value(), spins[1]->value(), spins[2]->value(), spins[3]->value(), spins[4]->value(), spins[5]->value(), spins[6]->value());
  };
  for (auto *spin : spins) {
    connect(spin, qOverload<double>(&QDoubleSpinBox::valueChanged), this, applyTransform);
  }
  auto *reset = new QPushButton("重置");
  connect(reset, &QPushButton::clicked, this, [this, assetName, spins] {
    for (int i = 0; i < spins.size(); ++i) {
      spins[i]->blockSignals(true);
      spins[i]->setValue(i == 6 ? 1.0 : 0.0);
      spins[i]->blockSignals(false);
    }
    if (stage_) stage_->resetModelTransform(assetName);
  });
  layout->addWidget(reset, 6, 0, 1, 4);
  outer->addWidget(body);
  connect(header, &QToolButton::toggled, body, [header, body](bool checked) {
    body->setVisible(checked);
    header->setArrowType(checked ? Qt::DownArrow : Qt::RightArrow);
  });
  return box;
}

void MainWindow::setMode(int mode) {
  if (simulationTimer_->isActive() && mode != LinearMode) {
    simulationTimer_->stop();
    simulateButton_->setText("模拟过程");
  }
  const DriveMode previousMode = mode_;
  mode_ = static_cast<DriveMode>(mode);
  if (stage_) {
    const QStringList modes{"angle", "stroke", "linear"};
    stage_->setDriveMode(modes.value(mode, "angle"));
  }
  updateModeVisibility();
  if (mode_ == LinearMode && previousMode != LinearMode) {
    seedLinearPathFromCurrentPose();
  } else if (mode_ == LinearMode) {
    linearInputChanged();
  }
  updatePose();
}

void MainWindow::angleInputChanged() {
  if (syncingControls_ || mode_ != AngleMode) return;
  state_ = sps::clampState({arm1Spin_->value(), arm2Spin_->value(), arm3Spin_->value(), offsetSpin_->value(), baseSpin_->value()});
  if (keepToolVertical_) {
    state_.offset = verticalToolOffsetForState(state_);
    syncControlsFromState();
  }
  updatePose();
}

void MainWindow::strokeInputChanged() {
  if (syncingControls_ || mode_ != StrokeMode) return;
  state_ = sps::stateFromActuatorStrokes(stroke1Spin_->value() / 100.0, stroke2Spin_->value() / 100.0, stroke3Spin_->value() / 100.0, state_);
  state_.base = strokeBaseSpin_->value();
  if (keepToolVertical_) state_.offset = verticalToolOffsetForState(state_);
  syncControlsFromState();
  updatePose();
}

void MainWindow::linearInputChanged() {
  if (syncingControls_ || mode_ != LinearMode || !startX_) return;
  const sps::Point start{startX_->value(), startY_->value(), startZ_->value()};
  const sps::Point end{endX_->value(), endY_->value(), endZ_->value()};
  const sps::Point target = sps::lerp(start, end, progressSpin_->value() / 100.0);
  const auto solve = sps::solveStateForWorldDisplayedToolTarget(target, state_);
  state_ = solve.state;
  if (keepToolVertical_) state_.offset = verticalToolOffsetForState(state_);
  syncControlsFromState();
  updatePose(solve.error);
}

void MainWindow::applyPreset(const QString &key) {
  if (simulationTimer_->isActive()) {
    simulationTimer_->stop();
    if (simulateButton_) simulateButton_->setText("模拟过程");
  }
  if (key == "default") {
    state_ = sps::kDefaultState;
  } else {
    state_ = sps::presetState(key.toStdString(), state_);
  }
  if (key == "folded") {
    keepToolVertical_ = false;
  } else if (key == "default" || key == "calibration") {
    keepToolVertical_ = true;
    state_.offset = verticalToolOffsetForState(state_);
  }
  if (stage_) stage_->setKeepToolVertical(keepToolVertical_);
  syncControlsFromState();
  updatePose();
}

void MainWindow::captureLinearStart() {
  if (simulationTimer_->isActive()) {
    simulationTimer_->stop();
    if (simulateButton_) simulateButton_->setText("模拟过程");
  }
  auto capture = [this](sps::State stageState, sps::Point tip, bool ok) {
    if (ok) {
      state_ = stageState;
      syncControlsFromState();
    }
    setLinearPoint(startX_, startY_, startZ_, tip, false);
    setLinearPoint(endX_, endY_, endZ_, {tip.x + 800.0, tip.y, tip.z}, false);
    setLinearProgress(0.0, false);
    updatePose();
  };
  if (stage_) {
    stage_->requestCurrentPose(capture);
  } else {
    capture(state_, currentDisplayedTip(), false);
  }
}

void MainWindow::captureLinearEnd() {
  if (simulationTimer_->isActive()) {
    simulationTimer_->stop();
    if (simulateButton_) simulateButton_->setText("模拟过程");
  }
  auto capture = [this](sps::State stageState, sps::Point tip, bool ok) {
    if (ok) {
      state_ = stageState;
      syncControlsFromState();
    }
    setLinearPoint(endX_, endY_, endZ_, tip, false);
    setLinearProgress(100.0, false);
    updatePose();
  };
  if (stage_) {
    stage_->requestCurrentPose(capture);
  } else {
    capture(state_, currentDisplayedTip(), false);
  }
}

void MainWindow::toggleSimulation() {
  if (simulationTimer_->isActive()) {
    simulationTimer_->stop();
    simulateButton_->setText("模拟过程");
    return;
  }
  if (mode_ != LinearMode) {
    const auto buttons = modeButtons_->buttons();
    for (auto *button : buttons) {
      if (modeButtons_->id(button) == LinearMode) {
        button->setChecked(true);
        break;
      }
    }
    setMode(LinearMode);
  }
  simulationStartedAt_ = QDateTime::currentMSecsSinceEpoch();
  setLinearProgress(0.0);
  simulateButton_->setText("停止");
  simulationTimer_->start();
}

void MainWindow::simulationTick() {
  const sps::Point start{startX_->value(), startY_->value(), startZ_->value()};
  const sps::Point end{endX_->value(), endY_->value(), endZ_->value()};
  const double path = sps::distance(start, end);
  const double durationMs = std::max(1.0, path / std::max(1.0, speedSpin_->value()) * 1000.0);
  const double elapsed = static_cast<double>(QDateTime::currentMSecsSinceEpoch() - simulationStartedAt_);
  const double progress = std::min(100.0, elapsed / durationMs * 100.0);
  setLinearProgress(progress);
  if (progress >= 100.0) toggleSimulation();
}

void MainWindow::setLinearProgress(double progress, bool solvePose) {
  if (!progressSpin_ || !progressSlider_) return;
  const double clamped = std::clamp(progress, 0.0, 100.0);
  progressSpin_->blockSignals(true);
  progressSlider_->blockSignals(true);
  progressSpin_->setValue(clamped);
  progressSlider_->setValue(static_cast<int>(std::round(clamped * 10.0)));
  progressSlider_->blockSignals(false);
  progressSpin_->blockSignals(false);
  if (solvePose) linearInputChanged();
}

void MainWindow::setLinearPoint(QDoubleSpinBox *xSpin, QDoubleSpinBox *ySpin, QDoubleSpinBox *zSpin, const sps::Point &point, bool updateNow) {
  if (!xSpin || !ySpin || !zSpin) return;
  xSpin->blockSignals(true);
  ySpin->blockSignals(true);
  zSpin->blockSignals(true);
  xSpin->setValue(point.x);
  ySpin->setValue(point.y);
  zSpin->setValue(point.z);
  zSpin->blockSignals(false);
  ySpin->blockSignals(false);
  xSpin->blockSignals(false);
  if (updateNow) linearInputChanged();
}

void MainWindow::seedLinearPathFromCurrentPose() {
  if (!startX_ || !endX_) return;
  const sps::Point start = currentDisplayedTip();
  const sps::Point end{start.x + 800.0, start.y, start.z};
  setLinearPoint(startX_, startY_, startZ_, start, false);
  setLinearPoint(endX_, endY_, endZ_, end, false);
  setLinearProgress(0.0, false);
}

void MainWindow::syncControlsFromState() {
  syncingControls_ = true;
  const QList<QDoubleSpinBox *> spins{arm1Spin_, arm2Spin_, arm3Spin_, offsetSpin_, baseSpin_};
  const QList<QSlider *> sliders{arm1Slider_, arm2Slider_, arm3Slider_, offsetSlider_, baseSlider_};
  const QList<QSlider *> strokeSliders{stroke1Slider_, stroke2Slider_, stroke3Slider_, strokeBaseSlider_};
  for (auto *slider : sliders) {
    if (slider) slider->blockSignals(true);
  }
  for (auto *slider : strokeSliders) {
    if (slider) slider->blockSignals(true);
  }
  if (arm1Spin_) arm1Spin_->setValue(state_.arm1);
  if (arm2Spin_) arm2Spin_->setValue(state_.arm2);
  if (arm3Spin_) arm3Spin_->setValue(state_.arm3);
  if (offsetSpin_) offsetSpin_->setValue(state_.offset);
  if (baseSpin_) baseSpin_->setValue(state_.base);
  if (stroke1Spin_) stroke1Spin_->setValue(state_.arm1 / 120.0 * 100.0);
  if (stroke2Spin_) stroke2Spin_->setValue((1.0 - state_.arm2 / 180.0) * 100.0);
  if (stroke3Spin_) stroke3Spin_->setValue((1.0 - state_.arm3 / 180.0) * 100.0);
  if (strokeBaseSpin_) strokeBaseSpin_->setValue(state_.base);
  if (arm1Slider_) arm1Slider_->setValue(static_cast<int>(std::round(state_.arm1 * 10.0)));
  if (arm2Slider_) arm2Slider_->setValue(static_cast<int>(std::round(state_.arm2 * 10.0)));
  if (arm3Slider_) arm3Slider_->setValue(static_cast<int>(std::round(state_.arm3 * 10.0)));
  if (offsetSlider_) offsetSlider_->setValue(static_cast<int>(std::round(state_.offset * 10.0)));
  if (baseSlider_) baseSlider_->setValue(static_cast<int>(std::round(state_.base * 10.0)));
  if (stroke1Slider_) stroke1Slider_->setValue(static_cast<int>(std::round(state_.arm1 / 120.0 * 1000.0)));
  if (stroke2Slider_) stroke2Slider_->setValue(static_cast<int>(std::round((1.0 - state_.arm2 / 180.0) * 1000.0)));
  if (stroke3Slider_) stroke3Slider_->setValue(static_cast<int>(std::round((1.0 - state_.arm3 / 180.0) * 1000.0)));
  if (strokeBaseSlider_) strokeBaseSlider_->setValue(static_cast<int>(std::round(state_.base * 10.0)));
  for (auto *slider : sliders) {
    if (slider) slider->blockSignals(false);
  }
  for (auto *slider : strokeSliders) {
    if (slider) slider->blockSignals(false);
  }
  if (keepToolVerticalCheck_) keepToolVerticalCheck_->setChecked(keepToolVertical_);
  if (offsetSpin_) offsetSpin_->setEnabled(!keepToolVertical_);
  if (offsetSlider_) offsetSlider_->setEnabled(!keepToolVertical_);
  syncingControls_ = false;
}

void MainWindow::updatePose(double linearError) {
  pose_ = sps::computePose(state_);
  if (stage_) stage_->setPose(pose_);

  if (startX_) {
    const sps::Point start{startX_->value(), startY_->value(), startZ_->value()};
    const sps::Point end{endX_->value(), endY_->value(), endZ_->value()};
    const double path = sps::distance(start, end);
    pathDistanceLabel_->setText(mm(path));
    durationLabel_->setText(QString("%1 s").arg(path / std::max(1.0, speedSpin_->value()), 0, 'f', 1));
    linearErrorLabel_->setText(mm(linearError));
    if (mode_ == LinearMode && stage_) stage_->setLinearPath(start, end, progressSpin_->value(), speedSpin_->value(), linearError);
  }

  if (!arm1Metric_) return;
  if (chainReadout_) {
    chainReadout_->setText(QString("%1 / %2 / %3 / %4 / %5")
                               .arg(pose_.state.arm1, 0, 'f', 0)
                               .arg(pose_.state.arm2, 0, 'f', 0)
                               .arg(pose_.state.arm3, 0, 'f', 0)
                               .arg(pose_.state.offset, 0, 'f', 0)
                               .arg(pose_.state.base, 0, 'f', 0));
  }
  if (tipReadout_) {
    tipReadout_->setText(QString("%1 / %2 / %3 mm").arg(pose_.displayedTip.x, 0, 'f', 0).arg(pose_.displayedTip.y, 0, 'f', 0).arg(pose_.displayedTip.z, 0, 'f', 0));
  }

  arm1Metric_->setText(QString("%1°").arg(pose_.state.arm1, 0, 'f', 0));
  arm2Metric_->setText(QString("%1°").arg(pose_.state.arm2, 0, 'f', 0));
  arm3Metric_->setText(QString("%1°").arg(pose_.state.arm3, 0, 'f', 0));
  offsetMetric_->setText(QString("%1°").arg(pose_.state.offset, 0, 'f', 0));
  baseMetric_->setText(QString("%1°").arg(pose_.state.base, 0, 'f', 0));

  totalArmAngleReadout_->setText(QString("%1°").arg(pose_.absoluteAngles.arm3, 0, 'f', 1));
  couplerAngleReadout_->setText(QString("%1°").arg(pose_.absoluteAngles.tool, 0, 'f', 1));
  baseAngleReadout_->setText(QString("%1°").arg(pose_.state.base, 0, 'f', 0));

  constexpr double toolLength = 730.0;
  const double arm1Length = sps::distance(pose_.joints[0], pose_.joints[1]);
  const double arm2Length = sps::distance(pose_.joints[1], pose_.joints[2]);
  const double arm3Length = sps::distance(pose_.joints[2], pose_.joints[3]);
  arm1LengthReadout_->setText(QString("%1 mm").arg(arm1Length, 0, 'f', 3));
  arm2LengthReadout_->setText(QString("%1 mm").arg(arm2Length, 0, 'f', 3));
  arm3LengthReadout_->setText(QString("%1 mm").arg(arm3Length, 0, 'f', 3));
  toolLengthReadout_->setText(QString("%1 mm").arg(toolLength, 0, 'f', 3));
  totalAxisLengthReadout_->setText(QString("%1 mm").arg(arm1Length + arm2Length + arm3Length, 0, 'f', 3));

  arm1ActuatorReadout_->setText(QString("%1 · 2 根").arg(mm(pose_.actuator1.length)));
  arm2ActuatorReadout_->setText(QString("%1 · 2 根").arg(mm(pose_.actuator2.length)));
  arm3ActuatorReadout_->setText(QString("%1 · 1 根").arg(mm(pose_.actuator3.length)));
  linkAReadout_->setText(QString("%1 / %2 mm").arg(pose_.linkageA.link1Actual, 0, 'f', 1).arg(pose_.linkageA.link2Actual, 0, 'f', 1));
  linkBReadout_->setText(QString("%1 / %2 mm").arg(pose_.linkageB.link1Actual, 0, 'f', 1).arg(pose_.linkageB.link2Actual, 0, 'f', 1));
}

void MainWindow::updateModeVisibility() {
  if (!anglePanel_) return;
  anglePanel_->setVisible(mode_ == AngleMode);
  strokePanel_->setVisible(mode_ == StrokeMode);
  linearPanel_->setVisible(mode_ == LinearMode);
}

sps::Point MainWindow::currentDisplayedTip() const {
  return sps::worldDisplayedToolPointForState(state_);
}

double MainWindow::verticalToolOffsetForState(const sps::State &state) const {
  return std::clamp(state.arm1 - state.arm2 - state.arm3 + 90.0, -270.0, 210.0);
}

void MainWindow::applyStyle() {
  const QString checkIconPath = qtAssetPath("check-white.svg");
  qApp->setStyleSheet(QString(R"CSS(
    QMainWindow, QWidget { background: #000000; color: #ffffff; font-family: "Arial Narrow", "Arial"; }
    #leftPanel, #rightPanel { background: #0a0a0a; border: none; }
    #modeSwitch { background: #0a0a0a; border: none; }
    QPushButton {
      background: #000000;
      color: #a2a2aa;
      border: 1px solid #3a3a3f;
      border-radius: 999px;
      min-height: 30px;
      padding: 5px 10px;
      font-weight: 800;
    }
    QPushButton:hover { color: #ffffff; border-color: #ffffff; }
    QPushButton:checked { background: #ffffff; color: #000000; border-color: #ffffff; }
    QPushButton[class="modeButton"] { border-radius: 999px; min-height: 36px; }
    QLabel[class="title"] { font-size: 28px; font-weight: 800; color: #ffffff; }
    QLabel[class="eyebrow"] { color: #a2a2aa; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    QLabel[class="subtle"] { color: #a2a2aa; font-size: 11px; font-weight: 800; }
    QLabel[class="statusPill"] { color: #ffffff; background: #000000; border: 1px solid #3a3a3f; border-radius: 14px; padding: 6px 10px; font-size: 11px; font-weight: 800; }
    QLabel[class="sectionTitle"], QGroupBox { color: #ffffff; font-size: 14px; font-weight: 800; }
    QLabel[class="fieldLabel"] { color: #f0f0fa; font-size: 13px; font-weight: 800; }
    QLabel[class="controlOut"] { color: #ffffff; font-size: 13px; font-weight: 800; min-width: 58px; }
    QLabel[class="partName"] { color: #a2a2aa; font-size: 12px; font-weight: 800; }
    QLabel[class="partValue"] { color: #ffffff; font-size: 12px; font-weight: 800; }
    QWidget[class="partRow"] { border-bottom: 1px solid #3a3a3f; min-height: 28px; }
    QWidget[class="controlBlock"], QWidget[class="linearPanel"] { background: #0a0a0a; border: none; }
    QWidget[class="control"] { background: #000000; border: 1px solid #3a3a3f; border-radius: 4px; }
    QLabel[class="metric"] { color: #ffffff; background: #000000; border: 1px solid #3a3a3f; border-radius: 4px; padding: 8px; font-family: "Menlo"; font-size: 12px; }
    QWidget[class="modelTuner"] { background: #000000; border: 1px solid #3a3a3f; border-radius: 4px; }
    QToolButton[class="modelTunerHead"] {
      background: #000000;
      color: #ffffff;
      border: none;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 800;
      text-align: left;
      min-height: 24px;
    }
    QToolButton[class="modelSectionHead"] {
      background: #000000;
      color: #ffffff;
      border: 1px solid #3a3a3f;
      border-radius: 4px;
      padding: 7px 8px;
      font-size: 12px;
      font-weight: 800;
      text-align: left;
    }
    QWidget[class="modelSectionBody"] { background: #000000; border: none; }
    QGroupBox { border: 1px solid #3a3a3f; border-radius: 4px; margin-top: 12px; padding: 10px; background: #000000; }
    QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 4px; color: #ffffff; }
    QDoubleSpinBox, QComboBox {
      background: #000000;
      color: #ffffff;
      border: 1px solid #3a3a3f;
      border-radius: 3px;
      min-height: 30px;
      padding: 2px 6px;
      font-weight: 800;
    }
    QDoubleSpinBox:focus, QComboBox:focus { border-color: #ffffff; }
    QDoubleSpinBox[class="numberInput"] { max-width: 62px; min-width: 62px; }
    QSlider::groove:horizontal { height: 5px; background: #3a3a3f; border-radius: 2px; }
    QSlider::handle:horizontal { width: 16px; height: 16px; margin: -6px 0; border-radius: 8px; background: #ffffff; }
    QCheckBox { spacing: 8px; color: #f0f0fa; font-size: 13px; font-weight: 800; }
    QCheckBox::indicator {
      width: 18px;
      height: 18px;
      border: 2px solid #ffffff;
      border-radius: 4px;
      background: #000000;
    }
    QCheckBox::indicator:checked {
      background: #168cff;
      image: url("%1");
    }
    QCheckBox[class="inlineOption"] { padding-left: 12px; color: #ffffff; }
    QLabel[class="assetStatus"] { color: #ffffff; background: #000000; border: 1px solid #3a3a3f; border-radius: 3px; padding: 6px; font-size: 11px; font-weight: 800; }
    QScrollArea { border: none; }
    #stagePanel { background: #000000; }
    #viewControls { background: #000000; border-top: 1px solid #3a3a3f; }
    QPushButton[class="viewButton"] { border-radius: 0; min-width: 74px; }
    QFrame[class="divider"] { color: #3a3a3f; }
  )CSS").arg(checkIconPath));
}
