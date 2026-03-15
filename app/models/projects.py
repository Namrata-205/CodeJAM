"""
app/models/projects.py
SQLAlchemy model for code projects.
"""
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # ── Content ──────────────────────────────────────────────────────────────
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(50), nullable=False)   # e.g. "python", "javascript"
    source_code = Column(Text, nullable=False, default="")

    # ── Visibility ───────────────────────────────────────────────────────────
    is_public = Column(Boolean, default=False, nullable=False)

    # ── Ownership ────────────────────────────────────────────────────────────
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
    )

    # ── Soft delete ──────────────────────────────────────────────────────────
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    # ── Public share link ────────────────────────────────────────────────────
    # Generated on demand; presence means the project is shareable without auth.
    share_id = Column(UUID(as_uuid=True), unique=True, index=True, nullable=True)

    # ── Relationships ────────────────────────────────────────────────────────
    owner = relationship("User", backref="projects", lazy="joined")

    collaborators = relationship(
        "ProjectCollaborator",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    files = relationship(
        "File",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<Project {self.id} {self.name!r}>"