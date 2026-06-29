"""add is_deleted and share_id to projects

Revision ID: b7f378093589
Revises: 
Create Date: 2026-02-07 18:40:24.684690

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as psql


# revision identifiers, used by Alembic.
revision: str = 'b7f378093589'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('projects', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('projects', sa.Column('share_id', psql.UUID(as_uuid=True), nullable=True, unique=True))

def downgrade():
    op.drop_column('projects', 'share_id')
    op.drop_column('projects', 'is_deleted')