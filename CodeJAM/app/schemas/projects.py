"""
app/schemas/projects.py
Pydantic models for project creation, updates, and API responses.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.config import SUPPORTED_LANGUAGES


# ── Base ──────────────────────────────────────────────────────────────────────

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["My Python Playground"])
    description: Optional[str] = Field(None, max_length=1000, examples=["A quick Fibonacci demo"])
    language: str = Field(..., examples=["python"])
    source_code: str = Field(default="", examples=["print('Hello, world!')"])
    is_public: bool = False

    @property
    def validated_language(self) -> str:
        if self.language not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{self.language}'. "
                f"Supported: {', '.join(SUPPORTED_LANGUAGES)}"
            )
        return self.language


# ── Create ────────────────────────────────────────────────────────────────────

class ProjectCreate(ProjectBase):
    pass


# ── Metadata update (PATCH — all fields optional) ─────────────────────────────

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    language: Optional[str] = None
    is_public: Optional[bool] = None


# ── Code-only update ──────────────────────────────────────────────────────────

class CodeUpdate(BaseModel):
    source_code: str


# ── Response ──────────────────────────────────────────────────────────────────

class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    share_id: Optional[UUID] = None
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Public view (share link — no user_id exposed) ─────────────────────────────

class PublicProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    language: str
    source_code: str
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Share link response ───────────────────────────────────────────────────────

class ShareLinkResponse(BaseModel):
    share_url: str
    share_id: UUID