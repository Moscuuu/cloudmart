"""Order business logic service."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import TYPE_CHECKING

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from order_service.metrics import ORDERS_CREATED, REVENUE_GAUGE
from order_service.models.order import Order, OrderStatus
from order_service.models.order_item import OrderItem
from order_service.repositories.order_repository import OrderRepository
from order_service.schemas.order import CreateOrderRequest
from order_service.services.product_client import ProductClient

if TYPE_CHECKING:
    from order_service.services.pubsub_publisher import PubSubPublisher

logger = logging.getLogger(__name__)


class OrderService:
    """Orchestrates order creation with cross-service stock validation."""

    def __init__(
        self,
        session: AsyncSession,
        http_client: httpx.AsyncClient,
        *,
        pubsub_publisher: PubSubPublisher | None = None,
    ) -> None:
        self.session = session
        self.http_client = http_client
        self.repository = OrderRepository(session)
        self.product_client = ProductClient(http_client)
        self._pubsub_publisher = pubsub_publisher

    async def create_order(
        self,
        request: CreateOrderRequest,
        *,
        user_id: str | None = None,
        user_email: str | None = None,
        user_name: str | None = None,
    ) -> Order:
        """Create an order after validating stock for all items.

        Flow:
        1. Validate stock concurrently for all items via Product Service
        2. Build Order + OrderItems
        3. Persist via repository
        4. Return created order (status = PENDING)

        Raises HTTPException 400 if any item has insufficient stock.
        Raises HTTPException 503 if Product Service is unreachable.
        """
        try:
            # Step 1: Validate stock (raises on failure)
            await self.product_client.validate_all_stock(request.items)

            # Step 2: Calculate totals and build order items
            order_items = []
            total_amount = Decimal("0")

            for item in request.items:
                line_total = item.unit_price * item.quantity
                total_amount += line_total

                order_items.append(
                    OrderItem(
                        product_id=item.product_id,
                        product_name=item.product_name,
                        quantity=item.quantity,
                        unit_price=float(item.unit_price),
                        line_total=float(line_total),
                    )
                )

            # Step 3: Build and persist order
            # JWT claims provide fallbacks for customer_name/email
            customer_name = request.customer_name or user_name or "Unknown"
            customer_email = request.customer_email or user_email or "unknown@example.com"

            order = Order(
                customer_name=customer_name,
                customer_email=customer_email,
                shipping_address=request.shipping_address,
                status=OrderStatus.PENDING,
                total_amount=float(total_amount),
                items=order_items,
                user_id=user_id,
            )

            order = await self.repository.create(order)

            # Track business metrics
            ORDERS_CREATED.labels(status="completed").inc()
            REVENUE_GAUGE.inc(float(total_amount))
        except Exception:
            ORDERS_CREATED.labels(status="failed").inc()
            raise

        # Step 4: Publish order-placed events and confirm
        if self._pubsub_publisher is not None:
            try:
                await self._pubsub_publisher.publish_order_placed(
                    str(order.id), order.items
                )
                order.status = OrderStatus.CONFIRMED
                await self.session.flush()
                await self.session.refresh(order)
            except Exception:
                logger.warning(
                    "Pub/Sub publish failed for order %s; staying PENDING",
                    order.id,
                    exc_info=True,
                )

        return order
