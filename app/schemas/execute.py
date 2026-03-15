"""
app/schemas/execute.py
Pydantic models for code execution requests and job status responses.
"""
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.config import SUPPORTED_LANGUAGES


class ExecuteRequest(BaseModel):
    language: str = Field(..., examples=["python"])
    source_code: str = Field(..., min_length=1, examples=["print('hello')"])

    @classmethod
    def validate_language(cls, v: str) -> str:
        if v not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{v}'. "
                f"Supported: {', '.join(SUPPORTED_LANGUAGES)}"
            )
        return v


class JobStatusResponse(BaseModel):
    job_id: str
    status: str                     # "queued" | "running" | "finished" | "failed"
    output: Optional[str] = None    # stdout/stderr when finished
    error: Optional[str] = None     # error detail when failed