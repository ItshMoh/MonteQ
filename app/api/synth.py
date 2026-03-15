from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.services.synth import get_synth_client

router = APIRouter(prefix="/synth", tags=["synth"])


@router.get("/prediction-percentiles")
async def prediction_percentiles(
    asset: str = "BTC", horizon: str = "1h", user=Depends(get_current_user)
):
    """Get price percentiles at 5-min intervals for directional bias."""
    try:
        client = get_synth_client()
        return await client.get_prediction_percentiles(asset, horizon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")


@router.get("/option-pricing")
async def option_pricing(asset: str = "BTC", user=Depends(get_current_user)):
    """Get synthetic call/put option prices across strikes."""
    try:
        client = get_synth_client()
        return await client.get_option_pricing(asset)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")


@router.get("/volatility")
async def volatility(
    asset: str = "BTC", horizon: str = "1h", user=Depends(get_current_user)
):
    """Get forecasted and realized volatility."""
    try:
        client = get_synth_client()
        return await client.get_volatility(asset, horizon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")


@router.get("/liquidation")
async def liquidation(
    asset: str = "BTC", horizon: str = "24h", user=Depends(get_current_user)
):
    """Get liquidation probability at various price levels."""
    try:
        client = get_synth_client()
        return await client.get_liquidation(asset, horizon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")


@router.get("/lp-probabilities")
async def lp_probabilities(
    asset: str = "BTC", horizon: str = "24h", user=Depends(get_current_user)
):
    """Get probability of price being above/below various levels."""
    try:
        client = get_synth_client()
        return await client.get_lp_probabilities(asset, horizon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")
