import httpx
from decimal import Decimal
from typing import Optional
from web3 import Web3
from derive_action_signing import SignedAction, TradeModuleData, utils
from app.core.config import get_settings


class DeriveClient:
    """Client for Derive (Lyra v2) options trading API."""

    def __init__(self, private_key: str, wallet_address: str, subaccount_id: int):
        settings = get_settings()
        self.base_url = settings.derive_base_url
        self.ws_url = settings.derive_ws_url
        self.constants = settings.derive_constants

        self.private_key = private_key
        self.wallet_address = wallet_address
        self.subaccount_id = subaccount_id

        self.web3_client = Web3()
        self.session_key_wallet = self.web3_client.eth.account.from_key(private_key)
        self.auth_headers: Optional[dict] = None

    def _get_auth_headers(self) -> dict:
        """Generate fresh signed REST auth headers."""
        return utils.sign_rest_auth_header(
            self.web3_client, self.wallet_address, self.private_key
        )

    async def _call_public(self, endpoint: str, params: dict = None) -> dict:
        """POST to a public Derive REST endpoint."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/public/{endpoint}",
                json=params or {},
                headers={"content-type": "application/json"},
                timeout=15,
            )
            data = resp.json()

            print(f"[DERIVE API] POST /public/{endpoint} → {resp.status_code}")

            if resp.status_code != 200:
                raise Exception(f"Derive API error ({resp.status_code}): {data}")

            if "error" in data:
                raise Exception(f"Derive error: {data['error']}")

            return data.get("result", data)

    async def _call_private(self, endpoint: str, params: dict = None) -> dict:
        """POST to a private Derive REST endpoint with signed auth headers."""
        headers = {
            "content-type": "application/json",
            **self._get_auth_headers(),
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/private/{endpoint}",
                json=params or {},
                headers=headers,
                timeout=15,
            )
            data = resp.json()

            print(f"[DERIVE API] POST /private/{endpoint} → {resp.status_code}: {data}")

            if resp.status_code != 200:
                raise Exception(f"Derive API error ({resp.status_code}): {data}")

            if "error" in data:
                raise Exception(f"Derive error: {data['error']}")

            return data.get("result", data)

    # --- Account ---

    async def get_account_summary(self) -> dict:
        """Get subaccount info (collaterals, positions, margins)."""
        return await self._call_private(
            "get_subaccount",
            {"subaccount_id": self.subaccount_id},
        )

    async def get_positions(self, currency: str = "ETH", kind: str = "option") -> list:
        """Get open positions for this subaccount."""
        result = await self._call_private(
            "get_positions",
            {"subaccount_id": self.subaccount_id, "currency": currency, "kind": kind},
        )
        if isinstance(result, dict):
            return result.get("positions", [])
        return result if isinstance(result, list) else []

    async def get_open_orders(self, currency: str = "ETH", kind: str = "option") -> list:
        """Get open orders for this subaccount."""
        result = await self._call_private(
            "get_open_orders",
            {"subaccount_id": self.subaccount_id, "currency": currency, "kind": kind},
        )
        if isinstance(result, dict):
            return result.get("orders", [])
        return result if isinstance(result, list) else []

    # --- Market Data ---

    async def get_instruments(
        self, currency: str = "ETH", kind: str = "option", expired: bool = False
    ) -> list:
        """Get available instruments."""
        return await self._call_public(
            "get_instruments",
            {"currency": currency, "instrument_type": kind, "expired": expired},
        )

    async def get_order_book(self, instrument_name: str) -> dict:
        """Get order book / ticker for an instrument."""
        return await self._call_public(
            "get_ticker",
            {"instrument_name": instrument_name},
        )

    async def get_index_price(self, currency: str = "ETH") -> dict:
        """Get current index/spot price via ticker of a near-term option."""
        instruments = await self.get_instruments(currency, "option")
        if not instruments:
            return {"index_price": 0}
        # Use first active instrument's ticker to get the index price
        active = next((i for i in instruments if i.get("is_active")), instruments[0])
        ticker = await self.get_order_book(active["instrument_name"])
        return {"index_price": ticker.get("index_price", 0)}

    # --- Order Placement (Signed Actions) ---

    def _build_signed_order(
        self,
        instrument: dict,
        price: Decimal,
        amount: Decimal,
        is_bid: bool,
    ) -> SignedAction:
        """Build and sign a trade action for an instrument."""
        action = SignedAction(
            subaccount_id=self.subaccount_id,
            owner=self.wallet_address,
            signer=self.session_key_wallet.address,
            signature_expiry_sec=utils.MAX_INT_32,
            nonce=utils.get_action_nonce(),
            module_address=self.constants["TRADE_MODULE_ADDRESS"],
            module_data=TradeModuleData(
                asset_address=instrument["base_asset_address"],
                sub_id=int(instrument["base_asset_sub_id"]),
                limit_price=price,
                amount=amount,
                max_fee=Decimal("1000"),
                recipient_id=self.subaccount_id,
                is_bid=is_bid,
            ),
            DOMAIN_SEPARATOR=self.constants["DOMAIN_SEPARATOR"],
            ACTION_TYPEHASH=self.constants["ACTION_TYPEHASH"],
        )
        action.sign(self.session_key_wallet.key)
        return action

    async def _get_instrument_details(self, instrument_name: str) -> dict:
        """Fetch full instrument details including base_asset_address and sub_id."""
        result = await self._call_public(
            "get_instrument",
            {"instrument_name": instrument_name},
        )
        return result

    async def buy(
        self,
        instrument_name: str,
        amount: float,
        price: Optional[float] = None,
        order_type: str = "limit",
        label: str = "synthpulse",
    ) -> dict:
        """Place a buy order on Derive."""
        instrument = await self._get_instrument_details(instrument_name)
        dec_price = Decimal(str(price)) if price else Decimal("0")
        dec_amount = Decimal(str(amount))

        action = self._build_signed_order(instrument, dec_price, dec_amount, is_bid=True)

        return await self._call_private(
            "order",
            {
                "instrument_name": instrument_name,
                "direction": "buy",
                "order_type": order_type,
                "mmp": False,
                "time_in_force": "gtc",
                "label": label,
                **action.to_json(),
            },
        )

    async def sell(
        self,
        instrument_name: str,
        amount: float,
        price: Optional[float] = None,
        order_type: str = "limit",
        label: str = "synthpulse",
    ) -> dict:
        """Place a sell order on Derive."""
        instrument = await self._get_instrument_details(instrument_name)
        dec_price = Decimal(str(price)) if price else Decimal("0")
        dec_amount = Decimal(str(amount))

        action = self._build_signed_order(instrument, dec_price, dec_amount, is_bid=False)

        return await self._call_private(
            "order",
            {
                "instrument_name": instrument_name,
                "direction": "sell",
                "order_type": order_type,
                "mmp": False,
                "time_in_force": "gtc",
                "label": label,
                **action.to_json(),
            },
        )

    async def cancel(self, order_id: str) -> dict:
        """Cancel a specific order."""
        return await self._call_private(
            "cancel",
            {"order_id": order_id, "subaccount_id": self.subaccount_id},
        )

    async def cancel_all(self) -> dict:
        """Cancel all open orders for this subaccount."""
        return await self._call_private(
            "cancel_all",
            {"subaccount_id": self.subaccount_id},
        )

    async def get_order_state(self, order_id: str) -> dict:
        """Get the current state of an order."""
        return await self._call_private(
            "get_order",
            {"order_id": order_id, "subaccount_id": self.subaccount_id},
        )

    # --- Helpers ---

    async def find_best_option(
        self,
        currency: str,
        direction: str,
        target_strike: float,
    ) -> Optional[dict]:
        """Find the closest active option instrument to a target strike.

        direction: "call" or "put"
        Derive uses "C"/"P" in option_details.option_type and nests strike there too.
        """
        # Map our direction convention to Derive's
        type_map = {"call": "C", "put": "P"}
        derive_type = type_map.get(direction, direction)

        instruments = await self.get_instruments(currency, "option")

        matching = [
            inst for inst in instruments
            if inst.get("is_active", False)
            and inst.get("option_details", {}).get("option_type") == derive_type
        ]

        if not matching:
            return None

        best = min(
            matching,
            key=lambda x: abs(float(x.get("option_details", {}).get("strike", 0)) - target_strike),
        )

        # Flatten strike and option_type to top level for executor compatibility
        details = best.get("option_details", {})
        best["strike"] = float(details.get("strike", 0))
        best["option_type"] = details.get("option_type", "")
        best["min_trade_amount"] = best.get("minimum_amount", 0.1)

        return best
