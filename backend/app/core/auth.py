from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7


def create_access_token(user_id: int) -> str:
    """Create a JWT token that expires in 7 days."""
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> int | None:
    """Decode a JWT token and return the user_id, or None if invalid."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        return None
