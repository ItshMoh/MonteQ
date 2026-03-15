from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.schemas.trade import (
    TradeSignalResponse,
    TradeResponse,
    TradeUpdate,
)
from app.core.deps import get_current_user
from app.core.database import get_supabase

router = APIRouter(prefix="/trades", tags=["trades"])


@router.get("/signals", response_model=List[TradeSignalResponse])
async def list_signals(
    status: str = None, limit: int = 20, user=Depends(get_current_user)
):
    db = get_supabase()
    query = (
        db.table("trade_signals")
        .select("*")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .limit(limit)
    )
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@router.get("/", response_model=List[TradeResponse])
async def list_trades(
    status: str = None, limit: int = 20, user=Depends(get_current_user)
):
    db = get_supabase()
    query = (
        db.table("trades")
        .select("*")
        .eq("user_id", user["user_id"])
        .order("opened_at", desc=True)
        .limit(limit)
    )
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(trade_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("trades")
        .select("*")
        .eq("id", trade_id)
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Trade not found")
    return result.data[0]


@router.get("/{trade_id}/events")
async def list_trade_events(trade_id: str, user=Depends(get_current_user)):
    """Get audit log events for a specific trade."""
    db = get_supabase()
    result = (
        db.table("trade_events")
        .select("*")
        .eq("trade_id", trade_id)
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/events/all")
async def list_all_events(
    event_type: Optional[str] = None,
    limit: int = 50,
    user=Depends(get_current_user),
):
    """Get all trade events for this user (audit trail)."""
    db = get_supabase()
    query = (
        db.table("trade_events")
        .select("*")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .limit(limit)
    )
    if event_type:
        query = query.eq("event_type", event_type)
    result = query.execute()
    return result.data


@router.patch("/{trade_id}", response_model=TradeResponse)
async def update_trade(
    trade_id: str, update: TradeUpdate, user=Depends(get_current_user)
):
    db = get_supabase()
    update_data = update.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        db.table("trades")
        .update(update_data)
        .eq("id", trade_id)
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Trade not found")
    return result.data[0]
