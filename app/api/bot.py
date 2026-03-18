import asyncio
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.core.database import get_supabase
from app.core.security import decrypt_api_key
from app.services.deribit import DeribitClient
from app.services.derive import DeriveClient
from app.services.synth import get_synth_client
from app.services.executor import TradeExecutor
from app.services.derive_executor import DeriveTradeExecutor

router = APIRouter(prefix="/bot", tags=["bot"])

# Active bot tasks per user: user_id -> (asyncio.Task, asyncio.Event)
_active_bots: dict[str, tuple[asyncio.Task, asyncio.Event]] = {}


def _get_active_exchange(user_id: str) -> str:
    """Get the user's active exchange from settings."""
    db = get_supabase()
    result = db.table("user_settings").select("active_exchange").eq("user_id", user_id).execute()
    if result.data:
        return result.data[0].get("active_exchange", "deribit")
    return "deribit"


async def _build_executor(user_id: str):
    """Build an authenticated executor for the user's active exchange."""
    db = get_supabase()
    exchange = _get_active_exchange(user_id)
    synth = get_synth_client()

    if exchange == "derive":
        keys = db.table("derive_keys").select("*").eq("user_id", user_id).execute()
        if not keys.data:
            raise HTTPException(status_code=400, detail="Derive API keys not configured")

        private_key = decrypt_api_key(keys.data[0]["private_key_enc"])
        wallet_address = decrypt_api_key(keys.data[0]["wallet_address_enc"])
        subaccount_id = keys.data[0]["subaccount_id"]
        derive = DeriveClient(private_key, wallet_address, subaccount_id)
        return DeriveTradeExecutor(derive, synth, user_id)
    else:
        keys = db.table("deribit_keys").select("*").eq("user_id", user_id).execute()
        if not keys.data:
            raise HTTPException(status_code=400, detail="Deribit API keys not configured")

        client_id = decrypt_api_key(keys.data[0]["client_id_enc"])
        client_secret = decrypt_api_key(keys.data[0]["client_secret_enc"])
        deribit = DeribitClient(client_id, client_secret)
        await deribit.authenticate()
        return TradeExecutor(deribit, synth, user_id)


@router.post("/start")
async def start_bot(user=Depends(get_current_user)):
    """Start the autonomous trading bot."""
    user_id = user["user_id"]

    # Check if already running
    if user_id in _active_bots:
        task, _ = _active_bots[user_id]
        if not task.done():
            raise HTTPException(status_code=409, detail="Bot is already running")
        del _active_bots[user_id]

    # Mark bot as active in DB
    db = get_supabase()
    existing = db.table("user_settings").select("user_id").eq("user_id", user_id).execute()
    if not existing.data:
        db.table("user_settings").insert({"user_id": user_id, "bot_active": True}).execute()
    else:
        db.table("user_settings").update({"bot_active": True}).eq("user_id", user_id).execute()

    # Build executor and start loop
    executor = await _build_executor(user_id)
    stop_event = asyncio.Event()
    task = asyncio.create_task(executor.auto_scan_loop(stop_event))
    _active_bots[user_id] = (task, stop_event)

    return {"status": "started", "message": "Autonomous bot is now running"}


@router.post("/stop")
async def stop_bot(user=Depends(get_current_user)):
    """Stop the autonomous trading bot."""
    user_id = user["user_id"]

    # Mark bot as inactive in DB
    db = get_supabase()
    db.table("user_settings").update({"bot_active": False}).eq("user_id", user_id).execute()

    if user_id not in _active_bots:
        return {"status": "not_running", "message": "Bot was not running"}

    task, stop_event = _active_bots[user_id]
    stop_event.set()
    del _active_bots[user_id]

    return {"status": "stopped", "message": "Bot is stopping (open trades still monitored)"}


@router.get("/status")
async def bot_status(user=Depends(get_current_user)):
    """Check if the autonomous bot is currently running."""
    user_id = user["user_id"]

    running = False
    if user_id in _active_bots:
        task, _ = _active_bots[user_id]
        running = not task.done()

    db = get_supabase()
    settings = db.table("user_settings").select("*").eq("user_id", user_id).execute()
    config = settings.data[0] if settings.data else {}

    return {
        "running": running,
        "bot_active": config.get("bot_active", False),
        "active_exchange": config.get("active_exchange", "deribit"),
        "scan_interval_sec": config.get("scan_interval_sec", 300),
        "take_profit_pct": config.get("take_profit_pct", 0.20),
        "stop_loss_pct": config.get("stop_loss_pct", 0.10),
        "signal_threshold": config.get("signal_threshold", 0.75),
        "default_budget": config.get("default_budget", 10.0),
        "default_asset": config.get("default_asset", "BTC"),
    }
