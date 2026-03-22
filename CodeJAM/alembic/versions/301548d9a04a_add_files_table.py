"""add files table

Revision ID: 301548d9a04a
Revises: b7f378093589
Create Date: 2026-02-15 09:49:11.853343

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '301548d9a04a'
down_revision: Union[str, Sequence[str], None] = 'b7f378093589'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
