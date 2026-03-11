"""add user_id to orders

Revision ID: cb43dba68d59
Revises: e2452bba64a5
Create Date: 2026-03-11 10:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cb43dba68d59'
down_revision: Union[str, Sequence[str], None] = 'e2452bba64a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('user_id', sa.String(255), nullable=True))
    op.create_index('ix_orders_user_id', 'orders', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_orders_user_id', table_name='orders')
    op.drop_column('orders', 'user_id')
