from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Trade Signals ---

class TradeSignalCreate(BaseModel):
    asset: str
    direction: str  # "call" or "put"
    bias_pct: float
    crps_score: Optional[float] = None
    pop: Optional[float] = None
    strike_price: Optional[float] = None
    entry_price: Optional[float] = None


class TradeSignalResponse(BaseModel):
    id: str
    user_id: str
    asset: str
    direction: str
    bias_pct: float
    crps_score: Optional[float] = None
    pop: Optional[float] = None
    strike_price: Optional[float] = None
    entry_price: Optional[float] = None
    status: str
    created_at: datetime


# --- Trades ---

class TradeCreate(BaseModel):
    signal_id: Optional[str] = None
    asset: str
    direction: str
    strike_price: float
    entry_price: float
    budget: float


class TradeUpdate(BaseModel):
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    status: Optional[str] = None  # "open", "closed", "stopped"
    deribit_order_id: Optional[str] = None


class TradeResponse(BaseModel):
    id: str
    user_id: str
    signal_id: Optional[str] = None
    asset: str
    direction: str
    strike_price: float
    entry_price: float
    exit_price: Optional[float] = None
    budget: float
    pnl: Optional[float] = None
    status: str
    deribit_order_id: Optional[str] = None
    opened_at: datetime
    closed_at: Optional[datetime] = None


# --- User Settings ---

class UserSettingsUpdate(BaseModel):
    default_budget: Optional[float] = None
    signal_threshold: Optional[float] = None  # e.g. 0.75 = 75%
    max_open_positions: Optional[int] = None
    default_asset: Optional[str] = None
    take_profit_pct: Optional[float] = None   # e.g. 0.20 = 20%
    stop_loss_pct: Optional[float] = None     # e.g. 0.10 = 10%
    scan_interval_sec: Optional[int] = None   # seconds between auto-scans
    active_exchange: Optional[str] = None     # "deribit" or "derive"


class UserSettingsResponse(BaseModel):
    user_id: str
    default_budget: float
    signal_threshold: float
    max_open_positions: int
    default_asset: str
    take_profit_pct: float = 0.20
    stop_loss_pct: float = 0.10
    scan_interval_sec: int = 300
    bot_active: bool = False
    active_exchange: str = "deribit"
