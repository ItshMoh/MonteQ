import hashlib
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from cryptography.fernet import Fernet
from app.core.config import get_settings


def hash_password(password: str) -> str:
    pw = hashlib.sha256(password.encode()).hexdigest().encode()
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    pw = hashlib.sha256(plain.encode()).hexdigest().encode()
    return bcrypt.checkpw(pw, hashed.encode())


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiry_minutes),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def _get_fernet() -> Fernet:
    """Derive a Fernet key from JWT_SECRET (must be url-safe base64, 32 bytes).
    We hash the secret to get a stable 32-byte key."""
    import hashlib, base64
    key = base64.urlsafe_b64encode(
        hashlib.sha256(get_settings().jwt_secret.encode()).digest()
    )
    return Fernet(key)


def encrypt_api_key(plain_key: str) -> str:
    return _get_fernet().encrypt(plain_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    return _get_fernet().decrypt(encrypted_key.encode()).decode()
