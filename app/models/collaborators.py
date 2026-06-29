"""
app/models/collaborators.py
Junction table linking Users to Projects with a role and acceptance state.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from app.models.types import GUID
from sqlalchemy.orm import relationship

from app.db import Base


class ProjectCollaborator(Base):
    __tablename__ = "project_collaborators"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    project_id = Column(
        GUID(),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # "viewer" | "editor"
    role = Column(String(20), nullable=False, default="viewer")

    # True once the invited user has explicitly accepted
    accepted = Column(Boolean, default=False, nullable=False)

    # Who sent the invite (owner's user_id)
    invited_by = Column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # ── Relationships ────────────────────────────────────────────────────────
    project = relationship("Project", back_populates="collaborators")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])

    def __repr__(self) -> str:
        return f"<ProjectCollaborator project={self.project_id} user={self.user_id} role={self.role!r}>"