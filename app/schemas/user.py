# app/schemas/user.py
from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from uuid import UUID
from datetime import datetime

MAX_BCRYPT_LENGTH = 72  # bcrypt limit

# Schema for creating a new user
class UserCreate(BaseModel):
    email: EmailStr
    password: constr(min_length=6, max_length=MAX_BCRYPT_LENGTH)

# Schema for returning user info
class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    is_active: Optional[bool] = True
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
