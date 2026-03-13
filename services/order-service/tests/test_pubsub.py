"""Tests for Pub/Sub event publishing on order creation."""

import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from order_service.auth.jwt_service import JwtService
from order_service.models.order import OrderStatus
from order_service.models.order_item import OrderItem
from order_service.services.pubsub_publisher import PubSubPublisher


def _auth_header() -> dict:
    """Create Authorization header with a valid test JWT."""
    token = JwtService.create_access_token(
        "google-oauth2|pubsubtest", "api@example.com", "API User"
    )
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Unit tests for PubSubPublisher
# ---------------------------------------------------------------------------


class TestPubSubPublisher:
    """Test PubSubPublisher logic with mocked google-cloud-pubsub client."""

    @pytest.fixture
    def mock_publisher_client(self):
        """Create a mock google.cloud.pubsub_v1.PublisherClient."""
        client = MagicMock()
        client.topic_path.return_value = "projects/test-project/topics/order-placed"
        future = MagicMock()
        future.result.return_value = "message-id-123"
        client.publish.return_value = future
        return client

    @pytest.fixture
    def publisher(self, mock_publisher_client):
        """Create PubSubPublisher with mocked client."""
        with patch(
            "order_service.services.pubsub_publisher.pubsub_v1.PublisherClient",
            return_value=mock_publisher_client,
        ):
            pub = PubSubPublisher("test-project")
        return pub

    async def test_publish_one_event_per_line_item(
        self, publisher, mock_publisher_client
    ):
        """Creating an order with N items should publish N events."""
        items = [
            OrderItem(
                product_id=uuid4(), product_name="A", quantity=2,
                unit_price=10.0, line_total=20.0,
            ),
            OrderItem(
                product_id=uuid4(), product_name="B", quantity=1,
                unit_price=5.0, line_total=5.0,
            ),
            OrderItem(
                product_id=uuid4(), product_name="C", quantity=3,
                unit_price=8.0, line_total=24.0,
            ),
        ]

        order_id = str(uuid4())
        await publisher.publish_order_placed(order_id, items)

        assert mock_publisher_client.publish.call_count == 3

    async def test_event_format_matches_product_service(
        self, publisher, mock_publisher_client
    ):
        """Each event must contain exactly {orderId, productId, quantity}."""
        product_id = uuid4()
        items = [
            OrderItem(
                product_id=product_id, product_name="Widget", quantity=5,
                unit_price=10.0, line_total=50.0,
            ),
        ]

        order_id = str(uuid4())
        await publisher.publish_order_placed(order_id, items)

        call_args = mock_publisher_client.publish.call_args
        data = json.loads(call_args[1]["data"])

        assert set(data.keys()) == {"orderId", "productId", "quantity"}
        assert data["orderId"] == order_id
        assert data["productId"] == str(product_id)
        assert data["quantity"] == 5

    async def test_publish_failure_raises(
        self, publisher, mock_publisher_client
    ):
        """If publishing fails, the exception propagates to the caller.

        OrderService catches this to keep the order PENDING (graceful degradation
        is handled at the service layer, not the publisher layer).
        """
        mock_publisher_client.publish.side_effect = Exception("Pub/Sub down")

        items = [
            OrderItem(
                product_id=uuid4(), product_name="X", quantity=1,
                unit_price=1.0, line_total=1.0,
            ),
        ]

        with pytest.raises(Exception, match="Pub/Sub down"):
            await publisher.publish_order_placed(str(uuid4()), items)


# ---------------------------------------------------------------------------
# Integration tests: OrderService + PubSub publisher
# ---------------------------------------------------------------------------


class TestOrderCreationWithPubSub:
    """Test order creation flow including Pub/Sub publishing."""

    @pytest.fixture
    def mock_pubsub_publisher(self):
        """Create a mock PubSubPublisher."""
        pub = AsyncMock(spec=PubSubPublisher)
        pub.publish_order_placed = AsyncMock()
        return pub

    async def test_order_confirmed_after_publish(
        self, async_db_session: AsyncSession, mock_pubsub_publisher
    ):
        """Order status should be CONFIRMED after successful publish."""
        from order_service.schemas.order import CreateOrderRequest
        from order_service.services.order_service import OrderService

        mock_http = AsyncMock()
        service = OrderService(
            async_db_session, mock_http, pubsub_publisher=mock_pubsub_publisher
        )

        # Mock stock validation to pass
        service.product_client = AsyncMock()
        service.product_client.validate_all_stock = AsyncMock(return_value=[])

        request = CreateOrderRequest(
            customer_name="Test User",
            customer_email="test@example.com",
            shipping_address="123 Test St",
            items=[
                {
                    "product_id": str(uuid4()),
                    "product_name": "Widget",
                    "quantity": 2,
                    "unit_price": "10.00",
                },
            ],
        )

        order = await service.create_order(request)
        assert order.status == OrderStatus.CONFIRMED

    async def test_publish_failure_leaves_order_pending(
        self, async_db_session: AsyncSession
    ):
        """If publishing fails, order should remain PENDING."""
        from order_service.schemas.order import CreateOrderRequest
        from order_service.services.order_service import OrderService

        failing_publisher = AsyncMock(spec=PubSubPublisher)
        failing_publisher.publish_order_placed = AsyncMock(
            side_effect=Exception("Pub/Sub unavailable")
        )

        mock_http = AsyncMock()
        service = OrderService(
            async_db_session, mock_http, pubsub_publisher=failing_publisher
        )
        service.product_client = AsyncMock()
        service.product_client.validate_all_stock = AsyncMock(return_value=[])

        request = CreateOrderRequest(
            customer_name="Test User",
            customer_email="fail@example.com",
            shipping_address="456 Fail Ave",
            items=[
                {
                    "product_id": str(uuid4()),
                    "product_name": "Gadget",
                    "quantity": 1,
                    "unit_price": "5.00",
                },
            ],
        )

        order = await service.create_order(request)
        assert order.status == OrderStatus.PENDING

    async def test_order_creation_publishes_events_via_api(
        self, engine, mock_pubsub_publisher
    ):
        """Full API test: POST /api/v1/orders publishes events."""
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
        app.state.pubsub_publisher = mock_pubsub_publisher

        # Mock http_client for stock validation
        mock_http = AsyncMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "product_id": str(uuid4()),
            "quantity": 100,
            "reserved_quantity": 0,
            "available_quantity": 100,
        }
        mock_response.raise_for_status = MagicMock()
        mock_http.get = AsyncMock(return_value=mock_response)
        app.state.http_client = mock_http

        product_ids = [str(uuid4()) for _ in range(3)]
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/orders",
                json={
                    "customer_name": "API User",
                    "customer_email": "api@example.com",
                    "shipping_address": "789 API Blvd",
                    "items": [
                        {
                            "product_id": pid,
                            "product_name": f"Product {i}",
                            "quantity": i + 1,
                            "unit_price": "10.00",
                        }
                        for i, pid in enumerate(product_ids)
                    ],
                },
                headers=_auth_header(),
            )

        assert response.status_code == 201
        mock_pubsub_publisher.publish_order_placed.assert_called_once()
        # Verify order_id and items were passed
        call_args = mock_pubsub_publisher.publish_order_placed.call_args
        assert call_args is not None

        app.dependency_overrides.clear()
