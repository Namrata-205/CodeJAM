"""add collaborators

Revision ID: c21f826c77a5
Revises: 301548d9a04a
Create Date: 2026-02-15
"""

from alembic import op
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as psql


# revision identifiers
revision = 'c21f826c77a5'
down_revision = '301548d9a04a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'project_collaborators',

        sa.Column('id', psql.UUID(as_uuid=True), primary_key=True, nullable=False),

        sa.Column(
            'project_id',
            psql.UUID(as_uuid=True),
            sa.ForeignKey('projects.id', ondelete="CASCADE"),
            nullable=False
        ),

        sa.Column(
            'user_id',
            psql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete="CASCADE"),
            nullable=False
        ),

        sa.Column(
            'role',
            sa.String(length=20),
            nullable=False,
            server_default="viewer"
        ),

        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.func.now()
        ),

        # Prevent duplicate invites
        sa.UniqueConstraint('project_id', 'user_id', name='uq_project_user')
    )


def downgrade():
    op.drop_table('project_collaborators')
