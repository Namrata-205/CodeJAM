"""
tests/conftest.py
Pytest fixtures shared across all test modules.
"""
import asyncio
import os
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Import ALL models before Base.metadata is used, so every table is registered.
import app.models  # noqa: F401  — registers User, Project, ProjectCollaborator, File
from app.db import Base, get_db
from app.main import app

# ── File-based SQLite (shared across connections in the same process) ─────────
TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_db.sqlite")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Override get_db to use the test engine ────────────────────────────────────
async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


# ── Session-level setup: clean up DB file at the end ─────────────────────────
@pytest.fixture(scope="session", autouse=True)
def cleanup_db_file():
    # Before all tests: remove any existing test DB
    if os.path.exists(TEST_DB_PATH):
        try:
            os.unlink(TEST_DB_PATH)
        except OSError:
            pass
    
    yield
    
    # After all tests: remove the test DB
    if os.path.exists(TEST_DB_PATH):
        try:
            os.unlink(TEST_DB_PATH)
        except OSError:
            pass


# ── Function-level: Create/drop tables for each test ─────────────────────────
@pytest_asyncio.fixture(scope="function", autouse=True)
async def reset_db():
    """
    Drop all tables, recreate them fresh before each test.
    This ensures complete isolation between tests.
    
    CRITICAL: This must complete BEFORE any test code runs.
    """
    # Ensure we're using the test engine
    async with test_engine.begin() as conn:
        # Drop all tables
        await conn.run_sync(Base.metadata.drop_all)
        # Create all tables fresh
        await conn.run_sync(Base.metadata.create_all)
    
    # Tables are now ready - yield to the test
    yield
    
    # After test completes, drop tables again for cleanliness
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Unique email helper ───────────────────────────────────────────────────────
def unique_email(prefix: str = "user") -> str:
    """Return a UUID-suffixed email address guaranteed to be unique per call."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"


# ── HTTP client ───────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="function")
async def client(reset_db):
    """
    HTTP client for testing the API.
    Depends on reset_db to ensure tables exist before making requests.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        timeout=30.0,
    ) as ac:
        yield ac


# ── Primary authenticated user (fresh per test) ───────────────────────────────
@pytest_asyncio.fixture(scope="function")
async def registered_user(client):
    """Registers a unique user for this test and returns their credentials."""
    payload = {"email": unique_email("owner"), "password": "testpass123"}
    resp = await client.post("/users/", json=payload)
    assert resp.status_code == 201, f"Failed to register user: {resp.text}"
    return payload


@pytest_asyncio.fixture(scope="function")
async def auth_headers(client, registered_user):
    """Returns Bearer Authorization headers for the per-test registered user."""
    resp = await client.post(
        "/auth/login",
        data={
            "username": registered_user["email"],
            "password": registered_user["password"],
        },
    )
    assert resp.status_code == 200, f"Failed to login: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}