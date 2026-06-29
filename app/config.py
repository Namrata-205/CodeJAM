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
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./codejam.db")
AUTO_CREATE_SQLITE_TABLES: bool = (
    os.getenv("AUTO_CREATE_SQLITE_TABLES", "true").lower() == "true"
)

# ── Redis / RQ ───────────────────────────────────────────────────────────────
REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
REDIS_URL: str | None = os.getenv("REDIS_URL")

# Comma-separated list used by FastAPI CORS middleware.
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    ).split(",")
    if origin.strip()
]
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Email. Resend is recommended on Render because it uses HTTPS instead of SMTP.
# SMTP remains available as a fallback for local/private deployments.
RESEND_API_KEY: str | None = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL: str | None = os.getenv("RESEND_FROM_EMAIL")
RESEND_FROM_NAME: str = os.getenv("RESEND_FROM_NAME", "CodeJam")

# If neither Resend nor SMTP is configured, invite links are still generated,
# but email is not sent automatically.
SMTP_HOST: str | None = os.getenv("SMTP_HOST")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME: str | None = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME or "no-reply@codejam.local")
SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "CodeJam")
SMTP_STARTTLS: bool = os.getenv("SMTP_STARTTLS", "true").lower() == "true"

# ── Code Execution ────────────────────────────────────────────────────────────
# Hard cap on how long a user-submitted job is allowed to run (seconds).
EXECUTION_TIMEOUT: int = int(os.getenv("EXECUTION_TIMEOUT", "10"))

# Disposable previews use a platform-built image with the supported starter
# dependencies already installed. User containers never get network access.
WORKSPACE_RUNTIME_IMAGE: str = os.getenv(
    "WORKSPACE_RUNTIME_IMAGE", "codejam-workspace-runner:latest"
)
WORKSPACE_RUNTIME_TTL_SECONDS: int = int(
    os.getenv("WORKSPACE_RUNTIME_TTL_SECONDS", "900")
)
WORKSPACE_RUNTIME_MAX_FILES: int = int(os.getenv("WORKSPACE_RUNTIME_MAX_FILES", "200"))
WORKSPACE_RUNTIME_MAX_BYTES: int = int(
    os.getenv("WORKSPACE_RUNTIME_MAX_BYTES", str(2 * 1024 * 1024))
)

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
