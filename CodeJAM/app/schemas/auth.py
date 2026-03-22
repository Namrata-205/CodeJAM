"""
app/schemas/auth.py
Pydantic models for authentication responses.
"""
from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"