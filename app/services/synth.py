import httpx
from app.core.config import get_settings


class SynthClient:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.synth_base_url
        self.headers = {"Authorization": f"Apikey {settings.synth_api_key}"}

    async def get_price_paths(self, asset: str = "BTC", horizon: str = "1h") -> dict:
        """Fetch Monte Carlo price-path simulations from Synth."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/sparklines",
                params={"asset": asset, "horizon": horizon},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_option_pricing(self, asset: str = "BTC") -> dict:
        """Fetch synthetic option pricing from Synth."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/option-pricing",
                params={"asset": asset},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_distribution(self, asset: str = "BTC", horizon: str = "1h") -> dict:
        """Fetch probability distribution (PDF/CDF) from Synth."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/distribution",
                params={"asset": asset, "horizon": horizon},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_liquidation(self, asset: str = "BTC", horizon: str = "24h") -> dict:
        """Fetch liquidation probability estimates."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/insights/liquidation",
                params={"asset": asset, "horizon": horizon},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()


def get_synth_client() -> SynthClient:
    return SynthClient()
