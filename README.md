# MonteQ AI

**Autonomous Probabilistic Options Trading Agent**

MonteQ AI is a non-custodial, autonomous trading agent built for high-frequency, short-term options trading on Deribit. It uses probabilistic price-path simulations from the Synth (SN50) Bittensor subnet to generate directional signals, execute trades, and manage risk — all without manual intervention.

The agent is optimized for a 1-hour trading horizon, analyzing 1,000+ AI-simulated price paths every minute to detect micro-volatility patterns and tail-risk events that traditional models miss.

---

## How It Works

1. **User connects** their Deribit API key (trade-only permissions) and sets a budget per trade.
2. **Agent fetches** the latest 1-hour volatility distribution from Synth (SN50).
3. **Signal engine** calculates directional bias — if 75%+ of simulated paths trend in one direction, a Buy Call or Buy Put signal is generated.
4. **Execution** — the agent finds the optimal strike price on Deribit and places a limit order at fair value derived from the probability distribution.
5. **Active monitoring** — the agent re-checks Synth every minute, exiting early if probability of profit drops below threshold, or if take-profit / stop-loss targets are hit.

In autonomous mode, the bot repeats this cycle continuously: scan, enter, monitor, exit, repeat.

---

## Features

### Signal Engine
- **Directional Bias Calculation** — Long vs Short bias from 1,000+ simulated price paths
- **CRPS Confidence Filter** — Uses Continuous Ranked Probability Score to gauge miner consensus. Sharp CRPS = high conviction, noisy CRPS = agent de-risks.
- **Probability of Profit (PoP)** — Calculated per signal using Synth's LP probability bounds
- **Tail-Risk Detection** — Blocks trades during black swan conditions (extreme volatility spikes, abnormal tail spreads)
- **Configurable Thresholds** — Users set the minimum bias percentage required to trigger a trade

### Trade Execution (Deribit)
- **Limit Order Optimization** — Places orders at fair value from Synth's distribution to avoid slippage
- **Dynamic Stop-Loss / Take-Profit** — Exit points adjust in real-time based on shifting distributions
- **$10 Scalping Mode** — Optimized for small-stake, high-frequency near-the-money options
- **Options Chain Analysis** — Automatically finds the best strike price for each signal
- **Position Management** — Tracks open positions, handles fills and cancellations

### Autonomous Bot
- **Auto-Scan Loop** — Polls Synth at configurable intervals, enters trades when signals cross threshold
- **Full Autonomous Cycle** — Scan, enter, monitor, exit, repeat — no manual intervention required
- **Start/Stop Control** — Simple API endpoints to activate or deactivate the bot
- **Configurable Parameters** — Scan interval, take-profit %, stop-loss %, budget, max positions

### Risk Management
- **Budget Limits** — Configurable budget per trade and maximum concurrent positions
- **Portfolio-Level Metrics** — Open positions, deployed capital, unrealized P&L, max drawdown, per-asset exposure
- **Trade Event Audit Trail** — Every action logged with timestamps for full traceability

### Real-Time Updates
- **WebSocket** — Live push notifications for trade opens, closes, stops, signal generation, monitor checks, bot status, and portfolio updates

---

## Architecture

| Component | Technology | Role |
|-----------|-----------|------|
| Brain | Synth (SN50) API | Monte Carlo price simulations, volatility data, liquidation probabilities |
| Execution | Deribit API | Authentication, order placement, position monitoring, account info |
| Backend | Python / FastAPI | Signal engine, trade executor, autonomous bot loop, WebSocket server |
| Database | Supabase (PostgreSQL) | Users, encrypted API keys, trade signals, trade history, settings, audit logs |
| Frontend | React / Next.js | Dashboard for trading, portfolio monitoring, bot control, trade history |
| Network | Mode Network | On-chain trade intent logging and verification (planned) |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register a new user |
| POST | `/auth/login` | Login and receive JWT token |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/keys/deribit` | Store encrypted Deribit API keys |
| GET | `/keys/deribit/status` | Check if keys are configured |

### Synth Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/synth/prediction-percentiles` | Price percentiles at 5-min intervals |
| GET | `/synth/option-pricing` | Synthetic call/put prices across strikes |
| GET | `/synth/volatility` | Forecasted vs realized volatility |
| GET | `/synth/liquidation` | Liquidation probability at various price levels |
| GET | `/synth/lp-probabilities` | Probability of price above/below given levels |

### Signals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signals/generate` | Generate a trade signal for a given asset |

### Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trades/signals` | List trade signals (filterable by status) |
| GET | `/trades/` | List all trades (filterable by status) |
| GET | `/trades/{trade_id}` | Get single trade details |
| GET | `/trades/{trade_id}/events` | Get audit trail for a trade |
| GET | `/trades/events/all` | Get all trade events |
| PATCH | `/trades/{trade_id}` | Update trade fields |

### Deribit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/deribit/account` | Account summary (balance, margin, equity) |
| GET | `/deribit/positions` | All open option positions |
| GET | `/deribit/orders` | All open orders |
| GET | `/deribit/instruments` | Available options instruments |
| GET | `/deribit/orderbook/{instrument}` | Order book for an instrument |
| POST | `/deribit/execute` | Generate signal and execute trade |
| POST | `/deribit/close/{trade_id}` | Close an open trade |
| POST | `/deribit/monitor/{trade_id}` | Start background monitoring for a trade |
| DELETE | `/deribit/orders` | Cancel all MonteQ-labeled orders |

### Autonomous Bot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bot/start` | Start the autonomous trading bot |
| POST | `/bot/stop` | Stop the bot (open trades continue monitored) |
| GET | `/bot/status` | Check bot running status and config |

### Portfolio
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portfolio/risk` | Portfolio-level risk metrics |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/` | Fetch user settings |
| PATCH | `/settings/` | Update user settings |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws /ws?token=<JWT>` | Real-time event stream |

WebSocket event types: `trade_opened`, `trade_closed`, `trade_stopped`, `signal_generated`, `monitor_check`, `portfolio_update`, `bot_scan`, `bot_started`, `bot_stopped`, `bot_error`

---

## Database Schema

- **users** — email, password hash
- **deribit_keys** — encrypted API key and secret per user
- **trade_signals** — generated signals with asset, direction, bias, CRPS, PoP, strike, status
- **trades** — executed trades with entry/exit prices, P&L, Deribit order ID, status
- **trade_events** — audit log of all trade lifecycle events
- **user_settings** — default budget, signal threshold, max positions, TP/SL percentages, scan interval, bot active flag

---

## Supported Assets

BTC, ETH, SOL, XAU, SPY, NVDA, GOOGL, TSLA, AAPL

All asset data is sourced from the Synth (SN50) Bittensor subnet.

---

## Setup

### Prerequisites

- Python 3.11+
- Supabase project (for database)
- Deribit account with API keys (testnet recommended for initial use)

### Installation

```bash
git clone <repo-url>
cd MonteQ
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the project root:

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-anon-key>
JWT_SECRET=<your-jwt-secret>
ENCRYPTION_KEY=<your-fernet-encryption-key>
DERIBIT_ENV=test
```

### Database Setup

Run the schema in your Supabase SQL editor:

```bash
# Copy contents of supabase_schema.sql into Supabase SQL Editor and execute
```

### Run

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---


---

## License

MIT
