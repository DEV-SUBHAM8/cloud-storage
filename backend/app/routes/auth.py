from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# Register / login / Google OAuth are handled by Supabase Auth on the frontend.
# The backend only verifies the Supabase access token.
@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
