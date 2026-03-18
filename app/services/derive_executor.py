import asyncio
from typing import Optional
from app.services.derive import DeriveClient
from app.services.synth import SynthClient
from app.services.signal_engine import SignalEngine
from app.core.database import get_supabase
from app.services.ws_manager import ws_manager


class DeriveTradeExecutor:
    """Executes trades on Derive based on signals from the Signal Engine."""

    def __init__(self, derive: DeriveClient, synth: SynthClient, user_id: str):
        self.derive = derive
        self.synth = synth
        self.engine = SignalEngine(synth)
        self.user_id = user_id
        self.db = get_supabase()

    def _get_open_trade_count(self) -> int:
        result = (
            self.db.table("trades")
            .select("id", count="exact")
            .eq("user_id", self.user_id)
            .eq("status", "open")
            .execute()
        )
        return result.count if result.count is not None else len(result.data or [])

    def _get_max_open_positions(self) -> int:
        result = (
            self.db.table("user_settings")
            .select("max_open_positions")
            .eq("user_id", self.user_id)
            .execute()
        )
        if result.data:
            return result.data[0].get("max_open_positions", 3)
        return 3

    def _log_event(self, trade_id: Optional[str], event_type: str, detail: dict):
        self.db.table("trade_events").insert({
            "user_id": self.user_id,
            "trade_id": trade_id,
            "event_type": event_type,
            "detail": detail,
        }).execute()

    async def execute_signal(self, signal: dict, budget: float) -> dict:
        """Take a generated signal and execute it on Derive.

        1. Check max open positions limit
        2. Find the matching option instrument on Derive
        3. Get the order book for fair value pricing
        4. Place a limit buy order
        5. Save trade to DB with exchange='derive'
        """
        if signal["action"] == "HOLD":
            return {"status": "skipped", "reason": signal["reason"]}

        open_count = self._get_open_trade_count()
        max_positions = self._get_max_open_positions()
        if open_count >= max_positions:
            self._log_event(None, "position_limit_hit", {
                "open": open_count, "max": max_positions,
            })
            return {
                "status": "rejected",
                "reason": f"Max open positions reached ({open_count}/{max_positions})",
            }

        asset = signal["asset"]
        direction = signal["direction"]  # "call" or "put"
        strike_price = signal["strike"]["strike_price"]
        currency = asset

        # Step 1: Find the best matching instrument on Derive
        instrument = await self.derive.find_best_option(
            currency=currency,
            direction=direction,
            target_strike=strike_price,
        )

        if not instrument:
            return {"status": "error", "reason": f"No {direction} option found near strike {strike_price}"}

        instrument_name = instrument["instrument_name"]

        # Step 2: Get order book for fair value
        order_book = await self.derive.get_order_book(instrument_name)
        best_ask = order_book.get("best_ask_price", 0)
        best_bid = order_book.get("best_bid_price", 0)
        mark_price = order_book.get("mark_price", 0)

        # Convert to float in case they come as strings
        best_ask = float(best_ask) if best_ask else 0
        best_bid = float(best_bid) if best_bid else 0
        mark_price = float(mark_price) if mark_price else 0

        if not best_ask or best_ask <= 0:
            limit_price = mark_price if mark_price > 0 else None
        else:
            mid = (best_bid + best_ask) / 2 if best_bid else best_ask
            limit_price = round(mid, 4)

        if not limit_price:
            return {"status": "error", "reason": "Cannot determine limit price — no market data"}

        # Step 3: Calculate amount
        min_amount = float(instrument.get("min_trade_amount", instrument.get("minimum_amount", 0.1)))
        amount = max(min_amount, min_amount)

        # Step 4: Place the order
        try:
            order_result = await self.derive.buy(
                instrument_name=instrument_name,
                amount=amount,
                price=limit_price,
                order_type="limit",
                label="synthpulse",
            )
        except Exception as e:
            import traceback
            err_detail = f"Order placement failed: {type(e).__name__}: {e}"
            print(f"[DERIVE EXECUTOR] {err_detail}")
            traceback.print_exc()
            return {"status": "error", "reason": err_detail}

        order = order_result.get("order", {})
        order_id = order.get("order_id", "")

        # Step 5: Save trade to DB
        trade_data = {
            "user_id": self.user_id,
            "signal_id": None,
            "asset": asset,
            "direction": direction,
            "strike_price": instrument.get("strike", strike_price),
            "entry_price": limit_price,
            "budget": budget,
            "status": "open",
            "exchange": "derive",
            "derive_order_id": order_id,
        }

        trade_result = self.db.table("trades").insert(trade_data).execute()
        trade_id = trade_result.data[0]["id"] if trade_result.data else None

        result = {
            "status": "executed",
            "trade_id": trade_id,
            "instrument": instrument_name,
            "direction": direction,
            "strike": instrument.get("strike"),
            "amount": amount,
            "limit_price": limit_price,
            "order_id": order_id,
            "order_state": order.get("order_state", ""),
            "mark_price": mark_price,
            "best_bid": best_bid,
            "best_ask": best_ask,
        }

        self._log_event(trade_id, "trade_opened", result)
        await ws_manager.send_to_user(self.user_id, "trade_opened", result)

        return result

    async def close_position(self, trade_id: str) -> dict:
        """Close an open trade by selling the position."""
        result = self.db.table("trades").select("*").eq("id", trade_id).execute()
        if not result.data:
            return {"status": "error", "reason": "Trade not found"}

        trade = result.data[0]
        if trade["status"] != "open":
            return {"status": "error", "reason": f"Trade is already {trade['status']}"}

        # Cancel any open orders for this trade
        if trade.get("derive_order_id"):
            try:
                order_state = await self.derive.get_order_state(trade["derive_order_id"])
                if order_state.get("order_state") == "open":
                    await self.derive.cancel(trade["derive_order_id"])
            except Exception:
                pass

        # Get current positions and close if filled
        positions = await self.derive.get_positions(trade["asset"], "option")
        closed_price = None

        for pos in positions:
            if pos.get("direction") == "buy" and float(pos.get("amount", pos.get("size", 0))) > 0:
                instrument_name = pos["instrument_name"]
                size = float(pos.get("amount", pos.get("size", 0)))

                order_book = await self.derive.get_order_book(instrument_name)
                best_bid = float(order_book.get("best_bid_price", 0))
                mark_price = float(order_book.get("mark_price", 0))
                sell_price = best_bid if best_bid > 0 else mark_price

                if sell_price > 0:
                    await self.derive.sell(
                        instrument_name=instrument_name,
                        amount=size,
                        price=sell_price,
                        order_type="limit",
                        label="synthpulse_close",
                    )
                    closed_price = sell_price

        pnl = None
        if closed_price and trade.get("entry_price"):
            pnl = closed_price - trade["entry_price"]

        self.db.table("trades").update({
            "status": "closed",
            "exit_price": closed_price,
            "pnl": pnl,
            "closed_at": "now()",
        }).eq("id", trade_id).execute()

        result = {
            "status": "closed",
            "trade_id": trade_id,
            "exit_price": closed_price,
            "pnl": pnl,
        }

        self._log_event(trade_id, "trade_closed", result)
        await ws_manager.send_to_user(self.user_id, "trade_closed", result)

        return result

    def _get_user_settings(self) -> dict:
        result = (
            self.db.table("user_settings")
            .select("*")
            .eq("user_id", self.user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return {
            "signal_threshold": 0.75,
            "default_budget": 10.0,
            "max_open_positions": 3,
            "default_asset": "ETH",
            "take_profit_pct": 0.20,
            "stop_loss_pct": 0.10,
            "scan_interval_sec": 300,
        }

    async def monitor_trade(
        self,
        trade_id: str,
        pop_exit_threshold: float = 0.5,
        check_interval: int = 60,
        take_profit_pct: float = 0.20,
        stop_loss_pct: float = 0.10,
    ) -> dict:
        """Actively monitor a trade — exit on PoP drop, take-profit, or stop-loss."""
        result = self.db.table("trades").select("*").eq("id", trade_id).execute()
        if not result.data:
            return {"status": "error", "reason": "Trade not found"}

        trade = result.data[0]
        if trade["status"] != "open":
            return {"status": "already_closed", "trade": trade}

        asset = trade["asset"]
        direction = trade["direction"]
        entry = trade["entry_price"]

        current_price = None
        pnl_pct = None

        while True:
            try:
                if trade.get("derive_order_id"):
                    order_state = await self.derive.get_order_state(trade["derive_order_id"])
                    state = order_state.get("order_state", "")

                    if state == "cancelled" or state == "rejected":
                        self.db.table("trades").update({"status": "stopped"}).eq("id", trade_id).execute()
                        stop_result = {"status": "stopped", "reason": f"Order {state}", "trade_id": trade_id}
                        self._log_event(trade_id, "trade_stopped", stop_result)
                        await ws_manager.send_to_user(self.user_id, "trade_stopped", stop_result)
                        return stop_result

                    if state == "filled" and order_state.get("instrument_name"):
                        order_book = await self.derive.get_order_book(order_state["instrument_name"])
                        current_price = float(order_book.get("mark_price", 0))

                        if current_price > 0 and entry > 0:
                            pnl_pct = (current_price - entry) / entry

                            if pnl_pct >= take_profit_pct:
                                reason = f"Take-profit hit: {pnl_pct:.1%} (target {take_profit_pct:.1%})"
                                self._log_event(trade_id, "take_profit", {
                                    "pnl_pct": pnl_pct, "current_price": current_price,
                                })
                                break

                            if pnl_pct <= -stop_loss_pct:
                                reason = f"Stop-loss hit: {pnl_pct:.1%} (limit -{stop_loss_pct:.1%})"
                                self._log_event(trade_id, "stop_loss", {
                                    "pnl_pct": pnl_pct, "current_price": current_price,
                                })
                                break

                percentiles = await self.synth.get_prediction_percentiles(asset, "1h")
                bias = self.engine._calculate_directional_bias(percentiles)

                if direction == "call" and bias["direction"] == "SHORT":
                    reason = "Direction flipped to SHORT"
                    break
                elif direction == "put" and bias["direction"] == "LONG":
                    reason = "Direction flipped to LONG"
                    break

                if bias["bias_pct"] < pop_exit_threshold:
                    reason = f"PoP dropped to {bias['bias_pct']:.1%} (below {pop_exit_threshold:.1%})"
                    break

                await ws_manager.send_to_user(self.user_id, "monitor_check", {
                    "trade_id": trade_id,
                    "bias_pct": bias.get("bias_pct"),
                    "direction": bias.get("direction"),
                    "current_price": current_price,
                    "pnl_pct": pnl_pct,
                })

            except Exception as e:
                self._log_event(trade_id, "monitor_error", {"error": str(e)})

            await asyncio.sleep(check_interval)

        self._log_event(trade_id, "auto_exit", {"reason": reason})
        await ws_manager.send_to_user(self.user_id, "auto_exit", {
            "trade_id": trade_id, "reason": reason,
        })
        close_result = await self.close_position(trade_id)
        close_result["exit_reason"] = reason
        return close_result

    async def auto_scan_loop(self, stop_event: asyncio.Event) -> None:
        """Autonomous bot loop: scan → enter → monitor → repeat."""
        self._log_event(None, "bot_started", {})
        await ws_manager.send_to_user(self.user_id, "bot_started", {})

        while not stop_event.is_set():
            try:
                settings = self._get_user_settings()
                asset = settings.get("default_asset", "ETH")
                budget = settings.get("default_budget", 10.0)
                threshold = settings.get("signal_threshold", 0.75)
                scan_interval = settings.get("scan_interval_sec", 300)
                take_profit = settings.get("take_profit_pct", 0.20)
                stop_loss = settings.get("stop_loss_pct", 0.10)

                if not settings.get("bot_active", False):
                    self._log_event(None, "bot_stopped", {"reason": "bot_active set to false"})
                    await ws_manager.send_to_user(self.user_id, "bot_stopped", {
                        "reason": "bot_active set to false",
                    })
                    break

                signal = await self.engine.generate_signal(
                    asset=asset,
                    signal_threshold=threshold,
                    budget=budget,
                )

                await ws_manager.send_to_user(self.user_id, "bot_scan", {
                    "action": signal["action"],
                    "bias_pct": signal.get("bias", {}).get("bias_pct"),
                    "direction": signal.get("bias", {}).get("direction"),
                })

                if signal["action"] != "HOLD":
                    result = await self.execute_signal(signal, budget)

                    if result["status"] == "executed" and result.get("trade_id"):
                        asyncio.create_task(
                            self.monitor_trade(
                                trade_id=result["trade_id"],
                                take_profit_pct=take_profit,
                                stop_loss_pct=stop_loss,
                            )
                        )
                    else:
                        await ws_manager.send_to_user(self.user_id, "bot_error", {
                            "error": f"Trade not executed: {result.get('status')} — {result.get('reason', 'unknown')}",
                        })

            except Exception as e:
                self._log_event(None, "bot_error", {"error": str(e)})
                await ws_manager.send_to_user(self.user_id, "bot_error", {
                    "error": str(e),
                })

            for _ in range(scan_interval):
                if stop_event.is_set():
                    break
                await asyncio.sleep(1)

        self._log_event(None, "bot_stopped", {"reason": "stop requested"})
        await ws_manager.send_to_user(self.user_id, "bot_stopped", {
            "reason": "stop requested",
        })
