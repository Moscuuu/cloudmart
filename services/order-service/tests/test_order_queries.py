"""Integration tests for order endpoints with JWT auth and user isolation."""

import uuid
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from order_service.auth.jwt_service import JwtService
from order_service.models.order import Order, OrderStatus
from order_service.models.order_item import OrderItem


def _make_token(
    user_id: str = "google-oauth2|user1",
    email: str = "user1@example.com",
    name: str = "User One",
    role: str = "user",
) -> str:
    """Create a test JWT access token."""
    return JwtService.create_access_token(user_id, email, name, role)


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_test_order(
    session: AsyncSession,
    customer_email: str = "test@example.com",
    customer_name: str = "Test User",
    shipping_address: str = "456 Test Ave",
    status: OrderStatus = OrderStatus.PENDING,
    user_id: str | None = None,
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
        user_id=user_id,
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


# ---------------------------------------------------------------------------
# Auth requirement tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_order_requires_auth(async_client):
    """POST /api/v1/orders without Bearer token returns 401."""
    response = await async_client.post(
        "/api/v1/orders",
        json={
            "customer_name": "No Auth",
            "customer_email": "noauth@example.com",
            "shipping_address": "123 Main St",
            "items": [
                {
                    "product_id": str(uuid.uuid4()),
                    "product_name": "Widget",
                    "quantity": 1,
                    "unit_price": "10.00",
                }
            ],
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_orders_requires_auth(async_client):
    """GET /api/v1/orders without Bearer token returns 401."""
    response = await async_client.get("/api/v1/orders")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_order_requires_auth(async_client):
    """GET /api/v1/orders/{id} without Bearer token returns 401."""
    response = await async_client.get(f"/api/v1/orders/{uuid.uuid4()}")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# User isolation tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_user_sees_own_orders_only(async_client, db_session):
    """GET /api/v1/orders with user JWT returns only that user's orders."""
    user_a_id = "google-oauth2|aaa"
    user_b_id = "google-oauth2|bbb"

    await _create_test_order(
        db_session,
        customer_email="a@example.com",
        customer_name="User A",
        user_id=user_a_id,
    )
    await _create_test_order(
        db_session,
        customer_email="b@example.com",
        customer_name="User B",
        user_id=user_b_id,
    )

    token_a = _make_token(user_id=user_a_id, email="a@example.com", name="User A")
    response = await async_client.get(
        "/api/v1/orders", headers=_auth_header(token_a)
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["orders"][0]["customer_email"] == "a@example.com"


@pytest.mark.asyncio
async def test_admin_sees_all_orders(async_client, db_session):
    """GET /api/v1/orders with admin JWT returns all orders."""
    await _create_test_order(
        db_session,
        customer_email="x@example.com",
        customer_name="User X",
        user_id="google-oauth2|x",
    )
    await _create_test_order(
        db_session,
        customer_email="y@example.com",
        customer_name="User Y",
        user_id="google-oauth2|y",
    )

    admin_token = _make_token(
        user_id="google-oauth2|admin1",
        email="admin@example.com",
        name="Admin",
        role="admin",
    )
    response = await async_client.get(
        "/api/v1/orders", headers=_auth_header(admin_token)
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_user_cannot_access_other_users_order(async_client, db_session):
    """GET /api/v1/orders/{id} returns 403 if order belongs to another user."""
    other_user_id = "google-oauth2|other"
    order = await _create_test_order(
        db_session,
        customer_email="other@example.com",
        customer_name="Other User",
        user_id=other_user_id,
    )

    my_token = _make_token(
        user_id="google-oauth2|me",
        email="me@example.com",
        name="Me",
    )
    response = await async_client.get(
        f"/api/v1/orders/{order.id}", headers=_auth_header(my_token)
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_access_any_order(async_client, db_session):
    """GET /api/v1/orders/{id} with admin JWT returns any order."""
    order = await _create_test_order(
        db_session,
        customer_email="someone@example.com",
        customer_name="Someone",
        user_id="google-oauth2|someone",
    )

    admin_token = _make_token(
        user_id="google-oauth2|admin1",
        email="admin@example.com",
        name="Admin",
        role="admin",
    )
    response = await async_client.get(
        f"/api/v1/orders/{order.id}", headers=_auth_header(admin_token)
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(order.id)


@pytest.mark.asyncio
async def test_backward_compat_email_fallback(async_client, db_session):
    """Pre-auth order (no user_id, has email) visible to user with matching email."""
    email = "legacy@example.com"
    await _create_test_order(
        db_session,
        customer_email=email,
        customer_name="Legacy User",
        user_id=None,  # pre-auth order
    )

    token = _make_token(
        user_id="google-oauth2|legacy",
        email=email,
        name="Legacy User",
    )
    response = await async_client.get(
        "/api/v1/orders", headers=_auth_header(token)
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["orders"][0]["customer_email"] == email


@pytest.mark.asyncio
async def test_get_order_by_id_authenticated(async_client, db_session):
    """GET /api/v1/orders/{id} with valid JWT returns own order."""
    user_id = "google-oauth2|owner"
    order = await _create_test_order(
        db_session,
        customer_email="owner@example.com",
        customer_name="Owner",
        user_id=user_id,
    )

    token = _make_token(
        user_id=user_id, email="owner@example.com", name="Owner"
    )
    response = await async_client.get(
        f"/api/v1/orders/{order.id}", headers=_auth_header(token)
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(order.id)
    assert data["customer_name"] == "Owner"


@pytest.mark.asyncio
async def test_get_order_not_found_authenticated(async_client):
    """GET /api/v1/orders/{id} with non-existent ID returns 404."""
    token = _make_token()
    random_id = uuid.uuid4()
    response = await async_client.get(
        f"/api/v1/orders/{random_id}", headers=_auth_header(token)
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_orders_pagination(async_client, db_session):
    """GET /api/v1/orders with limit returns correct page with total count."""
    user_id = "google-oauth2|paginator"
    email = "paginate@example.com"
    for i in range(5):
        await _create_test_order(
            db_session,
            customer_email=email,
            customer_name=f"Paginate User {i}",
            user_id=user_id,
        )

    token = _make_token(user_id=user_id, email=email, name="Paginate User")
    response = await async_client.get(
        "/api/v1/orders",
        params={"limit": 2},
        headers=_auth_header(token),
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["orders"]) == 2
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_order_response_includes_user_id(async_client, db_session):
    """OrderResponse includes user_id field."""
    user_id = "google-oauth2|respuser"
    order = await _create_test_order(
        db_session,
        customer_email="resp@example.com",
        customer_name="Resp User",
        user_id=user_id,
    )

    token = _make_token(user_id=user_id, email="resp@example.com", name="Resp User")
    response = await async_client.get(
        f"/api/v1/orders/{order.id}", headers=_auth_header(token)
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user_id
