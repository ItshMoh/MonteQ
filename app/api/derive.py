from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.deps import get_current_user
from app.core.database import get_supabase
from app.core.security import decrypt_api_key
from app.services.derive import DeriveClient
from app.services.synth import get_synth_client
from app.services.derive_executor import DeriveTradeExecutor
from app.services.signal_engine import SignalEngine

router = APIRouter(prefix="/derive", tags=["derive"])


async def _get_derive_client(user_id: str) -> DeriveClient:
    """Build a DeriveClient from stored encrypted keys."""
    db = get_supabase()
    keys = db.table("derive_keys").select("*").eq("user_id", user_id).execute()
    if not keys.data:
        raise HTTPException(status_code=400, detail="Derive API keys not configured")

    private_key = decrypt_api_key(keys.data[0]["private_key_enc"])
    wallet_address = decrypt_api_key(keys.data[0]["wallet_address_enc"])
    subaccount_id = keys.data[0]["subaccount_id"]

    return DeriveClient(private_key, wallet_address, subaccount_id)


# --- Account Info ---

@router.get("/account")
async def account_summary(user=Depends(get_current_user)):
    """Get Derive subaccount summary."""
    derive = await _get_derive_client(user["user_id"])
    return await derive.get_account_summary()


@router.get("/positions")
async def get_positions(currency: str = "ETH", user=Depends(get_current_user)):
    """Get all open option positions on Derive."""
    derive = await _get_derive_client(user["user_id"])
    return await derive.get_positions(currency, "option")


@router.get("/orders")
async def get_open_orders(currency: str = "ETH", user=Depends(get_current_user)):
    """Get all open orders on Derive."""
    derive = await _get_derive_client(user["user_id"])
    return await derive.get_open_orders(currency, "option")


# --- Market Data ---

@router.get("/instruments")
async def get_instruments(currency: str = "ETH", user=Depends(get_current_user)):
    """Get available options instruments."""
    derive = await _get_derive_client(user["user_id"])
    return await derive.get_instruments(currency, "option")


@router.get("/orderbook/{instrument_name}")
async def get_order_book(instrument_name: str, user=Depends(get_current_user)):
    """Get order book for a specific instrument."""
    derive = await _get_derive_client(user["user_id"])
    return await derive.get_order_book(instrument_name)


# --- Trade Execution ---

@router.post("/execute")
async def execute_trade(
    asset: str = "ETH",
    user=Depends(get_current_user),
):
    """Generate a signal and execute it on Derive in one shot."""
    user_id = user["user_id"]
    db = get_supabase()

    settings_result = db.table("user_settings").select("*").eq("user_id", user_id).execute()
    if settings_result.data:
        user_settings = settings_result.data[0]
    else:
        user_settings = {"signal_threshold": 0.75, "default_budget": 10.0}

    synth = get_synth_client()
    engine = SignalEngine(synth)
    signal = await engine.generate_signal(
        asset=asset,
        signal_threshold=user_settings["signal_threshold"],
        budget=user_settings["default_budget"],
    )

    if signal["action"] == "HOLD":
        return {"status": "no_trade", "signal": signal}

    derive = await _get_derive_client(user_id)
    executor = DeriveTradeExecutor(derive, synth, user_id)
    result = await executor.execute_signal(signal, user_settings["default_budget"])

    return {"signal": signal, "execution": result}


@router.post("/close/{trade_id}")
async def close_trade(trade_id: str, user=Depends(get_current_user)):
    """Close an open trade."""
    derive = await _get_derive_client(user["user_id"])
    synth = get_synth_client()
    executor = DeriveTradeExecutor(derive, synth, user["user_id"])
    return await executor.close_position(trade_id)


@router.post("/monitor/{trade_id}")
async def start_monitoring(
    trade_id: str,
    background_tasks: BackgroundTasks,
    pop_exit_threshold: float = 0.5,
    take_profit_pct: float = 0.20,
    stop_loss_pct: float = 0.10,
    user=Depends(get_current_user),
):
    """Start background monitoring for a trade."""
    derive = await _get_derive_client(user["user_id"])
    synth = get_synth_client()
    executor = DeriveTradeExecutor(derive, synth, user["user_id"])

    background_tasks.add_task(
        executor.monitor_trade,
        trade_id=trade_id,
        pop_exit_threshold=pop_exit_threshold,
        take_profit_pct=take_profit_pct,
        stop_loss_pct=stop_loss_pct,
    )

    return {
        "status": "monitoring_started",
        "trade_id": trade_id,
        "pop_exit_threshold": pop_exit_threshold,
        "take_profit_pct": take_profit_pct,
        "stop_loss_pct": stop_loss_pct,
    }


@router.delete("/orders")
async def cancel_all_orders(user=Depends(get_current_user)):
    """Cancel all open orders on Derive."""
    derive = await _get_derive_client(user["user_id"])
    return await derive.cancel_all()
