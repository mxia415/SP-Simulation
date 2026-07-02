import json
import traceback

dwg_path = "/Users/ming/Desktop/WQ3D-DB001-260307.DWG(1).dwg"
out_path = "/Users/ming/Documents/Codex/2026-06-24/s/outputs/wq3d_db001_preview_geometry.json"


def point(p):
    return [round(float(p.X), 4), round(float(p.Y), 4)]


def bbox(box):
    return {
        "min": [round(float(box.Min.X), 4), round(float(box.Min.Y), 4)],
        "max": [round(float(box.Max.X), 4), round(float(box.Max.Y), 4)],
    }


def sample_curve(curve):
    try:
        if curve.IsLinear():
            return [point(curve.PointAtStart), point(curve.PointAtEnd)]

        polyline = None
        ok, polyline = curve.TryGetPolyline()
        if ok and polyline:
            return [point(p) for p in polyline]

        length = curve.GetLength()
        count = max(8, min(80, int(length / 80)))
        params = curve.DivideByCount(count, True)
        if params:
            return [point(curve.PointAt(t)) for t in params]
    except Exception:
        pass
    return []


result = {
    "ok": False,
    "source": dwg_path,
    "unit": "Millimeters",
    "curves": [],
    "dimensions": [],
    "errors": [],
}

try:
    import Rhino

    doc = Rhino.RhinoDoc.CreateHeadless(None)
    if doc is None:
        raise Exception("RhinoDoc.CreateHeadless returned None")
    result["imported"] = bool(doc.Import(dwg_path))

    doc_box = Rhino.Geometry.BoundingBox.Empty

    for rh_obj in doc.Objects:
        try:
            geo = rh_obj.Geometry
            attrs = rh_obj.Attributes
            layer = doc.Layers[attrs.LayerIndex].FullPath if attrs.LayerIndex >= 0 else None
            box = geo.GetBoundingBox(True)
            if box.IsValid:
                doc_box.Union(box)

            if isinstance(geo, Rhino.Geometry.Curve):
                pts = sample_curve(geo)
                if len(pts) >= 2:
                    result["curves"].append({
                        "type": geo.GetType().Name,
                        "layer": str(layer),
                        "length": round(float(geo.GetLength()), 4),
                        "bbox": bbox(box),
                        "points": pts,
                    })

            elif isinstance(geo, Rhino.Geometry.LinearDimension):
                item = {
                    "text": str(geo.PlainText),
                    "value": round(float(geo.NumericValue), 4),
                    "bbox": bbox(box),
                    "arrow1": point(geo.Arrowhead1End),
                    "arrow2": point(geo.Arrowhead2End),
                    "ext1": point(geo.ExtensionLine1End),
                    "ext2": point(geo.ExtensionLine2End),
                    "linePoint": point(geo.DimensionLinePoint),
                    "aligned": bool(geo.Aligned),
                }
                result["dimensions"].append(item)
        except Exception:
            result["errors"].append(traceback.format_exc())

    result["bbox"] = bbox(doc_box)
    result["curve_count"] = len(result["curves"])
    result["dimension_count"] = len(result["dimensions"])
    result["ok"] = True
    doc.Dispose()
except Exception:
    result["fatal_error"] = traceback.format_exc()

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False)
