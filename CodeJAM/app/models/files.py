"""
app/models/files.py
A project can contain multiple code files organised in a tree (via parent_id).
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from app.models.types import GUID
from sqlalchemy.orm import relationship

from app.db import Base


class File(Base):
    __tablename__ = "files"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    project_id = Column(
        GUID(),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # NULL means root-level file; non-NULL means nested inside a directory file
    parent_id = Column(
        GUID(),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
    )

    name = Column(String(255), nullable=False)
    content = Column(Text, default="", nullable=False)
    language = Column(String(50), default="plaintext", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ── Relationships ────────────────────────────────────────────────────────
    project = relationship("Project", back_populates="files")
    children = relationship(
        "File",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<File {self.id} {self.name!r}>"