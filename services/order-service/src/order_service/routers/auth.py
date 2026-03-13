"""Auth API endpoints: Google OAuth login, token refresh, logout, user info."""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel

from order_service.auth.dependencies import get_current_user
from order_service.auth.events import log_auth_event
from order_service.auth.jwt_service import REFRESH_TOKEN_EXPIRE_DAYS, JwtService
from order_service.auth.oauth_client import exchange_google_code
from order_service.auth.rate_limiter import check_login_rate_limit
from order_service.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

REFRESH_TOKEN_MAX_AGE = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60  # 604800 seconds


class GoogleLoginRequest(BaseModel):
    """Request body for Google OAuth login."""

    code: str


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Set the refresh token as an httpOnly secure cookie."""
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=REFRESH_TOKEN_MAX_AGE,
        path="/api/v1/auth",
    )


@router.post("/google")
async def google_login(body: GoogleLoginRequest, request: Request, response: Response):
    """Exchange Google authorization code for JWT tokens."""
    client_ip = request.client.host if request.client else "unknown"

    # Rate limit check
    await check_login_rate_limit(request)

    try:
        # Exchange code for Google user info
        google_user = await exchange_google_code(body.code)
    except Exception:
        log_auth_event(
            "auth.login.failure", client_ip=client_ip, result="failure"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
        )

    user_id = f"google-oauth2|{google_user['id']}"
    email = google_user["email"]
    name = google_user.get("name", email)

    # Determine role
    admin_emails = [e.strip() for e in settings.admin_emails.split(",") if e.strip()]
    role = "admin" if email in admin_emails else "user"

    # Create tokens
    access_token = JwtService.create_access_token(user_id, email, name, role)
    refresh_token, jti = JwtService.create_refresh_token(user_id)

    # Store refresh token in Redis
    try:
        redis = request.app.state.redis
        refresh_data = json.dumps({
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await redis.setex(f"refresh:{user_id}:{jti}", REFRESH_TOKEN_MAX_AGE, refresh_data)
    except Exception:
        logger.warning("Failed to store refresh token in Redis", exc_info=True)

    log_auth_event(
        "auth.login.success", user_id=user_id, client_ip=client_ip
    )

    _set_refresh_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 900,
        "user": {"sub": user_id, "email": email, "name": name, "role": role},
    }


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """Refresh access token using refresh cookie (with token rotation)."""
    refresh_cookie = request.cookies.get("refresh_token")
    if not refresh_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token",
        )

    claims = JwtService.decode_token(refresh_cookie)
    if claims is None or claims.get("type") != "refresh":
        response.delete_cookie(key="refresh_token", path="/api/v1/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = claims["sub"]
    jti = claims["jti"]

    # Check token exists in Redis (not revoked)
    try:
        redis = request.app.state.redis
        redis_key = f"refresh:{user_id}:{jti}"
        stored = await redis.get(redis_key)
        if not stored:
            response.delete_cookie(key="refresh_token", path="/api/v1/auth")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token revoked",
            )

        stored_data = json.loads(stored)

        # Delete old refresh token (rotation)
        await redis.delete(redis_key)

        # Create new tokens
        access_token = JwtService.create_access_token(
            user_id=user_id,
            email=stored_data["email"],
            name=stored_data["name"],
            role=stored_data["role"],
        )
        new_refresh, new_jti = JwtService.create_refresh_token(user_id)

        # Store new refresh token
        refresh_data = json.dumps({
            "user_id": user_id,
            "email": stored_data["email"],
            "name": stored_data["name"],
            "role": stored_data["role"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await redis.setex(f"refresh:{user_id}:{new_jti}", REFRESH_TOKEN_MAX_AGE, refresh_data)

    except HTTPException:
        raise
    except Exception:
        response.delete_cookie(key="refresh_token", path="/api/v1/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed",
        )

    log_auth_event("auth.token.refresh", user_id=user_id)

    _set_refresh_cookie(response, new_refresh)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 900,
        "user": {
            "sub": user_id,
            "email": stored_data["email"],
            "name": stored_data["name"],
            "role": stored_data["role"],
        },
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout: revoke refresh token and clear cookie."""
    refresh_cookie = request.cookies.get("refresh_token")
    if refresh_cookie:
        claims = JwtService.decode_token(refresh_cookie)
        if claims and claims.get("type") == "refresh":
            try:
                redis = request.app.state.redis
                await redis.delete(f"refresh:{claims['sub']}:{claims['jti']}")
            except Exception:
                logger.warning("Failed to delete refresh token from Redis", exc_info=True)

            log_auth_event("auth.logout", user_id=claims["sub"])

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Get current user info from Bearer token."""
    return user
