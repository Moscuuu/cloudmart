"""Order business logic service."""

from decimal import Decimal

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from order_service.models.order import Order, OrderStatus
from order_service.models.order_item import OrderItem
from order_service.repositories.order_repository import OrderRepository
from order_service.schemas.order import CreateOrderRequest
from order_service.services.product_client import ProductClient


class OrderService:
    """Orchestrates order creation with cross-service stock validation."""

    def __init__(
        self, session: AsyncSession, http_client: httpx.AsyncClient
    ) -> None:
        self.session = session
        self.http_client = http_client
        self.repository = OrderRepository(session)
        self.product_client = ProductClient(http_client)

    async def create_order(self, request: CreateOrderRequest) -> Order:
        """Create an order after validating stock for all items.

        Flow:
        1. Validate stock concurrently for all items via Product Service
        2. Build Order + OrderItems
        3. Persist via repository
        4. Return created order (status = PENDING)

        Raises HTTPException 400 if any item has insufficient stock.
        Raises HTTPException 503 if Product Service is unreachable.
        """
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
        order = Order(
            customer_name=request.customer_name,
            customer_email=request.customer_email,
            shipping_address=request.shipping_address,
            status=OrderStatus.PENDING,
            total_amount=float(total_amount),
            items=order_items,
        )

        return await self.repository.create(order)
