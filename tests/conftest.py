"""
tests/conftest.py
Pytest fixtures shared across all test modules.
Uses an in-memory SQLite database (via aiosqlite) so no external DB is needed.

Key design decisions:
- Tables are created fresh before every test and dropped after (function scope).
  This guarantees a clean slate so no "Email already registered" collisions occur.
- unique_email() generates a UUID-based address for any fixture or test that
  needs to register a user, preventing cross-test interference.
"""
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app

# ── In-memory async SQLite ────────────────────────────────────────────────────
# A fresh file-based name per test run avoids any cross-engine state issues
# with aiosqlite's in-memory mode.
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

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


# ── Override get_db to use the test DB ───────────────────────────────────────
async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


# ── Create / drop tables around EACH individual test ─────────────────────────
# scope="function" (the default) means every test gets a completely empty DB.
# This prevents any "Email already registered" or stale-data failures.
@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Unique email helper ───────────────────────────────────────────────────────
def unique_email(prefix: str = "user") -> str:
    """Return a globally unique email address for use in tests."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"


# ── HTTP client ───────────────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


# ── Primary authenticated user ────────────────────────────────────────────────
@pytest_asyncio.fixture
async def registered_user(client):
    """Registers a fresh user per test and returns their credentials."""
    payload = {"email": unique_email("owner"), "password": "testpass123"}
    resp = await client.post("/users/", json=payload)
    assert resp.status_code == 201, resp.text
    return payload


@pytest_asyncio.fixture
async def auth_headers(client, registered_user):
    """Returns Authorization headers for the per-test registered user."""
    resp = await client.post(
        "/auth/login",
        data={
            "username": registered_user["email"],
            "password": registered_user["password"],
        },
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}