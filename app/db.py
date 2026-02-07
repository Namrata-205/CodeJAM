from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path
from dotenv import load_dotenv

# -------------------------------------------------------------------
# Database URL
# -------------------------------------------------------------------
env_path = Path(__file__).parent.parent / ".env"  # adjust path if needed
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable not set! "
        "Example: postgresql+asyncpg://user:password@host:port/dbname"
    )

# -------------------------------------------------------------------
# Create async engine
# -------------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    echo=True,          # logs SQL queries (turn off in prod)
    future=True,
)

# -------------------------------------------------------------------
# Async session factory
# -------------------------------------------------------------------
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# -------------------------------------------------------------------
# Base class for models
# -------------------------------------------------------------------
Base = declarative_base()

# -------------------------------------------------------------------
# Dependency for FastAPI routes
# -------------------------------------------------------------------
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

import app.models
