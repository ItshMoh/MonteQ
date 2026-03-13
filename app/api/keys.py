from fastapi import APIRouter, Depends, HTTPException
from app.schemas.auth import DeribitKeyRequest
from app.core.deps import get_current_user
from app.core.security import encrypt_api_key
from app.core.database import get_supabase

router = APIRouter(prefix="/keys", tags=["keys"])


@router.post("/deribit")
async def save_deribit_keys(req: DeribitKeyRequest, user=Depends(get_current_user)):
    db = get_supabase()
    user_id = user["user_id"]

    encrypted_id = encrypt_api_key(req.client_id)
    encrypted_secret = encrypt_api_key(req.client_secret)

    # Upsert — one set of keys per user
    existing = db.table("deribit_keys").select("id").eq("user_id", user_id).execute()
    if existing.data:
        db.table("deribit_keys").update({
            "client_id_enc": encrypted_id,
            "client_secret_enc": encrypted_secret,
        }).eq("user_id", user_id).execute()
    else:
        db.table("deribit_keys").insert({
            "user_id": user_id,
            "client_id_enc": encrypted_id,
            "client_secret_enc": encrypted_secret,
        }).execute()

    return {"message": "Deribit API keys saved"}


@router.get("/deribit/status")
async def check_deribit_keys(user=Depends(get_current_user)):
    db = get_supabase()
    result = db.table("deribit_keys").select("id").eq("user_id", user["user_id"]).execute()
    return {"keys_configured": bool(result.data)}
