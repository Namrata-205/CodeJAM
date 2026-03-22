"""
app/config.py
Single source-of-truth for all environment variables.
All other modules should import settings from here — never call os.getenv() directly.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=False, encoding='utf-8-sig')


class Settings(BaseSettings):
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Database
    database_url: str

    # Redis / RQ
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    # Code Execution
    execution_timeout: int = 10

    # Email (optional SMTP)
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_pass: str | None = None
    from_email: str | None = None

    # Supported languages
    supported_languages: list[str] = [
        "python",
        "javascript",
        "typescript",
        "java",
        "go",
        "rust",
        "c",
        "cpp",
    ]

    class Config:
        env_file = ENV_PATH
        env_file_encoding = "utf-8-sig"
        case_sensitive = False
        extra = "ignore"


# Create settings instance
settings = Settings()

# For backward compatibility, expose as module-level variables
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
DATABASE_URL = settings.database_url
REDIS_HOST = settings.redis_host
REDIS_PORT = settings.redis_port
REDIS_DB = settings.redis_db
EXECUTION_TIMEOUT = settings.execution_timeout
SUPPORTED_LANGUAGES = settings.supported_languages

SMTP_HOST = settings.smtp_host
SMTP_PORT = settings.smtp_port
SMTP_USER = settings.smtp_user
SMTP_PASS = settings.smtp_pass
FROM_EMAIL = settings.from_email