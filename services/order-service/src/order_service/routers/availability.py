"""Product availability endpoint with Redis caching."""

import logging

from fastapi import APIRouter, HTTPException, Request
from httpx import HTTPError

from order_service.metrics import PRODUCTS_VIEWED
from order_service.schemas.inventory import InventoryResponse
from order_service.services.cache_service import CacheService
from order_service.services.product_client import ProductClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/products", tags=["availability"])


@router.get("/{product_id}/availability", response_model=InventoryResponse)
async def get_product_availability(product_id: str, request: Request):
    """Get product availability from Redis cache or Product Service.

    Uses cache-aside pattern with 30s TTL.
    Returns 503 if both Redis and Product Service are unavailable.
    """
    redis_client = request.app.state.redis
    http_client = request.app.state.http_client
    product_client = ProductClient(http_client)
    cache_service = CacheService(redis_client, product_client)

    PRODUCTS_VIEWED.inc()

    try:
        data = await cache_service.get_availability(product_id)
    except (HTTPError, OSError) as exc:
        logger.error(
            "Product Service unavailable for product %s: %s",
            product_id,
            exc,
        )
        raise HTTPException(
            status_code=503,
            detail="Product availability data temporarily unavailable",
        )

    return InventoryResponse.model_validate(data)
