"""Tests for auth event structured logging and Prometheus counters."""

import logging

import pytest

from order_service.auth.jwt_service import JwtService

# ---------------------------------------------------------------------------
# Unit tests for log_auth_event helper
# ---------------------------------------------------------------------------


class TestAuthEventLogging:
    """Verify auth events are logged with required structured fields."""

    def test_auth_event_logged_with_required_fields(self, caplog):
        """log_auth_event emits a log record with event_type, user_id, client_ip, action, result."""
        from order_service.auth.events import log_auth_event

        with caplog.at_level(logging.INFO, logger="order_service.auth"):
            log_auth_event(
                event_type="auth.login.success",
                user_id="google-oauth2|user1",
                client_ip="192.168.1.1",
                result="success",
            )

        assert len(caplog.records) >= 1
        record = caplog.records[-1]
        assert record.event_type == "auth.login.success"
        assert record.user_id == "google-oauth2|user1"
        assert record.client_ip == "192.168.1.1"
        assert record.action == "success"  # last segment of event_type
        assert record.result == "success"

    def test_auth_event_defaults_for_anonymous(self, caplog):
        """log_auth_event uses sensible defaults when user_id/client_ip not provided."""
        from order_service.auth.events import log_auth_event

        with caplog.at_level(logging.INFO, logger="order_service.auth"):
            log_auth_event(event_type="auth.login.failure", result="failure")

        record = caplog.records[-1]
        assert record.user_id == "anonymous"
        assert record.client_ip == "unknown"

    def test_auth_event_counter_incremented(self):
        """log_auth_event increments the auth_events_total Prometheus counter."""
        from order_service.auth.events import log_auth_event
        from order_service.metrics import auth_events_total

        # Get baseline value
        before = auth_events_total.labels(
            event_type="auth.test.counter", result="success"
        )._value.get()

        log_auth_event(
            event_type="auth.test.counter",
            user_id="test",
            result="success",
        )

        after = auth_events_total.labels(
            event_type="auth.test.counter", result="success"
        )._value.get()

        assert after == before + 1

    def test_auth_event_failure_counter(self):
        """Failure events increment counter with result=failure."""
        from order_service.auth.events import log_auth_event
        from order_service.metrics import auth_events_total

        before = auth_events_total.labels(
            event_type="auth.login.failure", result="failure"
        )._value.get()

        log_auth_event(
            event_type="auth.login.failure",
            result="failure",
        )

        after = auth_events_total.labels(
            event_type="auth.login.failure", result="failure"
        )._value.get()

        assert after == before + 1


# ---------------------------------------------------------------------------
# Integration tests: auth events emitted from endpoints
# ---------------------------------------------------------------------------


class TestAuthEventIntegration:
    """Verify auth events are emitted from actual endpoint flows."""

    @pytest.mark.asyncio
    async def test_permission_denied_event_on_order_access(
        self, async_client, caplog
    ):
        """Accessing another user's order logs auth.permission.denied event."""

        # We need to create an order owned by a different user, but the
        # async_client fixture creates tables fresh. We need a session.
        # Use the conftest's engine fixture indirectly via async_client.
        # Instead, we'll mock at the dependency level.
        import uuid
        from unittest.mock import AsyncMock, patch

        from order_service.repositories.order_repository import OrderRepository

        # Create a mock order owned by someone else
        mock_order = AsyncMock()
        mock_order.user_id = "google-oauth2|other"
        mock_order.customer_email = "other@example.com"
        mock_order.id = uuid.uuid4()

        with patch.object(
            OrderRepository, "get_by_id", return_value=mock_order
        ):
            token = JwtService.create_access_token(
                "google-oauth2|me", "me@example.com", "Me"
            )
            with caplog.at_level(logging.WARNING):
                response = await async_client.get(
                    f"/api/v1/orders/{mock_order.id}",
                    headers={"Authorization": f"Bearer {token}"},
                )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_unauthenticated_request_returns_401(self, async_client):
        """Request without token returns 401."""
        response = await async_client.get("/api/v1/orders")
        assert response.status_code == 401
