import json
import math
import traceback

dwg_path = "/Users/ming/Desktop/WQ3D-DB001-260307.DWG(1).dwg"
out_path = "/Users/ming/Documents/Codex/2026-06-24/s/outputs/wq3d_db001_dwg_analysis.json"


def s(value):
    try:
        if value is None:
            return None
        return str(value)
    except Exception:
        return None


def pt(p):
    try:
        return {"x": float(p.X), "y": float(p.Y), "z": float(p.Z)}
    except Exception:
        return None


def pt2(p):
    try:
        return {"x": float(p.X), "y": float(p.Y)}
    except Exception:
        return None


def bbox(box):
    try:
        return {"min": pt(box.Min), "max": pt(box.Max)}
    except Exception:
        return None


def round_num(value):
    try:
        if math.isnan(value) or math.isinf(value):
            return None
        return round(float(value), 6)
    except Exception:
        return None


result = {
    "ok": False,
    "source": dwg_path,
    "layers": [],
    "objects": [],
    "texts": [],
    "dimensions": [],
    "curves": [],
    "errors": [],
}

try:
    import Rhino

    doc = Rhino.RhinoDoc.CreateHeadless(None)
    result["doc_opened"] = doc is not None
    if doc is None:
        raise Exception("RhinoDoc.CreateHeadless returned None")

    result["imported"] = bool(doc.Import(dwg_path))

    result["name"] = s(doc.Name)
    result["path"] = s(doc.Path)
    result["unit_system"] = s(doc.ModelUnitSystem)
    result["absolute_tolerance"] = round_num(doc.ModelAbsoluteTolerance)

    for layer in doc.Layers:
        if layer is None:
            continue
        result["layers"].append({
            "index": int(layer.Index),
            "name": s(layer.FullPath),
            "visible": bool(layer.IsVisible),
            "locked": bool(layer.IsLocked),
            "color": s(layer.Color),
        })

    type_counts = {}
    layer_counts = {}
    doc_box = Rhino.Geometry.BoundingBox.Empty

    for rh_obj in doc.Objects:
        try:
            geo = rh_obj.Geometry
            attrs = rh_obj.Attributes
            obj_type = s(geo.GetType().FullName)
            layer = doc.Layers[attrs.LayerIndex].FullPath if attrs.LayerIndex >= 0 else None
            type_counts[obj_type] = type_counts.get(obj_type, 0) + 1
            layer_counts[layer] = layer_counts.get(layer, 0) + 1
            box = geo.GetBoundingBox(True)
            if box.IsValid:
                doc_box.Union(box)

            record = {
                "id": s(rh_obj.Id),
                "object_type": s(rh_obj.ObjectType),
                "geometry_type": obj_type,
                "layer": s(layer),
                "name": s(attrs.Name),
                "bbox": bbox(box),
            }
            result["objects"].append(record)

            if isinstance(geo, Rhino.Geometry.TextEntity):
                text = s(geo.PlainText)
                item = dict(record)
                item.update({
                    "text": text,
                    "plane_origin": pt(geo.Plane.Origin),
                    "height": round_num(geo.TextHeight),
                })
                result["texts"].append(item)

            elif isinstance(geo, Rhino.Geometry.AnnotationBase):
                item = dict(record)
                item.update({
                    "text": s(getattr(geo, "PlainText", None)),
                    "rich_text": s(getattr(geo, "RichText", None)),
                })
                for attr in ["Distance", "NumericValue", "Measurement", "Length"]:
                    try:
                        item[attr] = round_num(getattr(geo, attr))
                    except Exception:
                        pass
                if isinstance(geo, Rhino.Geometry.LinearDimension):
                    item["distance_between_arrow_tips"] = round_num(geo.DistanceBetweenArrowTips)
                    item["extension_line_1_end_2d"] = pt2(geo.ExtensionLine1End)
                    item["extension_line_2_end_2d"] = pt2(geo.ExtensionLine2End)
                    item["arrowhead_1_end_2d"] = pt2(geo.Arrowhead1End)
                    item["arrowhead_2_end_2d"] = pt2(geo.Arrowhead2End)
                    item["dimension_line_point_2d"] = pt2(geo.DimensionLinePoint)
                    item["aligned"] = bool(geo.Aligned)
                    item["annotation_type"] = s(geo.AnnotationType)
                result["dimensions"].append(item)

            elif isinstance(geo, Rhino.Geometry.Curve):
                item = dict(record)
                item.update({
                    "length": round_num(geo.GetLength()),
                    "is_closed": bool(geo.IsClosed),
                    "degree": int(geo.Degree) if hasattr(geo, "Degree") else None,
                })
                result["curves"].append(item)

        except Exception:
            result["errors"].append(traceback.format_exc())

    result["type_counts"] = type_counts
    result["layer_counts"] = layer_counts
    result["document_bbox"] = bbox(doc_box)
    result["object_count"] = len(result["objects"])
    result["text_count"] = len(result["texts"])
    result["dimension_count"] = len(result["dimensions"])
    result["curve_count"] = len(result["curves"])
    result["ok"] = True

    doc.Dispose()
except Exception:
    result["fatal_error"] = traceback.format_exc()

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
