"""Integration tests for order detail and history endpoints."""

import uuid
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from order_service.models.order import Order, OrderStatus
from order_service.models.order_item import OrderItem


async def _create_test_order(
    session: AsyncSession,
    customer_email: str = "test@example.com",
    customer_name: str = "Test User",
    shipping_address: str = "456 Test Ave",
    status: OrderStatus = OrderStatus.PENDING,
    items: list[dict] | None = None,
) -> Order:
    """Create a test order directly via SQLAlchemy (bypasses Product Service)."""
    if items is None:
        items = [
            {
                "product_id": uuid.uuid4(),
                "product_name": "Test Widget",
                "quantity": 2,
                "unit_price": 15.00,
                "line_total": 30.00,
            }
        ]

    order_items = [
        OrderItem(
            product_id=item["product_id"],
            product_name=item["product_name"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            line_total=item["line_total"],
        )
        for item in items
    ]

    total = sum(item["line_total"] for item in items)
    order = Order(
        customer_name=customer_name,
        customer_email=customer_email,
        shipping_address=shipping_address,
        status=status,
        total_amount=total,
        items=order_items,
    )
    session.add(order)
    await session.commit()
    await session.refresh(order, attribute_names=["items"])
    return order


@pytest.fixture
async def db_session(engine) -> AsyncSession:
    """Provide a committed session for direct DB operations."""
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session


@pytest.mark.asyncio
async def test_get_order_by_id(async_client, db_session, engine):
    """GET /api/v1/orders/{id} returns order with correct fields and items."""
    order = await _create_test_order(db_session)

    response = await async_client.get(f"/api/v1/orders/{order.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(order.id)
    assert data["customer_name"] == "Test User"
    assert data["customer_email"] == "test@example.com"
    assert data["status"] == "PENDING"
    assert len(data["items"]) == 1
    assert data["items"][0]["product_name"] == "Test Widget"
    assert data["items"][0]["quantity"] == 2


@pytest.mark.asyncio
async def test_get_order_not_found(async_client):
    """GET /api/v1/orders/{id} with non-existent ID returns 404."""
    random_id = uuid.uuid4()
    response = await async_client.get(f"/api/v1/orders/{random_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Order not found"


@pytest.mark.asyncio
async def test_list_orders_by_email(async_client, db_session):
    """GET /api/v1/orders?customer_email=X returns all orders for that email."""
    email = "history@example.com"
    for i in range(3):
        await _create_test_order(
            db_session,
            customer_email=email,
            customer_name=f"User {i}",
        )

    response = await async_client.get(
        "/api/v1/orders", params={"customer_email": email}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["orders"]) == 3

    # Verify reverse chronological order (most recent first)
    dates = [o["created_at"] for o in data["orders"]]
    assert dates == sorted(dates, reverse=True)


@pytest.mark.asyncio
async def test_list_orders_empty(async_client):
    """GET /api/v1/orders?customer_email=X with no orders returns empty list."""
    response = await async_client.get(
        "/api/v1/orders", params={"customer_email": "nobody@example.com"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["orders"] == []


@pytest.mark.asyncio
async def test_list_orders_pagination(async_client, db_session):
    """GET /api/v1/orders with limit returns correct page with total count."""
    email = "paginate@example.com"
    for i in range(5):
        await _create_test_order(
            db_session,
            customer_email=email,
            customer_name=f"Paginate User {i}",
        )

    response = await async_client.get(
        "/api/v1/orders",
        params={"customer_email": email, "limit": 2},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["orders"]) == 2
    assert data["total"] == 5
