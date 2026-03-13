"""Tests for Redis-cached product availability endpoint."""

import json
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
import redis.asyncio as aioredis
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from order_service.schemas.inventory import InventoryResponse
from order_service.services.cache_service import CacheService

# ---------------------------------------------------------------------------
# Unit tests for CacheService
# ---------------------------------------------------------------------------


class TestCacheService:
    """Test cache-aside logic with real Redis from testcontainer."""

    @pytest.fixture
    async def redis_client(self, redis_url):
        """Provide a real Redis client from the testcontainer."""
        client = aioredis.from_url(redis_url, decode_responses=True)
        await client.flushdb()
        yield client
        await client.aclose()

    @pytest.fixture
    def mock_product_client(self):
        """Mock ProductClient for cache miss fallback."""
        client = AsyncMock()
        client.check_stock = AsyncMock(
            return_value=InventoryResponse(
                product_id="prod-123",
                quantity=100,
                reserved_quantity=10,
                available_quantity=90,
            )
        )
        return client

    async def test_cache_miss_calls_product_service(
        self, redis_client, mock_product_client
    ):
        """On cache miss, CacheService should call Product Service and populate Redis."""
        service = CacheService(redis_client, mock_product_client)
        product_id = "prod-123"

        result = await service.get_availability(product_id)

        # Verify Product Service was called
        mock_product_client.check_stock.assert_called_once_with(product_id)

        # Verify result matches
        assert result["product_id"] == "prod-123"
        assert result["available_quantity"] == 90

        # Verify Redis was populated
        cached = await redis_client.get(f"inventory:{product_id}")
        assert cached is not None
        cached_data = json.loads(cached)
        assert cached_data["available_quantity"] == 90

    async def test_cache_hit_skips_product_service(
        self, redis_client, mock_product_client
    ):
        """On cache hit, CacheService should return from Redis without calling Product Service."""
        product_id = "prod-456"
        cached_data = {
            "product_id": product_id,
            "quantity": 50,
            "reserved_quantity": 5,
            "available_quantity": 45,
        }
        await redis_client.setex(
            f"inventory:{product_id}", 30, json.dumps(cached_data)
        )

        service = CacheService(redis_client, mock_product_client)
        result = await service.get_availability(product_id)

        # Product Service should NOT have been called
        mock_product_client.check_stock.assert_not_called()

        # Result should match cached data
        assert result["product_id"] == product_id
        assert result["available_quantity"] == 45

    async def test_cache_key_format(self, redis_client, mock_product_client):
        """Redis key format must be 'inventory:{productId}'."""
        service = CacheService(redis_client, mock_product_client)
        product_id = "prod-789"

        await service.get_availability(product_id)

        key = f"inventory:{product_id}"
        assert await redis_client.exists(key) == 1

    async def test_cache_ttl_is_30_seconds(
        self, redis_client, mock_product_client
    ):
        """Cached entry should have approximately 30 second TTL."""
        service = CacheService(redis_client, mock_product_client)
        product_id = "prod-ttl"

        await service.get_availability(product_id)

        ttl = await redis_client.ttl(f"inventory:{product_id}")
        assert 25 <= ttl <= 30  # Allow small timing variance

    async def test_redis_down_falls_back_to_product_service(
        self, mock_product_client
    ):
        """If Redis is unavailable, CacheService should fall back to Product Service."""
        # Create a broken Redis client that raises on all ops
        broken_redis = AsyncMock(spec=aioredis.Redis)
        broken_redis.get = AsyncMock(
            side_effect=aioredis.ConnectionError("Redis down")
        )
        broken_redis.setex = AsyncMock(
            side_effect=aioredis.ConnectionError("Redis down")
        )

        service = CacheService(broken_redis, mock_product_client)
        result = await service.get_availability("prod-fallback")

        # Should have called Product Service directly
        mock_product_client.check_stock.assert_called_once_with("prod-fallback")
        assert result["available_quantity"] == 90


# ---------------------------------------------------------------------------
# API integration tests for /api/v1/products/{id}/availability
# ---------------------------------------------------------------------------


class TestAvailabilityEndpoint:
    """Test the availability REST endpoint."""

    @pytest.fixture
    async def api_client(self, engine, redis_url):
        """Create API test client with real Redis and mocked Product Service."""
        from order_service.database import get_db
        from order_service.main import app

        session_factory = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async def override_get_db():
            async with session_factory() as session:
                yield session
                await session.commit()

        app.dependency_overrides[get_db] = override_get_db

        # Provide real Redis from testcontainer
        redis_client = aioredis.from_url(redis_url, decode_responses=True)
        await redis_client.flushdb()
        app.state.redis = redis_client

        # Mock http_client for Product Service
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "product_id": "test-prod",
            "quantity": 200,
            "reserved_quantity": 20,
            "available_quantity": 180,
        }
        mock_response.raise_for_status = MagicMock()
        mock_http = AsyncMock()
        mock_http.get = AsyncMock(return_value=mock_response)
        app.state.http_client = mock_http

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            yield client, mock_http, redis_client

        await redis_client.aclose()
        app.dependency_overrides.clear()

    async def test_availability_cache_miss_returns_data(self, api_client):
        """GET /api/v1/products/{id}/availability should return inventory data on cache miss."""
        client, mock_http, redis_client = api_client
        product_id = str(uuid4())

        # Update mock to return correct product_id
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "product_id": product_id,
            "quantity": 200,
            "reserved_quantity": 20,
            "available_quantity": 180,
        }
        mock_response.raise_for_status = MagicMock()
        mock_http.get = AsyncMock(return_value=mock_response)

        response = await client.get(f"/api/v1/products/{product_id}/availability")
        assert response.status_code == 200

        data = response.json()
        assert data["productId"] == product_id
        assert data["availableQuantity"] == 180

        # Verify Redis was populated
        cached = await redis_client.get(f"inventory:{product_id}")
        assert cached is not None

    async def test_availability_cache_hit_skips_http(self, api_client):
        """Cache hit should return data without calling Product Service."""
        client, mock_http, redis_client = api_client
        product_id = str(uuid4())

        # Pre-populate cache
        cached_data = {
            "product_id": product_id,
            "quantity": 50,
            "reserved_quantity": 5,
            "available_quantity": 45,
        }
        await redis_client.setex(
            f"inventory:{product_id}", 30, json.dumps(cached_data)
        )

        # Reset mock call count
        mock_http.get.reset_mock()

        response = await client.get(f"/api/v1/products/{product_id}/availability")
        assert response.status_code == 200

        data = response.json()
        assert data["availableQuantity"] == 45

        # Product Service should NOT have been called
        mock_http.get.assert_not_called()

    async def test_availability_product_service_down_returns_503(self, api_client):
        """If Product Service is down and cache is empty, return 503."""
        client, mock_http, redis_client = api_client
        product_id = str(uuid4())

        from httpx import ConnectError

        mock_http.get = AsyncMock(
            side_effect=ConnectError("Connection refused")
        )

        response = await client.get(f"/api/v1/products/{product_id}/availability")
        assert response.status_code == 503
