"""FastAPI application for Order Service."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from order_service.config import settings
from order_service.logging_config import configure_logging
from order_service.metrics import CONTENT_TYPE_LATEST, generate_latest
from order_service.routers.auth import router as auth_router
from order_service.routers.availability import router as availability_router
from order_service.routers.orders import router as orders_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle: startup and shutdown resources."""
    # Configure logging first (JSON in production, text locally)
    configure_logging()

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
        try:
            from order_service.services.pubsub_publisher import PubSubPublisher

            publisher = await asyncio.wait_for(
                asyncio.to_thread(PubSubPublisher, settings.gcp_project_id),
                timeout=10.0,
            )
            if settings.pubsub_emulator_host:
                os.environ.setdefault(
                    "PUBSUB_EMULATOR_HOST", settings.pubsub_emulator_host
                )
                await publisher.ensure_topic()
            app.state.pubsub_publisher = publisher
            logger.info("Pub/Sub publisher initialized for project %s", settings.gcp_project_id)
        except Exception:
            logger.warning(
                "Pub/Sub publisher initialization failed (timeout or credentials). "
                "Order events will not be published. Fix Workload Identity to enable.",
                exc_info=True,
            )

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

# CORS middleware - origins from settings (comma-separated)
cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/metrics")
async def metrics():
    """Expose Prometheus metrics."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(auth_router)
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
