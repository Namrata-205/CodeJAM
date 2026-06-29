"""merge schema and integration token heads

Revision ID: d4e5f6a7b8c9
Revises: 0f85235a3641, 9a8b7c6d5e4f
Create Date: 2026-06-29 16:20:00.000000

"""
from typing import Sequence, Union


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = ("0f85235a3641", "9a8b7c6d5e4f")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
