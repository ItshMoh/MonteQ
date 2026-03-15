import httpx
from app.core.config import get_settings


class SynthClient:
    """Client for the Synth (SN50) REST and WebSocket API."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.synth_base_url
        self.headers = {"Authorization": f"Apikey {settings.synth_api_key}"}

    async def get_prediction_percentiles(
        self, asset: str = "BTC", horizon: str = "1h"
    ) -> dict:
        """Fetch price percentiles at 5-min intervals over the forecast horizon.

        Returns current_price, forecast_future.percentiles (array of
        {0.005, 0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 0.995} per timestep),
        forecast_past, and realized data.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/prediction-percentiles",
                params={"asset": asset, "horizon": horizon},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_option_pricing(self, asset: str = "BTC") -> dict:
        """Fetch synthetic option prices across strikes.

        Returns current_price, call_options {strike: price},
        put_options {strike: price}, expiry_time.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/option-pricing",
                params={"asset": asset},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_volatility(
        self, asset: str = "BTC", horizon: str = "1h"
    ) -> dict:
        """Fetch volatility forecasts and realized volatility.

        Returns current_price, forecast_future {average_volatility, volatility[]},
        forecast_past, realized {average_volatility, prices[], volatility[]}.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/volatility",
                params={"asset": asset, "horizon": horizon},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_liquidation(
        self, asset: str = "BTC", horizon: str = "24h"
    ) -> dict:
        """Fetch liquidation probability estimates at various price levels.

        Returns current_price, data[] with price_change,
        long_liquidation_probability, short_liquidation_probability.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/liquidation",
                params={"asset": asset, "horizon": horizon},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_lp_probabilities(
        self, asset: str = "BTC", horizon: str = "24h"
    ) -> dict:
        """Fetch probability_above / probability_below at various price levels.

        Useful for calculating probability of price reaching a strike.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/lp-probabilities",
                params={"asset": asset, "horizon": horizon},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()


def get_synth_client() -> SynthClient:
    return SynthClient()
