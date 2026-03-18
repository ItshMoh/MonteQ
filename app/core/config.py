from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    synth_api_key: str = ""
    jwt_secret: str = "change-this-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 1440
    deribit_env: str = "test"  # "test" or "live"
    derive_env: str = "test"  # "test" or "live"
    frontend_url: str = "http://localhost:3000"

    @property
    def deribit_base_url(self) -> str:
        if self.deribit_env == "test":
            return "https://test.deribit.com"
        return "https://www.deribit.com"

    @property
    def derive_base_url(self) -> str:
        if self.derive_env == "test":
            return "https://api-demo.lyra.finance"
        return "https://api.lyra.finance"

    @property
    def derive_ws_url(self) -> str:
        if self.derive_env == "test":
            return "wss://api-demo.lyra.finance/ws"
        return "wss://api.lyra.finance/ws"

    @property
    def derive_constants(self) -> dict:
        """Derive protocol constants (testnet values; replace for mainnet)."""
        if self.derive_env == "test":
            return {
                "DOMAIN_SEPARATOR": "0x9bcf4dc06df5d8bf23af818d5716491b995020f377d3b7b64c29ed14e3dd1105",
                "ACTION_TYPEHASH": "0x4d7a9f27c403ff9c0f19bce61d76d82f9aa29f8d6d4b0c5474607d9770d1af17",
                "TRADE_MODULE_ADDRESS": "0x87F2863866D85E3192a35A73b388BD625D83f2be",
                "RFQ_MODULE_ADDRESS": "0x4E4DD8Be1e461913D9A5DBC4B830e67a8694ebCa",
            }
        return {
            "DOMAIN_SEPARATOR": "",
            "ACTION_TYPEHASH": "",
            "TRADE_MODULE_ADDRESS": "",
            "RFQ_MODULE_ADDRESS": "",
        }

    @property
    def synth_base_url(self) -> str:
        return "https://api.synthdata.co"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
