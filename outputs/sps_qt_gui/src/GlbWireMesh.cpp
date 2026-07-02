#include "GlbWireMesh.h"

#include <QCoreApplication>
#include <QDir>
#include <QFileInfo>
#include <QStringList>

#include <assimp/Importer.hpp>
#include <assimp/postprocess.h>
#include <assimp/scene.h>

#include <algorithm>
#include <array>
#include <limits>
#include <set>

QStringList glbCandidatePathsForAsset(const QString &assetName) {
  QStringList roots{QDir::currentPath(), QCoreApplication::applicationDirPath()};
  QDir cursor(QCoreApplication::applicationDirPath());
  for (int i = 0; i < 8; ++i) {
    roots << cursor.absolutePath();
    cursor.cdUp();
  }

  QStringList candidates;
  for (const QString &root : roots) {
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/assets/" + assetName);
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/runtime/lingzhu-control/assets/" + assetName);
    candidates << QDir(root).absoluteFilePath("outputs/sps_qt_gui/runtime/lingzhu-control/assets/processed/" + assetName);
    candidates << QDir(root).absoluteFilePath("inputs/glb-models/" + assetName);
  }
  candidates.removeDuplicates();
  return candidates;
}

GlbWireMesh loadGlbWireMesh(const QString &assetName, int maxEdges, int maxTriangles) {
  GlbWireMesh result;
  result.assetName = assetName;
  result.min = {std::numeric_limits<double>::max(), std::numeric_limits<double>::max(), std::numeric_limits<double>::max()};
  result.max = {-std::numeric_limits<double>::max(), -std::numeric_limits<double>::max(), -std::numeric_limits<double>::max()};

  for (const QString &candidate : glbCandidatePathsForAsset(assetName)) {
    QFileInfo info(candidate);
    if (!info.exists()) continue;

    Assimp::Importer importer;
    const aiScene *scene = importer.ReadFile(
        info.absoluteFilePath().toStdString(),
        aiProcess_Triangulate | aiProcess_JoinIdenticalVertices | aiProcess_PreTransformVertices);
    if (!scene || scene->mNumMeshes == 0) {
      result.error = QString::fromUtf8(importer.GetErrorString());
      continue;
    }

    std::vector<GlbWireMesh::Edge> allEdges;
    std::vector<GlbWireMesh::Triangle> allTriangles;
    allEdges.reserve(static_cast<size_t>(maxEdges) + 3);
    allTriangles.reserve(static_cast<size_t>(maxTriangles) + 3);

    for (unsigned int meshIndex = 0; meshIndex < scene->mNumMeshes; ++meshIndex) {
      const aiMesh *mesh = scene->mMeshes[meshIndex];
      for (unsigned int vertexIndex = 0; vertexIndex < mesh->mNumVertices; ++vertexIndex) {
        const aiVector3D v = mesh->mVertices[vertexIndex];
        result.min.x = std::min(result.min.x, static_cast<double>(v.x));
        result.min.y = std::min(result.min.y, static_cast<double>(v.y));
        result.min.z = std::min(result.min.z, static_cast<double>(v.z));
        result.max.x = std::max(result.max.x, static_cast<double>(v.x));
        result.max.y = std::max(result.max.y, static_cast<double>(v.y));
        result.max.z = std::max(result.max.z, static_cast<double>(v.z));
      }

      std::set<std::pair<unsigned int, unsigned int>> seen;
      for (unsigned int faceIndex = 0; faceIndex < mesh->mNumFaces; ++faceIndex) {
        const aiFace &face = mesh->mFaces[faceIndex];
        if (face.mNumIndices >= 3) {
          const aiVector3D va = mesh->mVertices[face.mIndices[0]];
          const aiVector3D vb = mesh->mVertices[face.mIndices[1]];
          const aiVector3D vc = mesh->mVertices[face.mIndices[2]];
          allTriangles.push_back({{va.x, va.y, va.z}, {vb.x, vb.y, vb.z}, {vc.x, vc.y, vc.z}});
        }
        for (unsigned int i = 0; i < face.mNumIndices; ++i) {
          unsigned int a = face.mIndices[i];
          unsigned int b = face.mIndices[(i + 1) % face.mNumIndices];
          if (a == b) continue;
          if (a > b) std::swap(a, b);
          if (!seen.insert({a, b}).second) continue;
          const aiVector3D va = mesh->mVertices[a];
          const aiVector3D vb = mesh->mVertices[b];
          allEdges.push_back({{va.x, va.y, va.z}, {vb.x, vb.y, vb.z}});
        }
      }
    }

    if (allEdges.empty()) {
      result.error = "no mesh edges";
      continue;
    }

    const int step = std::max(1, static_cast<int>(allEdges.size() / std::max(1, maxEdges)));
    for (size_t i = 0; i < allEdges.size() && static_cast<int>(result.edges.size()) < maxEdges; i += static_cast<size_t>(step)) {
      result.edges.push_back(allEdges[i]);
    }
    const int triangleStep = std::max(1, static_cast<int>(allTriangles.size() / std::max(1, maxTriangles)));
    for (size_t i = 0; i < allTriangles.size() && static_cast<int>(result.triangles.size()) < maxTriangles; i += static_cast<size_t>(triangleStep)) {
      result.triangles.push_back(allTriangles[i]);
    }
    result.sourcePath = info.absoluteFilePath();
    result.loaded = true;
    result.error.clear();
    return result;
  }

  if (result.error.isEmpty()) result.error = "asset not found";
  return result;
}
