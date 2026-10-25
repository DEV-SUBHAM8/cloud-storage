import uuid, re
from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timezone
from app.core.config import settings
from app.core.security import get_current_user
from app.core.supabase import sb, storage
from app.schemas.schemas import InitUpload, CompleteUpload, ItemUpdate
from app.services.access import require, log
from app.main_limiter import limiter

router = APIRouter(prefix="/files", tags=["files"])

BLOCKED_EXT = {".exe", ".bat", ".cmd", ".sh", ".msi", ".scr"}

def _safe(name: str):
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)

@router.post("/init-upload")
@limiter.limit("60/minute")
def init_upload(request: Request, body: InitUpload, user=Depends(get_current_user)):
    if body.size > settings.MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(413, f"Max file size is {settings.MAX_FILE_MB} MB")
    if any(body.name.lower().endswith(e) for e in BLOCKED_EXT):
        raise HTTPException(400, "This file type is not allowed")
    if body.folder_id:
        require(user["id"], "folder", body.folder_id, "editor")
    path = f"{user['id']}/{uuid.uuid4()}_{_safe(body.name)}"
    row = sb.table("files").insert({
        "owner_id": user["id"], "folder_id": body.folder_id, "name": body.name,
        "mime_type": body.mime_type, "size": body.size,
        "storage_path": path, "status": "pending"
    }).execute().data[0]
    signed = storage.create_signed_upload_url(path)
    return {"file_id": row["id"], "path": path,
            "signed_url": signed.get("signed_url") or signed.get("signedUrl"),
            "token": signed.get("token")}

@router.post("/complete-upload")
def complete_upload(body: CompleteUpload, user=Depends(get_current_user)):
    row = sb.table("files").select("*").eq("id", body.file_id).limit(1).execute().data
    if not row or row[0]["owner_id"] != user["id"]:
        raise HTTPException(404, "file not found")
    sb.table("files").update({"status": "ready"}).eq("id", body.file_id).execute()
    log(user["id"], "upload", "file", body.file_id)
    return {"ok": True, "file_id": body.file_id}

@router.get("/{file_id}")
def get_file(file_id: str, user=Depends(get_current_user)):
    item, role = require(user["id"], "file", file_id)
    return {**item, "role": role}

@router.get("/{file_id}/download")
def download(file_id: str, user=Depends(get_current_user)):
    item, _ = require(user["id"], "file", file_id)
    res = storage.create_signed_url(item["storage_path"], 3600)
    log(user["id"], "download", "file", file_id)
    return {"url": res.get("signedURL") or res.get("signedUrl"), "name": item["name"],
            "mime_type": item["mime_type"]}

@router.patch("/{file_id}")
def update_file(file_id: str, body: ItemUpdate, user=Depends(get_current_user)):
    require(user["id"], "file", file_id, "editor")
    patch = {}
    if body.name:
        patch["name"] = body.name
    if body.move_to_root:
        patch["folder_id"] = None
    elif body.move_to:
        require(user["id"], "folder", body.move_to, "editor")
        patch["folder_id"] = body.move_to
    if not patch:
        raise HTTPException(400, "Nothing to update")
    row = sb.table("files").update(patch).eq("id", file_id).execute().data[0]
    log(user["id"], "update_file", "file", file_id)
    return row

@router.delete("/{file_id}")
def delete_file(file_id: str, user=Depends(get_current_user)):
    require(user["id"], "file", file_id, "editor")
    sb.table("files").update({
        "is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", file_id).execute()
    log(user["id"], "trash_file", "file", file_id)
    return {"ok": True}
