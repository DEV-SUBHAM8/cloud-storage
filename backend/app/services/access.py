from fastapi import HTTPException
from app.core.supabase import sb

RANK = {"viewer": 1, "editor": 2, "owner": 3}

def get_item(rtype: str, rid: str):
    table = "files" if rtype == "file" else "folders"
    try:
        r = sb.table(table).select("*").eq("id", rid).limit(1).execute().data
    except Exception:
        return None
    return r[0] if r else None

def folder_chain(folder_id):
    """Folder rows from the given folder up to the root."""
    chain, seen = [], set()
    while folder_id and folder_id not in seen and len(chain) < 50:
        seen.add(folder_id)
        r = sb.table("folders").select("*").eq("id", folder_id).limit(1).execute().data
        if not r:
            break
        chain.append(r[0])
        folder_id = r[0]["parent_id"]
    return chain

def get_role(user_id: str, rtype: str, item: dict):
    if item["owner_id"] == user_id:
        return "owner"
    chain = folder_chain(item["id"] if rtype == "folder" else item["folder_id"])
    if any(f["owner_id"] == user_id for f in chain):
        return "owner"
    ids = [f["id"] for f in chain] + ([item["id"]] if rtype == "file" else [])
    if not ids:
        return None
    rows = (sb.table("shares").select("role")
            .eq("shared_with", user_id).in_("resource_id", ids).execute().data)
    if any(r["role"] == "editor" for r in rows):
        return "editor"
    return "viewer" if rows else None

def require(user_id, rtype, rid, min_role="viewer", allow_deleted=False):
    item = get_item(rtype, rid)
    if not item or (item["is_deleted"] and not allow_deleted):
        raise HTTPException(404, f"{rtype} not found")
    role = get_role(user_id, rtype, item)
    if not role or RANK[role] < RANK[min_role]:
        raise HTTPException(403, "Permission denied")
    return item, role

def log(user_id, action, rtype=None, rid=None):
    try:
        sb.table("activities").insert(
            {"user_id": user_id, "action": action,
             "resource_type": rtype, "resource_id": rid}).execute()
    except Exception:
        pass
