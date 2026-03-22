"""
tests/test_collaboration.py
Tests for invite, accept, change role, and remove collaborator flows.
"""
import pytest
from tests.conftest import unique_email


# ── Helpers ───────────────────────────────────────────────────────────────────

async def register_and_login(client, email, password="testpass123"):
    await client.post("/users/", json={"email": email, "password": password})
    resp = await client.post(
        "/auth/login", data={"username": email, "password": password}
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def create_project(client, headers):
    resp = await client.post(
        "/projects/",
        json={"name": "Collab Test", "language": "python", "source_code": ""},
        headers=headers,
    )
    return resp.json()["id"]


# ── Invite ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invite_collaborator(client, auth_headers):
    collab_email = unique_email("collab")
    await client.post("/users/", json={"email": collab_email, "password": "pass12345"})
    pid = await create_project(client, auth_headers)

    resp = await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": collab_email, "role": "editor"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert "invited" in resp.json()["message"]


@pytest.mark.asyncio
async def test_invite_nonexistent_user(client, auth_headers):
    pid = await create_project(client, auth_headers)
    resp = await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": unique_email("ghost"), "role": "viewer"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_invite_invalid_role(client, auth_headers):
    role_email = unique_email("role")
    await client.post("/users/", json={"email": role_email, "password": "pass12345"})
    pid = await create_project(client, auth_headers)
    resp = await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": role_email, "role": "superadmin"},
        headers=auth_headers,
    )
    assert resp.status_code == 422   # Pydantic validation error


@pytest.mark.asyncio
async def test_only_owner_can_invite(client, auth_headers):
    other_email = unique_email("other_inviter")
    target_email = unique_email("target")
    other_headers = await register_and_login(client, other_email)
    await client.post("/users/", json={"email": target_email, "password": "pass12345"})

    pid = await create_project(client, auth_headers)

    resp = await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": target_email, "role": "viewer"},
        headers=other_headers,
    )
    assert resp.status_code == 403


# ── Accept invite ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_accept_invitation(client, auth_headers):
    invitee_email = unique_email("invitee")
    invitee_headers = await register_and_login(client, invitee_email)
    pid = await create_project(client, auth_headers)

    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": invitee_email, "role": "viewer"},
        headers=auth_headers,
    )

    resp = await client.post(
        f"/projects/{pid}/collaborators/accept",
        headers=invitee_headers,
    )
    assert resp.status_code == 200
    assert "accepted" in resp.json()["message"]

@pytest.mark.asyncio
async def test_accepted_collaboration_shows_in_my_projects(client, auth_headers):
    invitee_email = unique_email("invitee2")
    invitee_headers = await register_and_login(client, invitee_email)
    pid = await create_project(client, auth_headers)

    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": invitee_email, "role": "viewer"},
        headers=auth_headers,
    )

    # before acceptance: should not be visible to invitee
    resp = await client.get(f"/projects/{pid}", headers=invitee_headers)
    assert resp.status_code == 404

    resp = await client.get("/projects/", headers=invitee_headers)
    assert resp.status_code == 200
    assert pid not in [p["id"] for p in resp.json()]

    # accept invitation
    await client.post(f"/projects/{pid}/collaborators/accept", headers=invitee_headers)

    # now invitee should be able to access it
    resp = await client.get(f"/projects/{pid}", headers=invitee_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == pid

    resp = await client.get("/projects/", headers=invitee_headers)
    assert resp.status_code == 200
    assert pid in [p["id"] for p in resp.json()]

# ── List collaborators ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_collaborators(client, auth_headers):
    list_email = unique_email("listcollab")
    await client.post("/users/", json={"email": list_email, "password": "pass12345"})
    pid = await create_project(client, auth_headers)
    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": list_email, "role": "viewer"},
        headers=auth_headers,
    )

    resp = await client.get(f"/projects/{pid}/collaborators", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
    emails = [c["email"] for c in resp.json()]
    assert list_email in emails


# ── Change role ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_change_collaborator_role(client, auth_headers):
    change_email = unique_email("changerole")
    resp = await client.post(
        "/users/", json={"email": change_email, "password": "pass12345"}
    )
    user_id = resp.json()["id"]
    pid = await create_project(client, auth_headers)

    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": change_email, "role": "viewer"},
        headers=auth_headers,
    )

    resp = await client.patch(
        f"/projects/{pid}/collaborators/{user_id}",
        json={"role": "editor"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "editor"


# ── Remove ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_remove_collaborator(client, auth_headers):
    remove_email = unique_email("removecollab")
    resp = await client.post(
        "/users/", json={"email": remove_email, "password": "pass12345"}
    )
    user_id = resp.json()["id"]
    pid = await create_project(client, auth_headers)

    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": remove_email, "role": "viewer"},
        headers=auth_headers,
    )

    resp = await client.delete(
        f"/projects/{pid}/collaborators/{user_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 204

    # Verify they're gone from the list
    resp = await client.get(f"/projects/{pid}/collaborators", headers=auth_headers)
    emails = [c["email"] for c in resp.json()]
    assert remove_email not in emails