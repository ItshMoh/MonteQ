from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.deps import get_current_user
from app.core.database import get_supabase
from app.core.security import decrypt_api_key
from app.services.deribit import DeribitClient
from app.services.synth import get_synth_client
from app.services.executor import TradeExecutor
from app.services.signal_engine import SignalEngine

router = APIRouter(prefix="/deribit", tags=["deribit"])


async def _get_deribit_client(user_id: str) -> DeribitClient:
    """Build an authenticated DeribitClient from stored keys."""
    db = get_supabase()
    keys = db.table("deribit_keys").select("*").eq("user_id", user_id).execute()
    if not keys.data:
        raise HTTPException(status_code=400, detail="Deribit API keys not configured")

    client_id = decrypt_api_key(keys.data[0]["client_id_enc"])
    client_secret = decrypt_api_key(keys.data[0]["client_secret_enc"])
    deribit = DeribitClient(client_id, client_secret)
    await deribit.authenticate()
    return deribit


# --- Account Info ---

@router.get("/account")
async def account_summary(currency: str = "BTC", user=Depends(get_current_user)):
    """Get Deribit account summary (balance, margin, equity)."""
    deribit = await _get_deribit_client(user["user_id"])
    return await deribit.get_account_summary(currency)


@router.get("/positions")
async def get_positions(currency: str = "BTC", user=Depends(get_current_user)):
    """Get all open option positions on Deribit."""
    deribit = await _get_deribit_client(user["user_id"])
    return await deribit.get_positions(currency, "option")


@router.get("/orders")
async def get_open_orders(currency: str = "BTC", user=Depends(get_current_user)):
    """Get all open orders on Deribit."""
    deribit = await _get_deribit_client(user["user_id"])
    return await deribit.get_open_orders(currency, "option")


# --- Market Data ---

@router.get("/instruments")
async def get_instruments(currency: str = "BTC", user=Depends(get_current_user)):
    """Get available options instruments."""
    deribit = await _get_deribit_client(user["user_id"])
    return await deribit.get_instruments(currency, "option")


@router.get("/orderbook/{instrument_name}")
async def get_order_book(instrument_name: str, user=Depends(get_current_user)):
    """Get order book for a specific instrument."""
    deribit = await _get_deribit_client(user["user_id"])
    return await deribit.get_order_book(instrument_name)


# --- Trade Execution ---

@router.post("/execute")
async def execute_trade(
    asset: str = "BTC",
    user=Depends(get_current_user),
):
    """Generate a signal and execute it on Deribit in one shot."""
    user_id = user["user_id"]
    db = get_supabase()

    # Load user settings
    settings_result = db.table("user_settings").select("*").eq("user_id", user_id).execute()
    if settings_result.data:
        user_settings = settings_result.data[0]
    else:
        user_settings = {"signal_threshold": 0.75, "default_budget": 10.0}

    # Generate signal
    synth = get_synth_client()
    engine = SignalEngine(synth)
    signal = await engine.generate_signal(
        asset=asset,
        signal_threshold=user_settings["signal_threshold"],
        budget=user_settings["default_budget"],
    )

    if signal["action"] == "HOLD":
        return {"status": "no_trade", "signal": signal}

    # Execute on Deribit
    deribit = await _get_deribit_client(user_id)
    executor = TradeExecutor(deribit, synth, user_id)
    result = await executor.execute_signal(signal, user_settings["default_budget"])

    return {"signal": signal, "execution": result}


@router.post("/close/{trade_id}")
async def close_trade(trade_id: str, user=Depends(get_current_user)):
    """Close an open trade."""
    deribit = await _get_deribit_client(user["user_id"])
    synth = get_synth_client()
    executor = TradeExecutor(deribit, synth, user["user_id"])
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
    """Start background monitoring for a trade.

    Monitors Synth data every minute and auto-exits if:
    - PoP drops below threshold
    - Take-profit target is hit
    - Stop-loss limit is hit
    - Directional bias flips
    """
    deribit = await _get_deribit_client(user["user_id"])
    synth = get_synth_client()
    executor = TradeExecutor(deribit, synth, user["user_id"])

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
    """Cancel all MonteQ orders on Deribit."""
    deribit = await _get_deribit_client(user["user_id"])
    return await deribit.cancel_all_by_label("monteq")
