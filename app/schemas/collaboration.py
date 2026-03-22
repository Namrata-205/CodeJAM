"""
app/schemas/collaboration.py
Pydantic models for collaboration invitations and responses.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

VALID_ROLES = {"viewer", "editor"}


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "editor"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v


class ChangeRoleRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v


class CollaboratorResponse(BaseModel):
    user_id: UUID
    email: EmailStr
    role: str
    accepted: bool
    invited_by: Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PendingInvitationResponse(BaseModel):
    project_id: UUID
    project_name: str
    invited_by_email: EmailStr
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}