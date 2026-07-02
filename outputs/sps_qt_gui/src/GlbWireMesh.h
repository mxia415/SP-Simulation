#pragma once

#include "SpsModel.h"

#include <QString>
#include <vector>

struct GlbWireMesh {
  struct Edge {
    sps::Point a;
    sps::Point b;
  };
  struct Triangle {
    sps::Point a;
    sps::Point b;
    sps::Point c;
  };

  QString assetName;
  QString sourcePath;
  QString error;
  std::vector<Edge> edges;
  std::vector<Triangle> triangles;
  sps::Point min{};
  sps::Point max{};
  bool loaded = false;
};

QStringList glbCandidatePathsForAsset(const QString &assetName);
GlbWireMesh loadGlbWireMesh(const QString &assetName, int maxEdges = 2600, int maxTriangles = 1400);
