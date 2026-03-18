from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


class DeribitKeyRequest(BaseModel):
    client_id: str
    client_secret: str


class DeriveKeyRequest(BaseModel):
    private_key: str
    wallet_address: str
    subaccount_id: int
