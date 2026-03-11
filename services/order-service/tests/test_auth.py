"""Tests for auth module: JWT service, OAuth client, dependencies, rate limiter."""

import time
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from order_service.auth.dependencies import get_current_user, get_optional_user, require_admin
from order_service.auth.jwt_service import JwtService
from order_service.auth.oauth_client import exchange_google_code
from order_service.auth.rate_limiter import check_login_rate_limit
from order_service.config import settings


# ── JWT Service Tests ──────────────────────────────────────────────────


class TestJwtService:
    """Tests for JwtService token creation and validation."""

    def test_jwt_create_and_decode(self):
        """Create access token, decode, verify all claims present."""
        token = JwtService.create_access_token(
            user_id="google-oauth2|123", email="user@test.com", name="Test User", role="user"
        )
        claims = JwtService.decode_token(token)

        assert claims is not None
        assert claims["sub"] == "google-oauth2|123"
        assert claims["email"] == "user@test.com"
        assert claims["name"] == "Test User"
        assert claims["role"] == "user"
        assert "iat" in claims
        assert "exp" in claims
        assert "jti" in claims

    def test_jwt_expired_token(self):
        """Expired token should return None from decode."""
        now = datetime.now(timezone.utc)
        payload = {
            "sub": "user1",
            "email": "a@b.com",
            "name": "A",
            "role": "user",
            "iat": now - timedelta(hours=1),
            "exp": now - timedelta(minutes=1),
            "jti": "test-jti",
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
        assert JwtService.decode_token(token) is None

    def test_jwt_invalid_token(self):
        """Garbage token string should return None from decode."""
        assert JwtService.decode_token("not.a.valid.token") is None

    def test_jwt_wrong_secret(self):
        """Token signed with wrong secret should return None."""
        payload = {
            "sub": "user1",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
        assert JwtService.decode_token(token) is None

    def test_refresh_token_create(self):
        """Refresh token returns (token, jti) with type='refresh' claim."""
        token, jti = JwtService.create_refresh_token("google-oauth2|456")

        assert isinstance(token, str)
        assert isinstance(jti, str)

        claims = JwtService.decode_token(token)
        assert claims is not None
        assert claims["sub"] == "google-oauth2|456"
        assert claims["type"] == "refresh"
        assert claims["jti"] == jti


# ── Rate Limiter Tests ─────────────────────────────────────────────────


class TestRateLimiter:
    """Tests for Redis-based login rate limiting."""

    @pytest.fixture
    def mock_request(self):
        """Create a mock FastAPI Request with Redis."""
        request = MagicMock()
        request.client.host = "127.0.0.1"
        request.app.state.redis = AsyncMock()
        return request

    @pytest.mark.asyncio
    async def test_rate_limit_allows_under_threshold(self, mock_request):
        """5 requests should all succeed."""
        mock_request.app.state.redis.incr = AsyncMock(side_effect=[1, 2, 3, 4, 5])
        mock_request.app.state.redis.expire = AsyncMock()

        for _ in range(5):
            await check_login_rate_limit(mock_request)

    @pytest.mark.asyncio
    async def test_rate_limit_blocks_over_threshold(self, mock_request):
        """6th request should raise 429."""
        mock_request.app.state.redis.incr = AsyncMock(return_value=6)
        mock_request.app.state.redis.expire = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await check_login_rate_limit(mock_request)
        assert exc_info.value.status_code == 429

    @pytest.mark.asyncio
    async def test_rate_limit_fails_open(self, mock_request):
        """Redis error should allow request through (fail-open)."""
        from redis.exceptions import RedisError

        mock_request.app.state.redis.incr = AsyncMock(side_effect=RedisError("connection lost"))

        # Should NOT raise
        await check_login_rate_limit(mock_request)


# ── Dependency Tests ───────────────────────────────────────────────────


class TestAuthDependencies:
    """Tests for FastAPI auth dependencies."""

    @pytest.mark.asyncio
    async def test_get_current_user_valid_token(self):
        """Valid Bearer token returns claims dict."""
        token = JwtService.create_access_token(
            user_id="u1", email="u@t.com", name="U", role="user"
        )
        creds = MagicMock()
        creds.credentials = token

        result = await get_current_user(credentials=creds)
        assert result["sub"] == "u1"
        assert result["email"] == "u@t.com"

    @pytest.mark.asyncio
    async def test_get_current_user_no_token(self):
        """No credentials raises 401."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials=None)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self):
        """Invalid token raises 401."""
        creds = MagicMock()
        creds.credentials = "garbage-token"

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials=creds)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_require_admin_non_admin(self):
        """Non-admin user raises 403."""
        user_claims = {"sub": "u1", "email": "u@t.com", "role": "user"}
        with pytest.raises(HTTPException) as exc_info:
            await require_admin(user=user_claims)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_require_admin_allows_admin(self):
        """Admin user passes through."""
        user_claims = {"sub": "u1", "email": "admin@t.com", "role": "admin"}
        result = await require_admin(user=user_claims)
        assert result["role"] == "admin"

    @pytest.mark.asyncio
    async def test_get_optional_user_no_token(self):
        """No token returns None (not 401)."""
        result = await get_optional_user(credentials=None)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_optional_user_invalid_token(self):
        """Invalid token raises 401 even for optional."""
        creds = MagicMock()
        creds.credentials = "garbage"

        with pytest.raises(HTTPException) as exc_info:
            await get_optional_user(credentials=creds)
        assert exc_info.value.status_code == 401


# ── OAuth Client Tests ─────────────────────────────────────────────────


class TestOAuthClient:
    """Tests for Google OAuth2 code exchange."""

    @pytest.mark.asyncio
    async def test_exchange_google_code(self):
        """Mock httpx responses, verify userinfo returned."""
        mock_token_response = MagicMock()
        mock_token_response.json.return_value = {"access_token": "goog-at-123"}
        mock_token_response.raise_for_status = MagicMock()

        mock_userinfo_response = MagicMock()
        mock_userinfo_response.json.return_value = {
            "id": "12345",
            "email": "user@gmail.com",
            "name": "Test User",
            "picture": "https://photo.url/pic.jpg",
        }
        mock_userinfo_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_token_response)
        mock_client.get = AsyncMock(return_value=mock_userinfo_response)

        with patch("order_service.auth.oauth_client.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await exchange_google_code("auth-code-xyz")

        assert result["id"] == "12345"
        assert result["email"] == "user@gmail.com"
        assert result["name"] == "Test User"
        mock_client.post.assert_called_once()
        mock_client.get.assert_called_once()
