from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import sb, storage
from app.schemas.schemas import ItemRef
from app.services.access import require, log

router = APIRouter(prefix="/trash", tags=["trash"])

@router.get("")
def list_trash(user=Depends(get_current_user)):
    folders = sb.table("folders").select("*").eq("owner_id", user["id"]).eq("is_deleted", True).execute().data
    files = sb.table("files").select("*").eq("owner_id", user["id"]).eq("is_deleted", True).execute().data
    return {"folders": folders, "files": files}

@router.post("/restore")
def restore(body: ItemRef, user=Depends(get_current_user)):
    require(user["id"], body.resource_type, body.resource_id, "editor", allow_deleted=True)
    table = "files" if body.resource_type == "file" else "folders"
    sb.table(table).update({"is_deleted": False, "deleted_at": None}).eq("id", body.resource_id).execute()
    log(user["id"], "restore", body.resource_type, body.resource_id)
    return {"ok": True}

def _collect_files(folder_id, paths):
    for f in sb.table("files").select("id,storage_path").eq("folder_id", folder_id).execute().data:
        paths.append(f["storage_path"])
    for sub in sb.table("folders").select("id").eq("parent_id", folder_id).execute().data:
        _collect_files(sub["id"], paths)

@router.post("/delete-forever")
def delete_forever(body: ItemRef, user=Depends(get_current_user)):
    item, _ = require(user["id"], body.resource_type, body.resource_id, "owner", allow_deleted=True)
    paths = []
    if body.resource_type == "file":
        paths.append(item["storage_path"])
        sb.table("files").delete().eq("id", item["id"]).execute()
    else:
        _collect_files(item["id"], paths)
        sb.table("folders").delete().eq("id", item["id"]).execute()
    if paths:
        storage.remove(paths)
    for t in ("shares", "link_shares", "stars"):
        try:
            sb.table(t).delete().eq("resource_id", body.resource_id).execute()
        except Exception:
            pass
    return {"ok": True}
