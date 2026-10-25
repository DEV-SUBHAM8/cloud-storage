from fastapi import Header, HTTPException
from app.core.supabase import sb

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        res = sb.auth.get_user(token)
        user = res.user
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    if not user:
        raise HTTPException(401, "Invalid token")
    return {"id": str(user.id), "email": user.email}
