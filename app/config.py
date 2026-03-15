"""
app/config.py
Single source-of-truth for all environment variables.
All other modules should import settings from here — never call os.getenv() directly.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (one level above /app)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


def _require(key: str) -> str:
    """Raise at startup if a required env var is missing."""
    val = os.getenv(key)
    if not val:
        raise RuntimeError(f"Required environment variable '{key}' is not set!")
    return val


# ── Security ────────────────────────────────────────────────────────────────
SECRET_KEY: str = _require("SECRET_KEY")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL: str = _require("DATABASE_URL")

# ── Redis / RQ ───────────────────────────────────────────────────────────────
REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

# ── Code Execution ────────────────────────────────────────────────────────────
# Hard cap on how long a user-submitted job is allowed to run (seconds).
EXECUTION_TIMEOUT: int = int(os.getenv("EXECUTION_TIMEOUT", "10"))

# Supported language identifiers (used for validation).
SUPPORTED_LANGUAGES: list[str] = [
    "python",
    "javascript",
    "typescript",
    "java",
    "go",
    "rust",
    "c",
    "cpp",
]