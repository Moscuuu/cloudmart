"""Redis cache-aside service for product availability."""

import json
import logging

import redis.asyncio as aioredis

from order_service.services.product_client import ProductClient

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 30


class CacheService:
    """Cache-aside pattern for product availability data.

    Flow:
    1. Check Redis for cached inventory data
    2. On hit: return cached data (no Product Service call)
    3. On miss: call Product Service, store in Redis with 30s TTL, return data
    4. On Redis error: fall back to Product Service directly
    """

    def __init__(
        self,
        redis_client: aioredis.Redis,
        product_client: ProductClient,
    ) -> None:
        self._redis = redis_client
        self._product_client = product_client

    async def get_availability(self, product_id: str) -> dict:
        """Get product availability, preferring cached data.

        Returns dict with keys: product_id, quantity, reserved_quantity, available_quantity.
        """
        key = f"inventory:{product_id}"

        # Try cache first
        try:
            cached = await self._redis.get(key)
            if cached is not None:
                return json.loads(cached)
        except (aioredis.RedisError, OSError):
            logger.warning(
                "Redis unavailable for key %s; falling back to Product Service",
                key,
                exc_info=True,
            )
            # Fall through to Product Service

        # Cache miss or Redis error -- call Product Service
        inventory = await self._product_client.check_stock(product_id)
        data = inventory.model_dump()

        # Attempt to populate cache (best-effort)
        try:
            await self._redis.setex(key, CACHE_TTL_SECONDS, json.dumps(data))
        except (aioredis.RedisError, OSError):
            logger.warning(
                "Failed to cache inventory data for %s", key, exc_info=True
            )

        return data
