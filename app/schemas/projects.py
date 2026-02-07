from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

# -------------------------
# Shared base schema
# -------------------------
class ProjectBase(BaseModel):
    name: str = Field(..., example="My Python Playground")
    language: str = Field(..., example="python")
    source_code: str = Field(..., example="print('Hello, world!')")
    is_public: bool = False

# -------------------------
# Create schema
# -------------------------
class ProjectCreate(ProjectBase):
    pass

# -------------------------
# Update schema (partial)
# -------------------------
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    source_code: Optional[str] = None
    is_public: Optional[bool] = None

# -------------------------
# Response schema
# -------------------------
class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True  # SQLAlchemy -> Pydantic
