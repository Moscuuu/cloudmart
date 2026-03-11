"""Redis-based IP rate limiting for login endpoints."""

import logging

from fastapi import HTTPException, Request, status
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW = 60  # seconds


async def check_login_rate_limit(request: Request) -> None:
    """Check login rate limit for the client IP.

    Uses Redis INCR + EXPIRE for a sliding window counter.
    Fails open if Redis is unavailable (logs warning, allows request).

    Raises:
        HTTPException(429): If rate limit exceeded.
    """
    client_ip = request.client.host if request.client else "unknown"
    redis_key = f"ratelimit:login:{client_ip}"

    try:
        redis = request.app.state.redis
        current = await redis.incr(redis_key)
        if current == 1:
            await redis.expire(redis_key, LOGIN_RATE_WINDOW)

        if current > LOGIN_RATE_LIMIT:
            logger.warning(
                "Login rate limit exceeded",
                extra={
                    "event_type": "auth.rate_limit.exceeded",
                    "client_ip": client_ip,
                    "count": current,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
            )
    except RedisError:
        logger.warning(
            "Redis unavailable for rate limiting, allowing request",
            extra={
                "event_type": "auth.rate_limit.redis_error",
                "client_ip": client_ip,
            },
        )
