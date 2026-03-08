"""Shared test fixtures with testcontainers."""

import os
from collections.abc import AsyncGenerator

# Ensure testcontainers uses the default Docker socket (named pipe on Windows)
# rather than a stale tcp://localhost:2375 from .testcontainers.properties
os.environ.pop("DOCKER_HOST", None)

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer

from order_service.models.base import Base

# Module-level container and URL so all tests share one PostgreSQL instance
_pg_container: PostgresContainer | None = None
_db_url: str | None = None


def _get_db_url() -> str:
    """Get or start the shared PostgreSQL testcontainer."""
    global _pg_container, _db_url
    if _db_url is None:
        _pg_container = PostgresContainer("postgres:15-alpine")
        _pg_container.start()
        url = _pg_container.get_connection_url()
        _db_url = url.replace("psycopg2", "asyncpg")
    return _db_url


def pytest_sessionfinish(session, exitstatus):
    """Stop containers at session end."""
    global _pg_container
    if _pg_container is not None:
        _pg_container.stop()
        _pg_container = None


@pytest.fixture
async def engine():
    """Create async engine and initialize tables - fresh per test function."""
    url = _get_db_url()
    eng = create_async_engine(url, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def async_db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional async session for each test."""
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def async_client(engine) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP client for FastAPI testing."""
    from unittest.mock import AsyncMock

    import httpx

    from order_service.database import get_db
    from order_service.main import app

    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session
            await session.commit()

    app.dependency_overrides[get_db] = override_get_db

    # Provide a default mock http_client so routes that need it don't fail
    if not hasattr(app.state, "http_client") or app.state.http_client is None:
        app.state.http_client = AsyncMock(spec=httpx.AsyncClient)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


# Redis container - module-level for sharing
_redis_container: RedisContainer | None = None
_redis_url: str | None = None


def _get_redis_url() -> str:
    """Get or start the shared Redis testcontainer."""
    global _redis_container, _redis_url
    if _redis_url is None:
        _redis_container = RedisContainer("redis:7-alpine")
        _redis_container.start()
        host = _redis_container.get_container_host_ip()
        port = _redis_container.get_exposed_port(6379)
        _redis_url = f"redis://{host}:{port}/0"
    return _redis_url


@pytest.fixture
def redis_url() -> str:
    """Get Redis connection URL from the container."""
    return _get_redis_url()
