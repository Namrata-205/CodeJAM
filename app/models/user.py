"""
app/models/user.py
SQLAlchemy model for registered users.
Supports both local (email/password) and OAuth (Google/GitHub) accounts.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String

from app.db import Base
from app.models.types import GUID


class User(Base):
    __tablename__ = "users"

    id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password = Column(
        String(255),
        nullable=True,      # NULL for OAuth-only users
    )

    provider = Column(
        String(50),
        nullable=False,
        default="local",    # "local" | "google" | "github"
    )

    provider_id = Column(
        String(255),
        nullable=True,      # External provider's user ID
    )

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        onupdate=datetime.utcnow,
    )

    def __repr__(self) -> str:
        return f"<User {self.id} {self.email}>"