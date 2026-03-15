"""
tests/test_projects.py
Tests for project CRUD, sharing, soft-delete, and permissions.
"""
import pytest

PROJECT_PAYLOAD = {
    "name": "Test Project",
    "language": "python",
    "source_code": "print('hello')",
    "is_public": False,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def create_project(client, headers, payload=None):
    resp = await client.post("/projects/", json=payload or PROJECT_PAYLOAD, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_project(client, auth_headers):
    project = await create_project(client, auth_headers)
    assert project["name"] == "Test Project"
    assert project["language"] == "python"
    assert project["is_deleted"] is False


@pytest.mark.asyncio
async def test_create_project_unauthenticated(client):
    resp = await client.post("/projects/", json=PROJECT_PAYLOAD)
    assert resp.status_code == 401


# ── List ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_my_projects(client, auth_headers):
    await create_project(client, auth_headers)
    resp = await client.get("/projects/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


# ── Get single ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_project(client, auth_headers):
    project = await create_project(client, auth_headers)
    resp = await client.get(f"/projects/{project['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == project["id"]


@pytest.mark.asyncio
async def test_get_nonexistent_project(client, auth_headers):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"/projects/{fake_id}", headers=auth_headers)
    assert resp.status_code == 404


# ── Update metadata ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_project_metadata(client, auth_headers):
    project = await create_project(client, auth_headers)
    resp = await client.patch(
        f"/projects/{project['id']}",
        json={"name": "Renamed", "is_public": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Renamed"
    assert data["is_public"] is True


# ── Update code ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_code(client, auth_headers):
    project = await create_project(client, auth_headers)
    resp = await client.put(
        f"/projects/{project['id']}/code",
        json={"source_code": "print('updated')"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["source_code"] == "print('updated')"


# ── Public listing ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_public_projects_listing(client, auth_headers):
    await create_project(client, auth_headers, {**PROJECT_PAYLOAD, "is_public": True})
    resp = await client.get("/projects/public")   # no auth needed
    assert resp.status_code == 200
    assert any(p["is_public"] for p in resp.json())


# ── Share link ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_and_use_share_link(client, auth_headers):
    project = await create_project(client, auth_headers)
    pid = project["id"]

    # Generate link
    resp = await client.post(f"/projects/{pid}/share", headers=auth_headers)
    assert resp.status_code == 200
    share_data = resp.json()
    assert "share_url" in share_data
    share_id = share_data["share_id"]

    # View via link (no auth)
    resp = await client.get(f"/projects/share/{share_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Project"


@pytest.mark.asyncio
async def test_revoke_share_link(client, auth_headers):
    project = await create_project(client, auth_headers)
    pid = project["id"]

    await client.post(f"/projects/{pid}/share", headers=auth_headers)

    resp = await client.delete(f"/projects/{pid}/share", headers=auth_headers)
    assert resp.status_code == 204

    # Verify share link no longer works by re-generating would create a new one
    resp = await client.get(f"/projects/{pid}", headers=auth_headers)
    assert resp.json()["share_id"] is None


# ── Soft delete ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_soft_delete_project(client, auth_headers):
    project = await create_project(client, auth_headers)
    pid = project["id"]

    resp = await client.delete(f"/projects/{pid}", headers=auth_headers)
    assert resp.status_code == 204

    # Project should no longer appear in listing
    resp = await client.get("/projects/", headers=auth_headers)
    ids = [p["id"] for p in resp.json()]
    assert pid not in ids

    # Direct GET should 404
    resp = await client.get(f"/projects/{pid}", headers=auth_headers)
    assert resp.status_code == 404