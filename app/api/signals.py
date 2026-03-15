from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.core.database import get_supabase
from app.services.synth import get_synth_client
from app.services.signal_engine import SignalEngine

router = APIRouter(prefix="/signals", tags=["signals"])


@router.post("/generate")
async def generate_signal(
    asset: str = "BTC",
    user=Depends(get_current_user),
):
    """Generate a trade signal for the given asset using the user's configured settings."""
    db = get_supabase()
    user_id = user["user_id"]

    # Load user settings
    settings_result = db.table("user_settings").select("*").eq("user_id", user_id).execute()
    if settings_result.data:
        user_settings = settings_result.data[0]
    else:
        user_settings = {
            "signal_threshold": 0.75,
            "default_budget": 10.0,
        }

    threshold = user_settings["signal_threshold"]
    budget = user_settings["default_budget"]

    # Run signal engine
    try:
        engine = SignalEngine(get_synth_client())
        signal = await engine.generate_signal(
            asset=asset,
            signal_threshold=threshold,
            budget=budget,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Signal generation failed: {e}")

    # Save signal to DB if actionable
    if signal["action"] != "HOLD":
        db.table("trade_signals").insert({
            "user_id": user_id,
            "asset": asset,
            "direction": signal["direction"],
            "bias_pct": signal["bias"]["bias_pct"],
            "crps_score": signal["confidence"]["score"],
            "pop": signal["pop"]["pop_pct"],
            "strike_price": signal["strike"]["strike_price"],
            "entry_price": signal["strike"]["premium"],
            "status": "pending",
        }).execute()

    return signal
