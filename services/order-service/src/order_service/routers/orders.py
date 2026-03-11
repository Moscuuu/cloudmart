"""FastAPI router for order endpoints -- JWT-protected with user isolation."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from order_service.auth.dependencies import get_current_user
from order_service.database import get_db
from order_service.repositories.order_repository import OrderRepository
from order_service.schemas.order import (
    CreateOrderRequest,
    OrderListResponse,
    OrderResponse,
)
from order_service.services.order_service import OrderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


@router.post("", status_code=201, response_model=OrderResponse)
async def create_order(
    request: Request,
    body: CreateOrderRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new order with stock validation. Requires JWT auth."""
    http_client = request.app.state.http_client
    pubsub_publisher = getattr(request.app.state, "pubsub_publisher", None)
    service = OrderService(db, http_client, pubsub_publisher=pubsub_publisher)
    order = await service.create_order(
        body,
        user_id=user["sub"],
        user_email=user.get("email"),
        user_name=user.get("name"),
    )
    return order


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get order detail by ID. Enforces ownership (admin can access any)."""
    repository = OrderRepository(db)
    order = await repository.get_by_id(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    # Ownership check: non-admin users can only see their own orders
    if user.get("role") != "admin":
        is_owner = (
            order.user_id == user["sub"]
            or order.customer_email == user.get("email")
        )
        if not is_owner:
            logger.warning(
                "Permission denied: user %s attempted to access order %s",
                user["sub"],
                order_id,
            )
            raise HTTPException(
                status_code=403, detail="Not authorized to view this order"
            )

    return order


@router.get("", response_model=OrderListResponse)
async def list_orders(
    user: dict = Depends(get_current_user),
    customer_email: str | None = Query(default=None, description="Filter by email (admin only)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List orders with user isolation. Admins see all; users see only their own."""
    repository = OrderRepository(db)

    if user.get("role") == "admin":
        if customer_email:
            orders, total = await repository.get_by_customer_email(
                email=customer_email, skip=skip, limit=limit
            )
        else:
            orders, total = await repository.get_all(skip=skip, limit=limit)
    else:
        # Regular user: filter by user_id + email fallback
        orders, total = await repository.get_by_user(
            user_id=user["sub"],
            email=user.get("email", ""),
            skip=skip,
            limit=limit,
        )

    return OrderListResponse(orders=orders, total=total)
