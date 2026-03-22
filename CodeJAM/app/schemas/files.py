"""
app/schemas/files.py
Pydantic models for project file management.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FileCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["main.py"])
    language: str = Field(default="plaintext", examples=["python"])
    parent_id: Optional[UUID] = None
    content: str = Field(default="", examples=["# start coding here"])


class FileUpdate(BaseModel):
    content: str


class FileRename(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class FileResponse(BaseModel):
    id: UUID
    project_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    language: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}