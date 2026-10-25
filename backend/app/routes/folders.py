from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from app.core.security import get_current_user
from app.core.supabase import sb
from app.schemas.schemas import FolderCreate, ItemUpdate
from app.services.access import require, folder_chain, log

router = APIRouter(prefix="/folders", tags=["folders"])

def _contents(folder_id, owner_filter=None):
    fq = sb.table("folders").select("*").eq("is_deleted", False)
    fl = sb.table("files").select("*").eq("is_deleted", False).eq("status", "ready")
    if folder_id is None:
        fq = fq.is_("parent_id", "null").eq("owner_id", owner_filter)
        fl = fl.is_("folder_id", "null").eq("owner_id", owner_filter)
    else:
        fq = fq.eq("parent_id", folder_id)
        fl = fl.eq("folder_id", folder_id)
    return fq.order("name").execute().data, fl.order("name").execute().data

@router.post("")
def create_folder(body: FolderCreate, user=Depends(get_current_user)):
    if body.parent_id:
        require(user["id"], "folder", body.parent_id, "editor")
    row = sb.table("folders").insert({
        "owner_id": user["id"], "parent_id": body.parent_id, "name": body.name
    }).execute().data[0]
    log(user["id"], "create_folder", "folder", row["id"])
    return row

@router.get("/root")
def root(user=Depends(get_current_user)):
    folders, files = _contents(None, user["id"])
    return {"folder": None, "breadcrumb": [], "folders": folders, "files": files}

@router.get("/{folder_id}")
def get_folder(folder_id: str, user=Depends(get_current_user)):
    folder, role = require(user["id"], "folder", folder_id)
    crumbs = [{"id": f["id"], "name": f["name"]} for f in reversed(folder_chain(folder_id))]
    folders, files = _contents(folder_id)
    return {"folder": folder, "role": role, "breadcrumb": crumbs,
            "folders": folders, "files": files}

@router.patch("/{folder_id}")
def update_folder(folder_id: str, body: ItemUpdate, user=Depends(get_current_user)):
    require(user["id"], "folder", folder_id, "editor")
    patch = {}
    if body.name:
        patch["name"] = body.name
    if body.move_to_root:
        patch["parent_id"] = None
    elif body.move_to:
        if body.move_to == folder_id or any(f["id"] == folder_id for f in folder_chain(body.move_to)):
            raise HTTPException(400, "Cannot move a folder into itself")
        require(user["id"], "folder", body.move_to, "editor")
        patch["parent_id"] = body.move_to
    if not patch:
        raise HTTPException(400, "Nothing to update")
    row = sb.table("folders").update(patch).eq("id", folder_id).execute().data[0]
    log(user["id"], "update_folder", "folder", folder_id)
    return row

@router.delete("/{folder_id}")
def delete_folder(folder_id: str, user=Depends(get_current_user)):
    require(user["id"], "folder", folder_id, "editor")
    sb.table("folders").update({
        "is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", folder_id).execute()
    log(user["id"], "trash_folder", "folder", folder_id)
    return {"ok": True}
