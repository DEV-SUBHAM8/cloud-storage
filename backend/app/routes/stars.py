from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import sb
from app.schemas.schemas import ItemRef
from app.services.access import require, get_item

router = APIRouter(prefix="/stars", tags=["stars"])

@router.post("/toggle")
def toggle(body: ItemRef, user=Depends(get_current_user)):
    require(user["id"], body.resource_type, body.resource_id)
    q = (sb.table("stars").select("*").eq("user_id", user["id"])
         .eq("resource_type", body.resource_type).eq("resource_id", body.resource_id))
    if q.execute().data:
        (sb.table("stars").delete().eq("user_id", user["id"])
         .eq("resource_type", body.resource_type).eq("resource_id", body.resource_id).execute())
        return {"starred": False}
    sb.table("stars").insert({"user_id": user["id"], "resource_type": body.resource_type,
                              "resource_id": body.resource_id}).execute()
    return {"starred": True}

@router.get("")
def list_stars(user=Depends(get_current_user)):
    rows = sb.table("stars").select("*").eq("user_id", user["id"]).execute().data
    out = {"files": [], "folders": []}
    for r in rows:
        item = get_item(r["resource_type"], r["resource_id"])
        if item and not item["is_deleted"]:
            out["files" if r["resource_type"] == "file" else "folders"].append(item)
    return out
