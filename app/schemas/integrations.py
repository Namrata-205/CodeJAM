from pydantic import BaseModel, Field


class IntegrationTokenSave(BaseModel):
    provider: str = Field(..., pattern="^(github|vercel)$")
    token: str = Field(..., min_length=1)


class IntegrationStatus(BaseModel):
    provider: str
    connected: bool
