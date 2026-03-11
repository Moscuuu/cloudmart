"""Repository for Order data access."""

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from order_service.models.order import Order


class OrderRepository:
    """Async data access layer for orders."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, order: Order) -> Order:
        """Persist a new order with its items."""
        self.session.add(order)
        await self.session.flush()
        await self.session.refresh(order, attribute_names=["items"])
        return order

    async def get_by_id(self, order_id: UUID) -> Order | None:
        """Fetch a single order by ID with items eagerly loaded."""
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_customer_email(
        self, email: str, skip: int = 0, limit: int = 20
    ) -> tuple[list[Order], int]:
        """Fetch paginated orders for a customer email.

        Returns (orders, total_count).
        """
        # Count query
        count_stmt = (
            select(func.count())
            .select_from(Order)
            .where(Order.customer_email == email)
        )
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        # Data query
        data_stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.customer_email == email)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        data_result = await self.session.execute(data_stmt)
        orders = list(data_result.scalars().all())

        return orders, total

    async def get_by_user(
        self, user_id: str, email: str, skip: int = 0, limit: int = 20
    ) -> tuple[list[Order], int]:
        """Fetch paginated orders owned by a user (by user_id OR email fallback).

        Returns (orders, total_count).
        """
        ownership_filter = or_(
            Order.user_id == user_id,
            Order.customer_email == email,
        )

        # Count query
        count_stmt = (
            select(func.count())
            .select_from(Order)
            .where(ownership_filter)
        )
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        # Data query
        data_stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(ownership_filter)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        data_result = await self.session.execute(data_stmt)
        orders = list(data_result.scalars().all())

        return orders, total

    async def get_all(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[Order], int]:
        """Fetch all orders with pagination (admin use case).

        Returns (orders, total_count).
        """
        count_stmt = select(func.count()).select_from(Order)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        data_stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        data_result = await self.session.execute(data_stmt)
        orders = list(data_result.scalars().all())

        return orders, total
