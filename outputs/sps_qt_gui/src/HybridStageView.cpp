#include "HybridStageView.h"

#include <QCoreApplication>
#include <QDir>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QUrl>
#include <QVariantMap>
#include <QVBoxLayout>
#include <QWebEnginePage>
#include <QWebEngineSettings>
#include <QWebEngineView>

namespace {

QString jsString(const QString &value) {
  return QString::fromUtf8(QJsonDocument(QJsonArray{value}).toJson(QJsonDocument::Compact)).mid(1).chopped(1);
}

QJsonObject poseStateJson(const sps::Pose &pose) {
  return {
      {"arm1", pose.state.arm1},
      {"arm2", pose.state.arm2},
      {"arm3", pose.state.arm3},
      {"offset", pose.state.offset},
      {"base", pose.state.base},
  };
}

QJsonObject pointJson(sps::Point point) {
  return {
      {"x", point.x},
      {"y", point.y},
      {"z", point.z},
  };
}

}  // namespace

HybridStageView::HybridStageView(QWidget *parent) : QWidget(parent) {
  setMinimumSize(560, 520);
  auto *layout = new QVBoxLayout(this);
  layout->setContentsMargins(0, 0, 0, 0);
  layout->setSpacing(0);

  webView_ = new QWebEngineView(this);
  webView_->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessFileUrls, true);
  webView_->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessRemoteUrls, true);
  layout->addWidget(webView_, 1);

  connect(webView_, &QWebEngineView::loadFinished, this, [this](bool ok) {
    loaded_ = ok;
    if (loaded_) flushState();
  });
  loadStage();
}

void HybridStageView::setPose(const sps::Pose &pose) {
  pose_ = pose;
  const QString json = QString::fromUtf8(QJsonDocument(poseStateJson(pose_)).toJson(QJsonDocument::Compact));
  runStageScript(QString("window.__spsQtStage?.setPose(%1);").arg(json));
}

void HybridStageView::setSolidModelEffect(bool solid) {
  solidModelEffect_ = solid;
  runStageScript(QString("window.__spsQtStage?.setModelEffect(%1);").arg(jsString(solid ? "solid" : "transparent")));
}

void HybridStageView::setModelsVisible(bool visible) {
  modelsVisible_ = visible;
  runStageScript(QString("window.__spsQtStage?.setModelsVisible(%1);").arg(visible ? "true" : "false"));
}

void HybridStageView::setActuatorBallStickOnly(bool actuatorOnly) {
  actuatorBallStickOnly_ = actuatorOnly;
  runStageScript(QString("window.__spsQtStage?.setActuatorBallStickOnly(%1);").arg(actuatorOnly ? "true" : "false"));
}

void HybridStageView::setKeepToolVertical(bool keepVertical) {
  keepToolVertical_ = keepVertical;
  runStageScript(QString("window.__spsQtStage?.setKeepToolVertical(%1);").arg(keepVertical ? "true" : "false"));
}

void HybridStageView::setModelVisible(const QString &assetName, bool visible) {
  runStageScript(QString("window.__spsQtStage?.setModelVisible(%1, %2);").arg(jsString(assetName), visible ? "true" : "false"));
}

void HybridStageView::setModelTransform(const QString &assetName, double x, double y, double z, double rx, double ry, double rz, double scale) {
  QJsonObject transform{
      {"x", x},
      {"y", y},
      {"z", z},
      {"rx", rx},
      {"ry", ry},
      {"rz", rz},
      {"scale", scale},
  };
  const QString json = QString::fromUtf8(QJsonDocument(transform).toJson(QJsonDocument::Compact));
  runStageScript(QString("window.__spsQtStage?.setModelTransform(%1, %2);").arg(jsString(assetName), json));
}

void HybridStageView::resetModelTransform(const QString &assetName) {
  runStageScript(QString("window.__spsQtStage?.resetModelTransform(%1);").arg(jsString(assetName)));
}

void HybridStageView::setViewPreset(const QString &preset) {
  runStageScript(QString("window.__spsQtStage?.setViewPreset(%1);").arg(jsString(preset)));
}

void HybridStageView::setDriveMode(const QString &mode) {
  driveMode_ = mode;
  runStageScript(QString("window.__spsQtStage?.setDriveMode(%1);").arg(jsString(driveMode_)));
}

