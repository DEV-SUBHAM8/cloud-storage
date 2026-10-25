import secrets, bcrypt
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user
from app.core.supabase import sb, storage
from app.schemas.schemas import PublicLinkCreate
from app.services.access import require, get_item

router = APIRouter(tags=["public"])

@router.post("/public-link")
def create_link(body: PublicLinkCreate, user=Depends(get_current_user)):
    require(user["id"], body.resource_type, body.resource_id, "owner")
    pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode() if body.password else None
    row = sb.table("link_shares").insert({
        "resource_type": body.resource_type, "resource_id": body.resource_id,
        "token": secrets.token_urlsafe(24), "password_hash": pw,
        "expires_at": body.expires_at, "created_by": user["id"]
    }).execute().data[0]
    return {"token": row["token"], "has_password": bool(pw), "expires_at": row["expires_at"]}

@router.delete("/public-link/{token}")
def revoke(token: str, user=Depends(get_current_user)):
    sb.table("link_shares").delete().eq("token", token).eq("created_by", user["id"]).execute()
    return {"ok": True}

@router.get("/public/{token}")
def open_link(token: str, password: Optional[str] = Query(None)):
    rows = sb.table("link_shares").select("*").eq("token", token).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Link not found")
    link = rows[0]
    if link["expires_at"]:
        exp = datetime.fromisoformat(link["expires_at"].replace("Z", "+00:00"))
        if exp < datetime.now(timezone.utc):
            raise HTTPException(410, "Link expired")
    if link["password_hash"]:
        if not password:
            raise HTTPException(401, "Password required")
        if not bcrypt.checkpw(password.encode(), link["password_hash"].encode()):
            raise HTTPException(403, "Wrong password")
    item = get_item(link["resource_type"], link["resource_id"])
    if not item or item["is_deleted"]:
        raise HTTPException(404, "Item no longer available")
    if link["resource_type"] == "file":
        res = storage.create_signed_url(item["storage_path"], 3600)
        return {"type": "file", "name": item["name"], "size": item["size"],
                "mime_type": item["mime_type"], "url": res.get("signedURL") or res.get("signedUrl")}
    files = (sb.table("files").select("id,name,size,mime_type,storage_path")
             .eq("folder_id", item["id"]).eq("is_deleted", False).eq("status", "ready").execute().data)
    for f in files:
        res = storage.create_signed_url(f.pop("storage_path"), 3600)
        f["url"] = res.get("signedURL") or res.get("signedUrl")
    return {"type": "folder", "name": item["name"], "files": files}
