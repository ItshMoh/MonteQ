from fastapi import FastAPI
from app.core.config import get_settings
from app.api import auth, keys, synth

settings = get_settings()

app = FastAPI(
    title="SynthPulse AI",
    description="Autonomous Probabilistic Options Trading Agent",
    version="0.1.0",
)

app.include_router(auth.router)
app.include_router(keys.router)
app.include_router(synth.router)


@app.get("/health")
async def health():
    return {"status": "ok", "deribit_env": settings.deribit_env}
