from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import auth, keys, synth, trades, signals, deribit, portfolio, ws, bot
from app.api import settings as user_settings

settings = get_settings()

app = FastAPI(
    title="SynthPulse AI",
    description="Autonomous Probabilistic Options Trading Agent",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(keys.router)
app.include_router(synth.router)
app.include_router(trades.router)
app.include_router(user_settings.router)
app.include_router(signals.router)
app.include_router(deribit.router)
app.include_router(portfolio.router)
app.include_router(ws.router)
app.include_router(bot.router)


@app.get("/health")
async def health():
    return {"status": "ok", "deribit_env": settings.deribit_env}
