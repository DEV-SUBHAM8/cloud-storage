from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.core.supabase import sb

router = APIRouter(tags=["search"])

@router.get("/search")
def search(q: str = Query("", max_length=100), type: Optional[str] = None,
           user=Depends(get_current_user)):
    """type: image | pdf | video | audio | folder"""
    out = {"folders": [], "files": []}
    if type in (None, "", "folder"):
        fq = sb.table("folders").select("*").eq("owner_id", user["id"]).eq("is_deleted", False)
        if q:
            fq = fq.ilike("name", f"%{q}%")
        out["folders"] = fq.limit(50).execute().data
    if type != "folder":
        fl = sb.table("files").select("*").eq("owner_id", user["id"]).eq("is_deleted", False).eq("status", "ready")
        if q:
            fl = fl.ilike("name", f"%{q}%")
        if type in ("image", "video", "audio"):
            fl = fl.ilike("mime_type", f"{type}/%")
        elif type == "pdf":
            fl = fl.eq("mime_type", "application/pdf")
        out["files"] = fl.limit(100).execute().data
    return out
