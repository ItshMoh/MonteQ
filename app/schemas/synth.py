from pydantic import BaseModel
from typing import Optional


class SynthQueryParams(BaseModel):
    asset: str = "BTC"
    horizon: str = "1h"


class OptionPricingParams(BaseModel):
    asset: str = "BTC"
