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

    @property
    def deribit_base_url(self) -> str:
        if self.deribit_env == "test":
            return "https://test.deribit.com"
        return "https://www.deribit.com"

    @property
    def synth_base_url(self) -> str:
        return "https://api.synthdata.co"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
