from pydantic import BaseModel


class PricePathRequest(BaseModel):
    asset: str = "BTC"
    horizon: str = "1h"


class OptionPricingRequest(BaseModel):
    asset: str = "BTC"
