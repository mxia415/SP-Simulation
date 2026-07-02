import json
import traceback

out_path = "/Users/ming/Documents/Codex/2026-06-24/s/outputs/gh_analysis.json"
gh_path = "/Users/ming/Desktop/凌蛛控制.gh"


def safe_str(value):
    try:
        if value is None:
            return None
        return str(value)
    except Exception:
        return None


def scalar(value):
    try:
        return float(value)
    except Exception:
        return safe_str(value)


def param_info(param):
    info = {
        "name": safe_str(getattr(param, "Name", None)),
        "nick_name": safe_str(getattr(param, "NickName", None)),
        "type": safe_str(param.GetType().FullName),
        "instance_guid": safe_str(getattr(param, "InstanceGuid", None)),
        "sources": [],
        "recipients": [],
    }
    try:
        for src in param.Sources:
            info["sources"].append({
                "guid": safe_str(src.InstanceGuid),
                "name": safe_str(getattr(src, "Name", None)),
                "nick_name": safe_str(getattr(src, "NickName", None)),
                "type": safe_str(src.GetType().FullName),
            })
    except Exception:
        pass
    try:
        for rec in param.Recipients:
            info["recipients"].append({
                "guid": safe_str(rec.InstanceGuid),
                "name": safe_str(getattr(rec, "Name", None)),
                "nick_name": safe_str(getattr(rec, "NickName", None)),
                "type": safe_str(rec.GetType().FullName),
            })
    except Exception:
        pass
    return info


def object_base(obj):
    item = {
        "guid": safe_str(getattr(obj, "InstanceGuid", None)),
        "type": safe_str(obj.GetType().FullName),
        "name": safe_str(getattr(obj, "Name", None)),
        "nick_name": safe_str(getattr(obj, "NickName", None)),
        "description": safe_str(getattr(obj, "Description", None)),
        "category": safe_str(getattr(obj, "Category", None)),
        "subcategory": safe_str(getattr(obj, "SubCategory", None)),
        "inputs": [],
        "outputs": [],
    }
    try:
        item["pivot"] = {
            "x": float(obj.Attributes.Pivot.X),
            "y": float(obj.Attributes.Pivot.Y),
        }
    except Exception:
        pass
    return item


result = {"ok": False, "gh_path": gh_path}

try:
    import clr
    clr.AddReference("Grasshopper")
    clr.AddReference("GH_IO")

    from Grasshopper.Kernel import GH_DocumentIO
    from Grasshopper.Kernel.Special import GH_NumberSlider, GH_Group

    io = GH_DocumentIO()
    result["open_result"] = bool(io.Open(gh_path))
    doc = io.Document

    result["document"] = {
        "display_name": safe_str(getattr(doc, "DisplayName", None)),
        "object_count": int(doc.ObjectCount),
    }

    objects = []
    wires = []
    sliders = []
    groups = []
    missing = []

    object_by_param = {}
    for obj in doc.Objects:
        try:
            if hasattr(obj, "Params"):
                for p in obj.Params.Input:
                    object_by_param[safe_str(p.InstanceGuid)] = obj
                for p in obj.Params.Output:
                    object_by_param[safe_str(p.InstanceGuid)] = obj
            else:
                object_by_param[safe_str(obj.InstanceGuid)] = obj
        except Exception:
            object_by_param[safe_str(getattr(obj, "InstanceGuid", None))] = obj

    for obj in doc.Objects:
        item = object_base(obj)

        if hasattr(obj, "Params"):
            for p in obj.Params.Input:
                pinfo = param_info(p)
                item["inputs"].append(pinfo)
                for src in pinfo["sources"]:
                    owner = object_by_param.get(src["guid"])
                    wires.append({
                        "from_param_guid": src["guid"],
                        "from_param": src["nick_name"] or src["name"],
                        "from_object_guid": safe_str(getattr(owner, "InstanceGuid", None)) if owner else None,
                        "from_object": safe_str(getattr(owner, "NickName", None)) if owner else None,
                        "from_object_type": safe_str(owner.GetType().FullName) if owner else None,
                        "to_object_guid": item["guid"],
                        "to_object": item["nick_name"] or item["name"],
                        "to_object_type": item["type"],
                        "to_param_guid": pinfo["instance_guid"],
                        "to_param": pinfo["nick_name"] or pinfo["name"],
                    })
            for p in obj.Params.Output:
                item["outputs"].append(param_info(p))
        else:
            pinfo = param_info(obj)
            item["recipients"] = pinfo["recipients"]
            for rec in pinfo["recipients"]:
                owner = object_by_param.get(rec["guid"])
                wires.append({
                    "from_param_guid": item["guid"],
                    "from_param": item["nick_name"] or item["name"],
                    "from_object_guid": item["guid"],
                    "from_object": item["nick_name"] or item["name"],
                    "from_object_type": item["type"],
                    "to_param_guid": rec["guid"],
                    "to_param": rec["nick_name"] or rec["name"],
                    "to_object_guid": safe_str(getattr(owner, "InstanceGuid", None)) if owner else None,
                    "to_object": safe_str(getattr(owner, "NickName", None)) if owner else None,
                    "to_object_type": safe_str(owner.GetType().FullName) if owner else None,
                })

        if isinstance(obj, GH_NumberSlider):
            slider = dict(item)
            try:
                slider["current_value"] = scalar(obj.CurrentValue)
                slider["min"] = scalar(obj.Slider.Minimum)
                slider["max"] = scalar(obj.Slider.Maximum)
                slider["decimal_places"] = int(obj.Slider.DecimalPlaces)
                slider["tick_count"] = int(obj.Slider.TickCount)
                slider["type"] = safe_str(obj.Slider.Type)
            except Exception as e:
                slider["slider_error"] = safe_str(e)
            sliders.append(slider)

        if isinstance(obj, GH_Group):
            group = dict(item)
            try:
                group["object_ids"] = [safe_str(g) for g in obj.ObjectIDs]
            except Exception:
                pass
            groups.append(group)

        try:
            if getattr(obj, "RuntimeMessageLevel", None):
                missing.append({
                    "guid": item["guid"],
                    "name": item["nick_name"] or item["name"],
                    "level": safe_str(obj.RuntimeMessageLevel),
                })
        except Exception:
            pass

        objects.append(item)

    result["objects"] = objects
    result["sliders"] = sliders
    result["groups"] = groups
    result["wires"] = wires
    result["wire_count"] = len(wires)
    result["runtime_messages"] = missing
    result["ok"] = True

except Exception:
    result["error"] = traceback.format_exc()

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
