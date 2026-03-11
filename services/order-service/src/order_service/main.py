"""FastAPI application for Order Service."""

import logging
import os
from contextlib import asynccontextmanager

import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI, Response

from order_service.config import settings
from order_service.metrics import generate_latest, CONTENT_TYPE_LATEST
from order_service.routers.availability import router as availability_router
from order_service.routers.orders import router as orders_router

logger = logging.getLogger(__name__)


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

    # Pub/Sub publisher -- create when emulator is configured or in non-local envs
    app.state.pubsub_publisher = None
    if settings.pubsub_emulator_host or settings.environment != "local":
        from order_service.services.pubsub_publisher import PubSubPublisher

        publisher = PubSubPublisher(settings.gcp_project_id)
        if settings.pubsub_emulator_host:
            os.environ.setdefault(
                "PUBSUB_EMULATOR_HOST", settings.pubsub_emulator_host
            )
            await publisher.ensure_topic()
        app.state.pubsub_publisher = publisher
        logger.info("Pub/Sub publisher initialized for project %s", settings.gcp_project_id)

    logger.info(
        "Order Service started (OTel auto-instrumentation: %s)",
        "enabled" if os.environ.get("OTEL_SERVICE_NAME") else "not configured",
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


@app.get("/metrics")
async def metrics():
    """Expose Prometheus metrics."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(orders_router)
app.include_router(availability_router)


@app.get("/health")
async def health_check():
    """Return service health status."""
    return {"status": "healthy", "service": "order-service", "version": "1.0.0"}


@app.get("/ready")
async def readiness_check():
    """Check service readiness by verifying database connectivity."""
    from order_service.database import engine

    try:
        from sqlalchemy import text

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "unavailable"

    ready = db_status == "connected"
    return {
        "ready": ready,
        "service": "order-service",
        "checks": {"database": db_status},
    }
