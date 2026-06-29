"""add integration tokens

Revision ID: 9a8b7c6d5e4f
Revises: 7cbd1b56c309
Create Date: 2026-06-29 15:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as psql


revision: str = "9a8b7c6d5e4f"
down_revision: Union[str, Sequence[str], None] = "7cbd1b56c309"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "integration_tokens",
        sa.Column("id", psql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", psql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("encrypted_token", sa.String(length=4096), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "provider", name="uq_integration_token_user_provider"),
    )
    op.create_index(op.f("ix_integration_tokens_provider"), "integration_tokens", ["provider"], unique=False)
    op.create_index(op.f("ix_integration_tokens_user_id"), "integration_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_integration_tokens_user_id"), table_name="integration_tokens")
    op.drop_index(op.f("ix_integration_tokens_provider"), table_name="integration_tokens")
    op.drop_table("integration_tokens")
