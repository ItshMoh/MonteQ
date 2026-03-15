from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.core.database import get_supabase

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/risk")
async def portfolio_risk_metrics(user=Depends(get_current_user)):
    """Portfolio-level risk metrics.

    Returns:
      - open_positions: count of open trades
      - max_open_positions: configured limit
      - total_budget_deployed: sum of budgets on open trades
      - total_realized_pnl: sum of P&L on closed trades
      - unrealized_exposure: list of open trades with current data
      - per_asset_exposure: budget deployed per asset
      - drawdown: worst realized P&L from closed trades
    """
    db = get_supabase()
    user_id = user["user_id"]

    # Get all trades
    open_trades = (
        db.table("trades")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "open")
        .execute()
    )
    closed_trades = (
        db.table("trades")
        .select("*")
        .eq("user_id", user_id)
        .in_("status", ["closed", "stopped"])
        .execute()
    )

    # Get user settings for limits
    settings_result = (
        db.table("user_settings")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    user_settings = settings_result.data[0] if settings_result.data else {
        "max_open_positions": 3,
        "default_budget": 10.0,
    }

    open_data = open_trades.data or []
    closed_data = closed_trades.data or []

    # Calculate metrics
    total_budget_deployed = sum(t.get("budget", 0) for t in open_data)
    total_realized_pnl = sum(t.get("pnl", 0) or 0 for t in closed_data)

    # Per-asset exposure
    per_asset = {}
    for t in open_data:
        asset = t.get("asset", "unknown")
        per_asset[asset] = per_asset.get(asset, 0) + t.get("budget", 0)

    # Drawdown — cumulative P&L low point from closed trades (sorted by close time)
    sorted_closed = sorted(closed_data, key=lambda x: x.get("closed_at") or "")
    cumulative_pnl = 0.0
    peak_pnl = 0.0
    max_drawdown = 0.0
    for t in sorted_closed:
        cumulative_pnl += t.get("pnl", 0) or 0
        if cumulative_pnl > peak_pnl:
            peak_pnl = cumulative_pnl
        dd = peak_pnl - cumulative_pnl
        if dd > max_drawdown:
            max_drawdown = dd

    return {
        "open_positions": len(open_data),
        "max_open_positions": user_settings.get("max_open_positions", 3),
        "total_budget_deployed": total_budget_deployed,
        "total_realized_pnl": total_realized_pnl,
        "max_drawdown": max_drawdown,
        "per_asset_exposure": per_asset,
        "open_trades": [
            {
                "id": t["id"],
                "asset": t["asset"],
                "direction": t["direction"],
                "strike_price": t["strike_price"],
                "entry_price": t["entry_price"],
                "budget": t["budget"],
                "opened_at": t["opened_at"],
            }
            for t in open_data
        ],
        "total_closed_trades": len(closed_data),
    }
