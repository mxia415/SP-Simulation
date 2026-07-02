import json
import traceback

out_path = "/Users/ming/Documents/Codex/2026-06-24/s/outputs/gh_probe.json"
gh_path = "/Users/ming/Desktop/凌蛛控制.gh"

result = {"ok": False, "gh_path": gh_path}

try:
    import clr
    clr.AddReference("Grasshopper")
    clr.AddReference("GH_IO")

    import Grasshopper
    from Grasshopper.Kernel import GH_DocumentIO

    io = GH_DocumentIO()
    result["open_result"] = bool(io.Open(gh_path))
    doc = io.Document
    result["doc_is_null"] = doc is None

    if doc is not None:
        objects = []
        for obj in doc.Objects:
            item = {
                "type": obj.GetType().FullName,
                "name": getattr(obj, "Name", None),
                "nick_name": getattr(obj, "NickName", None),
                "description": getattr(obj, "Description", None),
                "instance_guid": str(getattr(obj, "InstanceGuid", "")),
                "category": getattr(obj, "Category", None),
                "subcategory": getattr(obj, "SubCategory", None),
            }
            try:
                item["x"] = float(obj.Attributes.Pivot.X)
                item["y"] = float(obj.Attributes.Pivot.Y)
            except Exception:
                pass
            objects.append(item)
        result["object_count"] = len(objects)
        result["objects"] = objects
        result["document_name"] = getattr(doc, "DisplayName", None)
        result["ok"] = True
except Exception:
    result["error"] = traceback.format_exc()

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
