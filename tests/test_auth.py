"""
tests/test_auth.py
Tests for user registration and authentication.
"""
import pytest
from tests.conftest import unique_email


@pytest.mark.asyncio
async def test_register_user(client):
    email = unique_email("newuser")
    resp = await client.post(
        "/users/",
        json={"email": email, "password": "secure123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == email
    assert data["is_active"] is True
    assert "id" in data
    assert "hashed_password" not in data   # never leak the hash


@pytest.mark.asyncio
async def test_register_duplicate_email(client, registered_user):
    resp = await client.post("/users/", json=registered_user)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_short_password(client):
    resp = await client.post(
        "/users/",
        json={"email": unique_email("short"), "password": "abc"},
    )
    assert resp.status_code == 422   # Pydantic validation error


@pytest.mark.asyncio
async def test_login_success(client, registered_user):
    resp = await client.post(
        "/auth/login",
        data={
            "username": registered_user["email"],
            "password": registered_user["password"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client, registered_user):
    resp = await client.post(
        "/auth/login",
        data={"username": registered_user["email"], "password": "wrongpass"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    resp = await client.post(
        "/auth/login",
        data={"username": "nobody@example.com", "password": "whatever"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_me(client, auth_headers, registered_user):
    resp = await client.get("/users/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == registered_user["email"]


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client):
    resp = await client.get("/users/me")
    assert resp.status_code == 401