"""Pydantic models for disposable browser workspace runtimes."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class RuntimeResponse(BaseModel):
    id: UUID
    project_id: UUID
    status: Literal["starting", "running", "stopped", "failed", "expired"]
    preview_url: str | None = None
    expires_at: datetime
    error: str | None = None


class RuntimeStartResponse(RuntimeResponse):
    pass
