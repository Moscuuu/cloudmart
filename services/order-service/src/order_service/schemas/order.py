"""Pydantic schemas for order request/response."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from order_service.models.order import OrderStatus


class OrderItemRequest(BaseModel):
    """Request schema for creating an order item."""

    product_id: UUID
    product_name: str = Field(min_length=1, max_length=255)
    quantity: int = Field(gt=0, description="Must be greater than 0")
    unit_price: Decimal = Field(gt=0, description="Price per unit")


class CreateOrderRequest(BaseModel):
    """Request schema for creating an order.

    customer_name and customer_email are optional when the request is
    authenticated -- the JWT claims provide fallback values.
    """

    customer_name: str | None = Field(default=None, max_length=255)
    customer_email: str | None = Field(default=None, max_length=255)
    shipping_address: str = Field(min_length=1, max_length=1000)
    items: list[OrderItemRequest] = Field(min_length=1)


class OrderItemResponse(BaseModel):
    """Response schema for an order item."""

    id: UUID
    order_id: UUID
    product_id: UUID
    product_name: str
    quantity: int
    unit_price: float
    line_total: float

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    """Response schema for an order."""

    id: UUID
    customer_name: str
    customer_email: str
    shipping_address: str
    status: OrderStatus
    total_amount: float
    user_id: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    """Response schema for paginated order list."""

    orders: list[OrderResponse]
    total: int
