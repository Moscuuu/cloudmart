"""create orders and order_items tables

Revision ID: e2452bba64a5
Revises:
Create Date: 2026-03-08 20:51:04.424316

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'e2452bba64a5'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create orders and order_items tables."""
    # Create orderstatus enum type
    orderstatus_enum = sa.Enum('PENDING', 'CONFIRMED', 'CANCELLED', name='orderstatus')
    orderstatus_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'orders',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('customer_name', sa.String(255), nullable=False),
        sa.Column('customer_email', sa.String(255), nullable=False),
        sa.Column('shipping_address', sa.String(1000), nullable=False),
        sa.Column('status', orderstatus_enum, nullable=False, server_default='PENDING'),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_orders_customer_email', 'orders', ['customer_email'])

    op.create_table(
        'order_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('order_id', UUID(as_uuid=True), sa.ForeignKey('orders.id'), nullable=False),
        sa.Column('product_id', UUID(as_uuid=True), nullable=False),
        sa.Column('product_name', sa.String(255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('line_total', sa.Numeric(12, 2), nullable=False),
    )
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])


def downgrade() -> None:
    """Drop orders and order_items tables."""
    op.drop_index('ix_order_items_order_id', table_name='order_items')
    op.drop_table('order_items')
    op.drop_index('ix_orders_customer_email', table_name='orders')
    op.drop_table('orders')

    # Drop enum type
    sa.Enum(name='orderstatus').drop(op.get_bind(), checkfirst=True)
