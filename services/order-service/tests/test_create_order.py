"""Integration tests for order creation with stock validation."""

import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from order_service.auth.jwt_service import JwtService
from order_service.models.order import Order, OrderStatus
from order_service.models.order_item import OrderItem


def _auth_header(
    user_id: str = "google-oauth2|testuser",
    email: str = "john@example.com",
    name: str = "John Doe",
    role: str = "user",
) -> dict:
    """Create Authorization header with a valid test JWT."""
    token = JwtService.create_access_token(user_id, email, name, role)
    return {"Authorization": f"Bearer {token}"}


def _make_order_payload(
    items: list[dict] | None = None,
    customer_name: str = "John Doe",
    customer_email: str = "john@example.com",
    shipping_address: str = "123 Main St",
) -> dict:
    """Build a valid CreateOrderRequest payload."""
    if items is None:
        items = [
            {
                "product_id": str(uuid.uuid4()),
                "product_name": "Widget A",
                "quantity": 2,
                "unit_price": "19.99",
            },
            {
                "product_id": str(uuid.uuid4()),
                "product_name": "Widget B",
                "quantity": 1,
                "unit_price": "49.99",
            },
        ]
    return {
        "customer_name": customer_name,
        "customer_email": customer_email,
        "shipping_address": shipping_address,
        "items": items,
    }


def _mock_inventory_response(product_id: str, available: int) -> httpx.Response:
    """Create a mock inventory response."""
    return httpx.Response(
        200,
        json={
            "product_id": product_id,
            "quantity": available + 5,
            "reserved_quantity": 5,
            "available_quantity": available,
        },
        request=httpx.Request("GET", f"http://mock/api/v1/inventory/{product_id}"),
    )


@pytest.fixture
async def mock_http_client():
    """Provide a mock httpx.AsyncClient for Product Service calls."""
    client = AsyncMock(spec=httpx.AsyncClient)
    return client


@pytest.fixture
async def client_with_mock_product(engine, mock_http_client):
    """Provide an async HTTP client with mocked Product Service."""
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

    # Store mock http_client on app.state
    app.state.http_client = mock_http_client

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_order_success(client_with_mock_product, mock_http_client, engine):
    """Creating an order with sufficient stock persists Order + OrderItems with status PENDING."""
    payload = _make_order_payload()
    product_ids = [item["product_id"] for item in payload["items"]]

    # Mock stock check returning sufficient quantity for each product
    async def mock_get(url, **kwargs):
        for pid in product_ids:
            if pid in str(url):
                return _mock_inventory_response(pid, available=100)
        return _mock_inventory_response(product_ids[0], available=100)

    mock_http_client.get = AsyncMock(side_effect=mock_get)

    response = await client_with_mock_product.post(
        "/api/v1/orders", json=payload, headers=_auth_header()
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "PENDING"
    assert data["customer_name"] == "John Doe"
    assert data["customer_email"] == "john@example.com"
    assert len(data["items"]) == 2

    # Verify persisted in DB
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        result = await session.execute(select(Order))
        orders = result.scalars().all()
        assert len(orders) >= 1


@pytest.mark.asyncio
async def test_create_order_insufficient_stock(
    client_with_mock_product, mock_http_client, engine
):
    """Creating an order with insufficient stock for ANY item rejects the entire order."""
    payload = _make_order_payload()
    product_ids = [item["product_id"] for item in payload["items"]]

    # First product has enough, second does not
    call_count = 0

    async def mock_get(url, **kwargs):
        nonlocal call_count
        call_count += 1
        for i, pid in enumerate(product_ids):
            if pid in str(url):
                if i == 0:
                    return _mock_inventory_response(pid, available=100)
                else:
                    return _mock_inventory_response(pid, available=0)  # Insufficient
        return _mock_inventory_response(product_ids[0], available=100)

    mock_http_client.get = AsyncMock(side_effect=mock_get)

    response = await client_with_mock_product.post(
        "/api/v1/orders", json=payload, headers=_auth_header()
    )

    assert response.status_code == 400

    # Verify NO order was persisted
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        result = await session.execute(select(Order))
        orders = result.scalars().all()
        assert len(orders) == 0


@pytest.mark.asyncio
async def test_create_order_product_service_unavailable(
    client_with_mock_product, mock_http_client
):
    """Creating an order when Product Service is unreachable raises 503."""
    payload = _make_order_payload()

    mock_http_client.get = AsyncMock(
        side_effect=httpx.ConnectError("Connection refused")
    )

    response = await client_with_mock_product.post(
        "/api/v1/orders", json=payload, headers=_auth_header()
    )

    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_order_calculates_total(
    client_with_mock_product, mock_http_client
):
    """Order total_amount equals sum of (quantity * unit_price) for all items."""
    items = [
        {
            "product_id": str(uuid.uuid4()),
            "product_name": "Product A",
            "quantity": 3,
            "unit_price": "10.00",
        },
        {
            "product_id": str(uuid.uuid4()),
            "product_name": "Product B",
            "quantity": 2,
            "unit_price": "25.50",
        },
    ]
    payload = _make_order_payload(items=items)

    # Mock all stock checks as sufficient
    async def mock_get(url, **kwargs):
        return httpx.Response(
            200,
            json={
                "product_id": "any",
                "quantity": 100,
                "reserved_quantity": 0,
                "available_quantity": 100,
            },
            request=httpx.Request("GET", f"http://mock{url}"),
        )

    mock_http_client.get = AsyncMock(side_effect=mock_get)

    response = await client_with_mock_product.post(
        "/api/v1/orders", json=payload, headers=_auth_header()
    )

    assert response.status_code == 201
    data = response.json()
    expected_total = (3 * 10.00) + (2 * 25.50)  # 30 + 51 = 81.00
    assert float(data["total_amount"]) == pytest.approx(expected_total)


@pytest.mark.asyncio
async def test_create_order_empty_items(client_with_mock_product):
    """POST with empty items list returns 422 (Pydantic validation)."""
    payload = _make_order_payload(items=[])

    response = await client_with_mock_product.post(
        "/api/v1/orders", json=payload, headers=_auth_header()
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_order_stores_product_name(
    client_with_mock_product, mock_http_client, engine
):
    """product_name is stored on OrderItem (denormalized from request)."""
    items = [
        {
            "product_id": str(uuid.uuid4()),
            "product_name": "Fancy Gadget",
            "quantity": 1,
            "unit_price": "99.99",
        },
    ]
    payload = _make_order_payload(items=items)

    async def mock_get(url, **kwargs):
        return httpx.Response(
            200,
            json={
                "product_id": "any",
                "quantity": 100,
                "reserved_quantity": 0,
                "available_quantity": 100,
            },
            request=httpx.Request("GET", f"http://mock{url}"),
        )

    mock_http_client.get = AsyncMock(side_effect=mock_get)

    response = await client_with_mock_product.post(
        "/api/v1/orders", json=payload, headers=_auth_header()
    )

    assert response.status_code == 201
    data = response.json()
    assert data["items"][0]["product_name"] == "Fancy Gadget"
