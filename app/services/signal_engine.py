from typing import Optional
from app.services.synth import SynthClient


class SignalEngine:
    """Core signal generation engine.

    Consumes Synth API data and produces actionable trade signals
    with directional bias, confidence scoring, and risk filtering.
    """

    def __init__(self, synth_client: SynthClient):
        self.synth = synth_client

    async def generate_signal(
        self,
        asset: str = "BTC",
        signal_threshold: float = 0.75,
        budget: float = 10.0,
    ) -> dict:
        """Full signal generation pipeline.

        1. Fetch prediction percentiles -> directional bias
        2. Fetch volatility -> confidence (CRPS proxy)
        3. Fetch option pricing -> best strike & entry price
        4. Fetch lp-probabilities -> probability of profit
        5. Tail-risk check
        """
        # Step 1: Directional bias from prediction percentiles
        percentiles_data = await self.synth.get_prediction_percentiles(asset, "1h")
        bias = self._calculate_directional_bias(percentiles_data)

        # Step 2: Volatility-based confidence score
        volatility_data = await self.synth.get_volatility(asset, "1h")
        confidence = self._calculate_confidence(volatility_data)

        # Step 3: Tail-risk check
        tail_risk = self._detect_tail_risk(percentiles_data, volatility_data)

        # Early exit: no signal if below threshold or tail risk detected
        if abs(bias["bias_pct"]) < signal_threshold:
            return {
                "action": "HOLD",
                "reason": f"Bias {bias['bias_pct']:.1%} below threshold {signal_threshold:.1%}",
                "bias": bias,
                "confidence": confidence,
                "tail_risk": tail_risk,
            }

        if tail_risk["detected"]:
            return {
                "action": "HOLD",
                "reason": f"Tail risk detected: {tail_risk['reason']}",
                "bias": bias,
                "confidence": confidence,
                "tail_risk": tail_risk,
            }

        # Step 4: Option pricing -> find best strike
        direction = "call" if bias["direction"] == "LONG" else "put"
        option_data = await self.synth.get_option_pricing(asset)
        strike_info = self._find_best_strike(option_data, direction)

        # Step 5: Probability of profit from lp-probabilities
        pop = await self._calculate_pop(asset, strike_info, direction)

        return {
            "action": f"BUY_{direction.upper()}",
            "asset": asset,
            "direction": direction,
            "bias": bias,
            "confidence": confidence,
            "tail_risk": tail_risk,
            "strike": strike_info,
            "pop": pop,
            "budget": budget,
        }

    def _calculate_directional_bias(self, data: dict) -> dict:
        """Analyze prediction percentiles to determine Long vs Short bias.

        Looks at multiple timesteps across the 1h forecast to count
        how many favor upward vs downward movement.
        """
        current_price = data["current_price"]
        percentiles = data["forecast_future"]["percentiles"]

        total_steps = len(percentiles)
        if total_steps == 0:
            return {"direction": "NEUTRAL", "bias_pct": 0.0, "details": {}}

        # Count timesteps where median is above/below current price
        bullish_steps = 0
        bearish_steps = 0
        # Track how many percentile levels favor each direction at the final step
        final_step = percentiles[-1]

        for step in percentiles[1:]:  # skip first (current price)
            median = step.get("0.5", current_price)
            if median > current_price:
                bullish_steps += 1
            elif median < current_price:
                bearish_steps += 1

        # Directional strength from the final timestep
        levels_above = 0
        levels_below = 0
        percentile_keys = ["0.005", "0.05", "0.2", "0.35", "0.5", "0.65", "0.8", "0.95", "0.995"]
        for key in percentile_keys:
            price_at_pct = final_step.get(key, current_price)
            if price_at_pct > current_price:
                levels_above += 1
            elif price_at_pct < current_price:
                levels_below += 1

        # Combined bias: weight timestep trend (60%) + final distribution spread (40%)
        step_count = max(total_steps - 1, 1)
        timestep_bias = (bullish_steps - bearish_steps) / step_count
        distribution_bias = (levels_above - levels_below) / len(percentile_keys)
        combined_bias = 0.6 * timestep_bias + 0.4 * distribution_bias

        if combined_bias > 0:
            direction = "LONG"
        elif combined_bias < 0:
            direction = "SHORT"
        else:
            direction = "NEUTRAL"

        # Expected move from median
        median_price = final_step.get("0.5", current_price)
        expected_move_pct = (median_price - current_price) / current_price

        return {
            "direction": direction,
            "bias_pct": abs(combined_bias),
            "raw_bias": combined_bias,
            "bullish_steps": bullish_steps,
            "bearish_steps": bearish_steps,
            "levels_above": levels_above,
            "levels_below": levels_below,
            "expected_move_pct": expected_move_pct,
            "current_price": current_price,
            "median_target": median_price,
        }

    def _calculate_confidence(self, vol_data: dict) -> dict:
        """Use volatility data as a CRPS proxy for confidence scoring.

        Low forecast volatility relative to realized = sharp/confident predictions.
        High forecast volatility relative to realized = noisy/uncertain.
        """
        forecast_vol = vol_data.get("forecast_future", {}).get("average_volatility", 0)
        realized_vol = vol_data.get("realized", {}).get("average_volatility", 0)

        if realized_vol == 0:
            vol_ratio = 1.0
        else:
            vol_ratio = forecast_vol / realized_vol

        # Confidence is inverse of vol_ratio: lower forecast vs realized = higher confidence
        # Clamp between 0 and 1
        confidence_score = max(0.0, min(1.0, 2.0 - vol_ratio))

        if confidence_score > 0.7:
            label = "HIGH"
        elif confidence_score > 0.4:
            label = "MEDIUM"
        else:
            label = "LOW"

        return {
            "score": round(confidence_score, 4),
            "label": label,
            "forecast_volatility": forecast_vol,
            "realized_volatility": realized_vol,
            "vol_ratio": round(vol_ratio, 4),
        }

    def _detect_tail_risk(self, percentiles_data: dict, vol_data: dict) -> dict:
        """Detect potential Black Swan / fat-tail events.

        Triggers if:
        1. The spread between 0.5% and 99.5% percentiles is abnormally wide
        2. Forecast volatility spikes far above realized
        """
        current_price = percentiles_data["current_price"]
        final_step = percentiles_data["forecast_future"]["percentiles"][-1]

        # Tail width: distance between extreme percentiles
        low_tail = final_step.get("0.005", current_price)
        high_tail = final_step.get("0.995", current_price)
        tail_spread_pct = (high_tail - low_tail) / current_price

        # Volatility spike check
        forecast_vol = vol_data.get("forecast_future", {}).get("average_volatility", 0)
        realized_vol = vol_data.get("realized", {}).get("average_volatility", 0)
        vol_spike = forecast_vol > (realized_vol * 2.0) if realized_vol > 0 else False

        # Tail risk if spread > 5% in 1h or vol spike
        detected = tail_spread_pct > 0.05 or vol_spike

        reason = ""
        if tail_spread_pct > 0.05:
            reason = f"Extreme tail spread: {tail_spread_pct:.2%} in 1h"
        if vol_spike:
            spike_reason = f"Volatility spike: forecast {forecast_vol:.1f} vs realized {realized_vol:.1f}"
            reason = f"{reason}; {spike_reason}" if reason else spike_reason

        return {
            "detected": detected,
            "reason": reason,
            "tail_spread_pct": round(tail_spread_pct, 4),
            "vol_spike": vol_spike,
        }

    def _find_best_strike(self, option_data: dict, direction: str) -> dict:
        """Find the optimal strike price from Synth option pricing.

        For calls: find the ATM or slightly OTM strike with best risk/reward.
        For puts: same logic, inverted.
        """
        current_price = option_data.get("current_price", 0)
        expiry = option_data.get("expiry_time", "")

        if direction == "call":
            options = option_data.get("call_options", {})
        else:
            options = option_data.get("put_options", {})

        if not options:
            return {
                "strike_price": None,
                "premium": None,
                "expiry": expiry,
                "type": "ATM",
            }

        strikes = sorted([(float(k), v) for k, v in options.items()], key=lambda x: x[0])

        # Find ATM: closest strike to current price
        atm_strike, atm_premium = min(strikes, key=lambda x: abs(x[0] - current_price))

        # Find near-the-money OTM with reasonable premium
        # For calls: strike slightly above current price
        # For puts: strike slightly below current price
        best_strike = atm_strike
        best_premium = atm_premium

        for strike, premium in strikes:
            if premium <= 0:
                continue
            if direction == "call" and strike >= current_price and strike <= current_price * 1.03:
                # Near-the-money call, cheaper premium
                if premium < best_premium:
                    best_strike = strike
                    best_premium = premium
            elif direction == "put" and strike <= current_price and strike >= current_price * 0.97:
                if premium < best_premium:
                    best_strike = strike
                    best_premium = premium

        return {
            "strike_price": best_strike,
            "premium": best_premium,
            "atm_strike": atm_strike,
            "atm_premium": atm_premium,
            "current_price": current_price,
            "expiry": expiry,
        }

    async def _calculate_pop(
        self, asset: str, strike_info: dict, direction: str
    ) -> dict:
        """Calculate Probability of Profit using lp-probabilities.

        For a call at strike X: PoP = P(price > strike + premium)
        For a put at strike X: PoP = P(price < strike - premium)
        """
        if not strike_info.get("strike_price"):
            return {"pop_pct": 0.0, "breakeven": None}

        strike = strike_info["strike_price"]
        premium = strike_info.get("premium", 0) or 0

        if direction == "call":
            breakeven = strike + premium
        else:
            breakeven = strike - premium

        try:
            prob_data = await self.synth.get_lp_probabilities(asset)
            price_levels = prob_data.get("data", {}).get("24h", {})

            if direction == "call":
                # Find closest price level and get probability_above
                prob_above = price_levels.get("probability_above", {})
                pop = self._interpolate_probability(prob_above, breakeven)
            else:
                prob_below = price_levels.get("probability_below", {})
                pop = self._interpolate_probability(prob_below, breakeven)
        except Exception:
            pop = 0.0

        return {
            "pop_pct": round(pop, 4),
            "breakeven": breakeven,
            "premium": premium,
        }

    def _interpolate_probability(self, prob_dict: dict, target_price: float) -> float:
        """Find the probability at a target price by interpolating between known levels."""
        if not prob_dict:
            return 0.0

        levels = sorted([(float(k), v) for k, v in prob_dict.items()], key=lambda x: x[0])

        # Exact match
        for price, prob in levels:
            if abs(price - target_price) < 1:
                return prob

        # Interpolate between two closest levels
        for i in range(len(levels) - 1):
            low_price, low_prob = levels[i]
            high_price, high_prob = levels[i + 1]

            if low_price <= target_price <= high_price:
                ratio = (target_price - low_price) / (high_price - low_price)
                return low_prob + ratio * (high_prob - low_prob)

        # Out of range: return boundary value
        if target_price < levels[0][0]:
            return levels[0][1]
        return levels[-1][1]
