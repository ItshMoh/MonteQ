from fastapi import APIRouter, Depends
from app.schemas.trade import UserSettingsUpdate, UserSettingsResponse
from app.core.deps import get_current_user
from app.core.database import get_supabase

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=UserSettingsResponse)
async def get_settings(user=Depends(get_current_user)):
    db = get_supabase()
    user_id = user["user_id"]

    result = db.table("user_settings").select("*").eq("user_id", user_id).execute()

    if not result.data:
        # Create default settings
        db.table("user_settings").insert({"user_id": user_id}).execute()
        result = db.table("user_settings").select("*").eq("user_id", user_id).execute()

    return result.data[0]


@router.patch("/", response_model=UserSettingsResponse)
async def update_settings(
    update: UserSettingsUpdate, user=Depends(get_current_user)
):
    db = get_supabase()
    user_id = user["user_id"]

    # Ensure settings row exists
    existing = db.table("user_settings").select("user_id").eq("user_id", user_id).execute()
    if not existing.data:
        db.table("user_settings").insert({"user_id": user_id}).execute()

    update_data = update.model_dump(exclude_none=True)
    if update_data:
        db.table("user_settings").update(update_data).eq("user_id", user_id).execute()

    result = db.table("user_settings").select("*").eq("user_id", user_id).execute()
    return result.data[0]
