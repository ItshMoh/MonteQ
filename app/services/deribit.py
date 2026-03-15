import httpx
from typing import Optional
from app.core.config import get_settings


class DeribitClient:
    """Client for Deribit API v2 (testnet/mainnet)."""

    def __init__(self, client_id: str, client_secret: str):
        settings = get_settings()
        self.base_url = f"{settings.deribit_base_url}/api/v2"
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token: Optional[str] = None

    async def authenticate(self) -> dict:
        """Authenticate via client_credentials grant."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/public/auth",
                params={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "client_credentials",
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            if "result" not in data:
                raise Exception(f"Auth failed: {data.get('error', data)}")

            self.access_token = data["result"]["access_token"]
            return data["result"]

    async def _call(self, method: str, params: dict = None) -> dict:
        """Make a REST request to Deribit API v2.

        Uses GET with query params and Authorization header for private methods.
        """
        is_private = method.startswith("private/")

        if is_private and not self.access_token:
            await self.authenticate()

        headers = {}
        if is_private and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/{method}",
                params=params or {},
                headers=headers,
                timeout=15,
            )

            data = resp.json()

            if resp.status_code != 200:
                raise Exception(
                    f"Deribit API error ({resp.status_code}): {data}"
                )

            if "error" in data:
                raise Exception(f"Deribit error: {data['error']}")

            return data.get("result", data)

    # --- Account ---

    async def get_account_summary(self, currency: str = "BTC") -> dict:
        return await self._call(
            "private/get_account_summary",
            {"currency": currency},
        )

    async def get_positions(self, currency: str = "BTC", kind: str = "option") -> list:
        return await self._call(
            "private/get_positions",
            {"currency": currency, "kind": kind},
        )

    # --- Market Data ---

    async def get_instruments(
        self, currency: str = "BTC", kind: str = "option", expired: bool = False
    ) -> list:
        return await self._call(
            "public/get_instruments",
            {"currency": currency, "kind": kind, "expired": str(expired).lower()},
        )

    async def get_order_book(self, instrument_name: str, depth: int = 5) -> dict:
        return await self._call(
            "public/get_order_book",
            {"instrument_name": instrument_name, "depth": depth},
        )

    async def get_index_price(self, index_name: str = "btc_usd") -> dict:
        return await self._call(
            "public/get_index_price",
            {"index_name": index_name},
        )

    # --- Order Placement ---

    async def buy(
        self,
        instrument_name: str,
        amount: float,
        price: Optional[float] = None,
        order_type: str = "limit",
        label: str = "monteq",
    ) -> dict:
        params = {
            "instrument_name": instrument_name,
            "amount": amount,
            "type": order_type,
            "label": label,
        }
        if order_type == "limit" and price is not None:
            params["price"] = price
        return await self._call("private/buy", params)

    async def sell(
        self,
        instrument_name: str,
        amount: float,
        price: Optional[float] = None,
        order_type: str = "limit",
        label: str = "monteq",
    ) -> dict:
        params = {
            "instrument_name": instrument_name,
            "amount": amount,
            "type": order_type,
            "label": label,
        }
        if order_type == "limit" and price is not None:
            params["price"] = price
        return await self._call("private/sell", params)

    async def cancel(self, order_id: str) -> dict:
        return await self._call(
            "private/cancel", {"order_id": order_id}
        )

    async def cancel_all_by_label(self, label: str = "monteq") -> dict:
        return await self._call(
            "private/cancel_all_by_label", {"label": label}
        )

    async def get_open_orders(self, currency: str = "BTC", kind: str = "option") -> list:
        return await self._call(
            "private/get_open_orders_by_currency",
            {"currency": currency, "kind": kind},
        )

    async def get_order_state(self, order_id: str) -> dict:
        return await self._call(
            "private/get_order_state", {"order_id": order_id}
        )

    # --- Helpers ---

    async def find_best_option(
        self,
        currency: str,
        direction: str,
        target_strike: float,
    ) -> Optional[dict]:
        """Find the closest active option instrument to a target strike."""
        instruments = await self.get_instruments(currency, "option")

        matching = [
            inst for inst in instruments
            if inst.get("option_type") == direction
            and inst.get("is_active", False)
        ]

        if not matching:
            return None

        best = min(matching, key=lambda x: abs(x.get("strike", 0) - target_strike))
        return best
