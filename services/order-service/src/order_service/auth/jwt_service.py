"""JWT token creation and validation service."""

import logging
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from order_service.config import settings

logger = logging.getLogger(__name__)

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


class JwtService:
    """Handles JWT access and refresh token operations."""

    @staticmethod
    def create_access_token(
        user_id: str, email: str, name: str, role: str = "user"
    ) -> str:
        """Create a signed HS256 access token with standard claims."""
        now = datetime.now(timezone.utc)
        payload = {
            "sub": user_id,
            "email": email,
            "name": name,
            "role": role,
            "iat": now,
            "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

    @staticmethod
    def create_refresh_token(user_id: str) -> tuple[str, str]:
        """Create a refresh token. Returns (token_string, jti)."""
        now = datetime.now(timezone.utc)
        jti = str(uuid.uuid4())
        payload = {
            "sub": user_id,
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            "jti": jti,
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
        return token, jti

    @staticmethod
    def decode_token(token: str) -> dict | None:
        """Decode and validate a JWT token. Returns claims dict or None."""
        try:
            return jwt.decode(
                token, settings.jwt_secret, algorithms=["HS256"]
            )
        except jwt.InvalidTokenError:
            return None
