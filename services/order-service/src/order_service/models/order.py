"""Order SQLAlchemy model."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from order_service.models.base import Base


class OrderStatus(str, enum.Enum):
    """Order lifecycle status."""

    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class Order(Base):
    """Represents a customer order."""

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    user_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    shipping_address: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="orderstatus"),
        nullable=False,
        default=OrderStatus.PENDING,
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Order {self.id} status={self.status}>"
