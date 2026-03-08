"""FastAPI application for Order Service."""

from contextlib import asynccontextmanager

import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI

from order_service.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle: startup and shutdown resources."""
    # Startup
    app.state.redis = aioredis.from_url(
        settings.redis_url, decode_responses=True
    )
    app.state.http_client = httpx.AsyncClient(
        base_url=settings.product_service_url,
        timeout=5.0,
    )

    yield

    # Shutdown
    await app.state.http_client.aclose()
    await app.state.redis.aclose()


app = FastAPI(
    title="Order Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """Return service health status."""
    return {"status": "healthy", "service": "order-service"}


# Future router mounts:
# app.include_router(orders.router, prefix="/api/v1/orders", tags=["orders"])