void HybridStageView::setLinearPath(sps::Point start, sps::Point end, double progress, double speed, double error) {
  linearStart_ = start;
  linearEnd_ = end;
  linearProgress_ = progress;
  linearSpeed_ = speed;
  linearError_ = error;
  hasLinearPath_ = true;
  QJsonObject payload{
      {"start", pointJson(start)},
      {"end", pointJson(end)},
      {"progress", progress},
      {"speed", speed},
      {"error", error},
  };
  const QString json = QString::fromUtf8(QJsonDocument(payload).toJson(QJsonDocument::Compact));
  runStageScript(QString("window.__spsQtStage?.setLinearPath(%1);").arg(json));
}

void HybridStageView::requestCurrentPose(std::function<void(sps::State state, sps::Point displayedTip, bool ok)> callback) {
  if (!loaded_ || !webView_) {
    callback(pose_.state, pose_.displayedTip, false);
    return;
  }
  constexpr const char *script = R"JS(
    (() => {
      const debug = window.__lingzhuDebug;
      const pose = debug?.pose;
      const drag = debug?.linearDrag;
      const tip = drag?.toolDisplayWorld || pose?.displayedTip || drag?.lastDisplayWorld || drag?.displayTargetWorld;
      if (!pose || !tip) return null;
      return {
        state: {
          arm1: pose.arm1,
          arm2: pose.arm2,
          arm3: pose.arm3,
          offset: pose.offset,
          base: pose.base,
        },
        displayedTip: tip,
      };
    })()
  )JS";
  webView_->page()->runJavaScript(QString::fromUtf8(script), [callback, fallbackState = pose_.state, fallbackTip = pose_.displayedTip](const QVariant &value) {
    const QVariantMap root = value.toMap();
    const QVariantMap stateMap = root.value("state").toMap();
    const QVariantMap tipMap = root.value("displayedTip").toMap();
    if (stateMap.isEmpty() || tipMap.isEmpty()) {
      callback(fallbackState, fallbackTip, false);
      return;
    }
    const sps::State state{
        stateMap.value("arm1", fallbackState.arm1).toDouble(),
        stateMap.value("arm2", fallbackState.arm2).toDouble(),
        stateMap.value("arm3", fallbackState.arm3).toDouble(),
        stateMap.value("offset", fallbackState.offset).toDouble(),
        stateMap.value("base", fallbackState.base).toDouble(),
    };
    const sps::Point tip{
        tipMap.value("x", fallbackTip.x).toDouble(),
        tipMap.value("y", fallbackTip.y).toDouble(),
        tipMap.value("z", fallbackTip.z).toDouble(),
    };
    callback(sps::clampState(state), tip, true);
  });
}

void HybridStageView::loadStage() {
  const QString path = stageHtmlPath();
  QUrl url = QUrl::fromLocalFile(path);
  url.setQuery("qtStage=1");
  webView_->load(url);
}

void HybridStageView::runStageScript(const QString &script) {
  if (!loaded_ || !webView_) return;
  webView_->page()->runJavaScript(script);
}

void HybridStageView::flushState() {
  if (!loaded_) return;
  const QString json = QString::fromUtf8(QJsonDocument(poseStateJson(pose_)).toJson(QJsonDocument::Compact));
  runStageScript(QString("window.__spsQtStage?.setDriveMode(%1);").arg(jsString(driveMode_)));
  runStageScript(QString("window.__spsQtStage?.setPose(%1);").arg(json));
  runStageScript(QString("window.__spsQtStage?.setModelEffect(%1);").arg(jsString(solidModelEffect_ ? "solid" : "transparent")));
  runStageScript(QString("window.__spsQtStage?.setModelsVisible(%1);").arg(modelsVisible_ ? "true" : "false"));
  runStageScript(QString("window.__spsQtStage?.setActuatorBallStickOnly(%1);").arg(actuatorBallStickOnly_ ? "true" : "false"));
  runStageScript(QString("window.__spsQtStage?.setKeepToolVertical(%1);").arg(keepToolVertical_ ? "true" : "false"));
  if (hasLinearPath_) setLinearPath(linearStart_, linearEnd_, linearProgress_, linearSpeed_, linearError_);
}

QString HybridStageView::stageHtmlPath() const {
  QStringList roots{QDir::currentPath(), QCoreApplication::applicationDirPath()};
  QDir cursor(QCoreApplication::applicationDirPath());
  for (int i = 0; i < 8; ++i) {
    roots << cursor.absolutePath();
    cursor.cdUp();
  }
  const QStringList relativeCandidates{
      "outputs/sps_qt_gui/runtime/lingzhu-control/index.html",
  };
  for (const QString &root : roots) {
    for (const QString &relativePath : relativeCandidates) {
      const QString candidate = QDir(root).absoluteFilePath(relativePath);
      if (QFileInfo::exists(candidate)) return candidate;
    }
  }
  return QDir::current().absoluteFilePath(relativeCandidates.first());
}
