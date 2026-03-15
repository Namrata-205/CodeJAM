"""
tests/test_permissions.py
Tests that role-based access control is enforced consistently:
  - viewers cannot edit code
  - non-members cannot access private projects
  - editors can update code but not project metadata
"""
import pytest
from tests.conftest import unique_email


async def register_and_login(client, email, password="testpass123"):
    await client.post("/users/", json={"email": email, "password": password})
    resp = await client.post(
        "/auth/login", data={"username": email, "password": password}
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_viewer_cannot_edit_code(client, auth_headers):
    """A collaborator with role=viewer must not be allowed to update source code."""
    viewer_email = unique_email("viewer_perm")
    viewer_headers = await register_and_login(client, viewer_email)

    proj_resp = await client.post(
        "/projects/",
        json={"name": "Perm Test", "language": "python", "source_code": "x=1"},
        headers=auth_headers,
    )
    pid = proj_resp.json()["id"]

    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": viewer_email, "role": "viewer"},
        headers=auth_headers,
    )

    resp = await client.put(
        f"/projects/{pid}/code",
        json={"source_code": "x=2"},
        headers=viewer_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_editor_can_edit_code(client, auth_headers):
    """A collaborator with role=editor must be allowed to update source code."""
    editor_email = unique_email("editor_perm")
    editor_headers = await register_and_login(client, editor_email)

    proj_resp = await client.post(
        "/projects/",
        json={"name": "Editor Test", "language": "python", "source_code": "x=1"},
        headers=auth_headers,
    )
    pid = proj_resp.json()["id"]

    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": editor_email, "role": "editor"},
        headers=auth_headers,
    )

    resp = await client.put(
        f"/projects/{pid}/code",
        json={"source_code": "x=99"},
        headers=editor_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["source_code"] == "x=99"


@pytest.mark.asyncio
async def test_editor_cannot_update_metadata(client, auth_headers):
    """Only owners can update project metadata (name, language, etc.)."""
    editor_email = unique_email("editor_meta")
    editor_headers = await register_and_login(client, editor_email)

    proj_resp = await client.post(
        "/projects/",
        json={"name": "Meta Test", "language": "python", "source_code": ""},
        headers=auth_headers,
    )
    pid = proj_resp.json()["id"]

    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": editor_email, "role": "editor"},
        headers=auth_headers,
    )

    resp = await client.patch(
        f"/projects/{pid}",
        json={"name": "Hijacked"},
        headers=editor_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_member_cannot_access_private_project(client, auth_headers):
    """A user with no relation to a private project must get 404."""
    stranger_email = unique_email("stranger")
    stranger_headers = await register_and_login(client, stranger_email)

    proj_resp = await client.post(
        "/projects/",
        json={"name": "Private", "language": "python", "source_code": "", "is_public": False},
        headers=auth_headers,
    )
    pid = proj_resp.json()["id"]

    resp = await client.get(f"/projects/{pid}", headers=stranger_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_only_owner_can_delete(client, auth_headers):
    """A collaborator (even editor) must not be allowed to delete the project."""
    editor_email = unique_email("editor_del")
    editor_headers = await register_and_login(client, editor_email)

    proj_resp = await client.post(
        "/projects/",
        json={"name": "Del Test", "language": "python", "source_code": ""},
        headers=auth_headers,
    )
    pid = proj_resp.json()["id"]

    await client.post(
        f"/projects/{pid}/collaborators",
        json={"email": editor_email, "role": "editor"},
        headers=auth_headers,
    )

    resp = await client.delete(f"/projects/{pid}", headers=editor_headers)
    assert resp.status_code == 403