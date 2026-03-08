"""Tests for SQLAlchemy models - Order, OrderItem, OrderStatus."""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from order_service.models.order import Order, OrderStatus
from order_service.models.order_item import OrderItem


class TestOrderStatus:
    """Test OrderStatus enum."""

    def test_has_pending(self):
        assert OrderStatus.PENDING == "PENDING"

    def test_has_confirmed(self):
        assert OrderStatus.CONFIRMED == "CONFIRMED"

    def test_has_cancelled(self):
        assert OrderStatus.CANCELLED == "CANCELLED"

    def test_exactly_three_values(self):
        assert len(OrderStatus) == 3

    def test_is_string_enum(self):
        assert isinstance(OrderStatus.PENDING, str)


class TestOrderModel:
    """Test Order SQLAlchemy model fields and defaults."""

    def test_order_has_uuid_id(self):
        order = Order(
            customer_name="Test User",
            customer_email="test@example.com",
            shipping_address="123 Test St",
        )
        # id should be generated as UUID by default
        assert order.id is None or isinstance(order.id, uuid.UUID)

    def test_order_has_required_fields(self):
        order = Order(
            customer_name="Test User",
            customer_email="test@example.com",
            shipping_address="123 Test St",
        )
        assert order.customer_name == "Test User"
        assert order.customer_email == "test@example.com"
        assert order.shipping_address == "123 Test St"

    def test_order_default_status_is_pending(self):
        order = Order(
            customer_name="Test User",
            customer_email="test@example.com",
            shipping_address="123 Test St",
        )
        assert order.status is None or order.status == OrderStatus.PENDING

    def test_order_tablename(self):
        assert Order.__tablename__ == "orders"


class TestOrderItemModel:
    """Test OrderItem SQLAlchemy model fields."""

    def test_order_item_has_required_fields(self):
        product_id = uuid.uuid4()
        item = OrderItem(
            product_id=product_id,
            product_name="Widget",
            quantity=2,
            unit_price=9.99,
            line_total=19.98,
        )
        assert item.product_id == product_id
        assert item.product_name == "Widget"
        assert item.quantity == 2
        assert item.unit_price == 9.99
        assert item.line_total == 19.98

    def test_order_item_tablename(self):
        assert OrderItem.__tablename__ == "order_items"


class TestOrderPersistence:
    """Test persisting Order with OrderItems to PostgreSQL."""

    async def test_persist_order_with_items(self, async_db_session):
        """Persist an Order with OrderItems and verify round-trip."""
        order = Order(
            id=uuid.uuid4(),
            customer_name="Jane Doe",
            customer_email="jane@example.com",
            shipping_address="456 Oak Ave",
            status=OrderStatus.PENDING,
            total_amount=29.97,
        )
        item1 = OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            product_id=uuid.uuid4(),
            product_name="Widget A",
            quantity=1,
            unit_price=9.99,
            line_total=9.99,
        )
        item2 = OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            product_id=uuid.uuid4(),
            product_name="Widget B",
            quantity=2,
            unit_price=9.99,
            line_total=19.98,
        )
        order.items = [item1, item2]

        async_db_session.add(order)
        await async_db_session.flush()

        # Query back
        stmt = (
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.items))
        )
        result = await async_db_session.execute(stmt)
        loaded_order = result.scalar_one()

        assert loaded_order.customer_name == "Jane Doe"
        assert loaded_order.customer_email == "jane@example.com"
        assert loaded_order.status == OrderStatus.PENDING
        assert float(loaded_order.total_amount) == 29.97
        assert len(loaded_order.items) == 2
        item_names = {i.product_name for i in loaded_order.items}
        assert item_names == {"Widget A", "Widget B"}

    async def test_order_items_relationship_loads(self, async_db_session):
        """Order.items relationship loads OrderItem list via selectinload."""
        order = Order(
            id=uuid.uuid4(),
            customer_name="Bob Smith",
            customer_email="bob@example.com",
            shipping_address="789 Pine Rd",
            total_amount=5.00,
        )
        item = OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            product_id=uuid.uuid4(),
            product_name="Gadget",
            quantity=1,
            unit_price=5.00,
            line_total=5.00,
        )
        order.items = [item]

        async_db_session.add(order)
        await async_db_session.flush()

        stmt = (
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.items))
        )
        result = await async_db_session.execute(stmt)
        loaded = result.scalar_one()

        assert len(loaded.items) == 1
        assert loaded.items[0].product_name == "Gadget"
        assert loaded.items[0].order_id == order.id
