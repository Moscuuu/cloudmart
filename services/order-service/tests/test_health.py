"""Tests for health endpoint and app configuration."""

import pytest

from order_service.main import app


class TestHealthEndpoint:
    """Test GET /health endpoint."""

    async def test_health_returns_200(self, async_client):
        """GET /health returns 200 status code."""
        response = await async_client.get("/health")
        assert response.status_code == 200

    async def test_health_returns_correct_json(self, async_client):
        """GET /health returns expected JSON body."""
        response = await async_client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "order-service"
        assert data["version"] == "1.0.0"


class TestReadyEndpoint:
    """Test GET /ready endpoint."""

    async def test_ready_returns_200(self, async_client):
        """GET /ready returns 200 status code."""
        response = await async_client.get("/ready")
        assert response.status_code == 200

    async def test_ready_returns_db_check(self, async_client):
        """GET /ready includes database connectivity check."""
        response = await async_client.get("/ready")
        data = response.json()
        assert "ready" in data
        assert data["service"] == "order-service"
        assert "checks" in data
        assert "database" in data["checks"]

    async def test_ready_database_connected(self, async_client):
        """GET /ready reports database as connected when DB is available."""
        response = await async_client.get("/ready")
        data = response.json()
        assert data["ready"] is True
        assert data["checks"]["database"] == "connected"


class TestAppConfig:
    """Test FastAPI app configuration."""

    def test_app_title(self):
        """App title is 'Order Service'."""
        assert app.title == "Order Service"

    def test_app_version(self):
        """App version is '1.0.0'."""
        assert app.version == "1.0.0"
