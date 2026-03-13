from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.services.synth import get_synth_client

router = APIRouter(prefix="/synth", tags=["synth"])


@router.get("/price-paths")
async def price_paths(asset: str = "BTC", horizon: str = "1h", user=Depends(get_current_user)):
    try:
        client = get_synth_client()
        return await client.get_price_paths(asset, horizon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")


@router.get("/option-pricing")
async def option_pricing(asset: str = "BTC", user=Depends(get_current_user)):
    try:
        client = get_synth_client()
        return await client.get_option_pricing(asset)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")


@router.get("/distribution")
async def distribution(asset: str = "BTC", horizon: str = "1h", user=Depends(get_current_user)):
    try:
        client = get_synth_client()
        return await client.get_distribution(asset, horizon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")


@router.get("/liquidation")
async def liquidation(asset: str = "BTC", horizon: str = "24h", user=Depends(get_current_user)):
    try:
        client = get_synth_client()
        return await client.get_liquidation(asset, horizon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Synth API error: {e}")
