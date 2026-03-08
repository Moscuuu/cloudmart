"""FastAPI router for order endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from order_service.database import get_db
from order_service.repositories.order_repository import OrderRepository
from order_service.schemas.order import (
    CreateOrderRequest,
    OrderListResponse,
    OrderResponse,
)
from order_service.services.order_service import OrderService

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


@router.post("", status_code=201, response_model=OrderResponse)
async def create_order(
    request: Request,
    body: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new order with stock validation."""
    http_client = request.app.state.http_client
    pubsub_publisher = getattr(request.app.state, "pubsub_publisher", None)
    service = OrderService(db, http_client, pubsub_publisher=pubsub_publisher)
    order = await service.create_order(body)
    return order


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get order detail by ID."""
    repository = OrderRepository(db)
    order = await repository.get_by_id(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("", response_model=OrderListResponse)
async def list_orders(
    customer_email: str = Query(..., description="Customer email to filter by"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List orders for a customer email with pagination."""
    repository = OrderRepository(db)
    orders, total = await repository.get_by_customer_email(
        email=customer_email, skip=skip, limit=limit
    )
    return OrderListResponse(orders=orders, total=total)
