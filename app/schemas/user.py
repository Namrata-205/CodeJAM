"""
app/schemas/user.py
Pydantic models for user creation and API responses.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

# bcrypt silently truncates passwords longer than 72 bytes.
# We enforce this limit at the schema layer so the caller gets a clear error.
MAX_BCRYPT_LENGTH = 72


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        if len(v.encode("utf-8")) > MAX_BCRYPT_LENGTH:
            raise ValueError(
                f"Password must be at most {MAX_BCRYPT_LENGTH} bytes "
                "(bcrypt limit — use a shorter passphrase)"
            )
        return v


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    is_active: bool
    provider: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}