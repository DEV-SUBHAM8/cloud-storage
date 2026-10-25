from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.core.supabase import sb
from app.schemas.schemas import ShareCreate
from app.services.access import require, get_item, log

router = APIRouter(prefix="/shares", tags=["shares"])

@router.post("")
def create_share(body: ShareCreate, user=Depends(get_current_user)):
    require(user["id"], body.resource_type, body.resource_id, "owner")
    target = sb.table("profiles").select("id,email").eq("email", body.email.lower().strip()).limit(1).execute().data
    if not target:
        raise HTTPException(404, "No user with that email")
    if target[0]["id"] == user["id"]:
        raise HTTPException(400, "You already own this")
    row = sb.table("shares").upsert({
        "resource_type": body.resource_type, "resource_id": body.resource_id,
        "owner_id": user["id"], "shared_with": target[0]["id"], "role": body.role
    }, on_conflict="resource_type,resource_id,shared_with").execute().data[0]
    log(user["id"], "share", body.resource_type, body.resource_id)
    return row

@router.get("/with-me")
def shared_with_me(user=Depends(get_current_user)):
    rows = sb.table("shares").select("*").eq("shared_with", user["id"]).execute().data
    out = []
    for r in rows:
        item = get_item(r["resource_type"], r["resource_id"])
        if item and not item["is_deleted"]:
            out.append({**item, "resource_type": r["resource_type"], "role": r["role"]})
    return out

@router.get("/{resource_type}/{resource_id}")
def list_shares(resource_type: str, resource_id: str, user=Depends(get_current_user)):
    require(user["id"], resource_type, resource_id, "owner")
    rows = sb.table("shares").select("*").eq("resource_id", resource_id).execute().data
    for r in rows:
        p = sb.table("profiles").select("email").eq("id", r["shared_with"]).limit(1).execute().data
        r["email"] = p[0]["email"] if p else None
    return rows

@router.delete("/{share_id}")
def remove_share(share_id: str, user=Depends(get_current_user)):
    row = sb.table("shares").select("*").eq("id", share_id).limit(1).execute().data
    if not row:
        raise HTTPException(404, "Share not found")
    require(user["id"], row[0]["resource_type"], row[0]["resource_id"], "owner")
    sb.table("shares").delete().eq("id", share_id).execute()
    return {"ok": True}
