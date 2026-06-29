from uuid import uuid4

import pytest

from app.api.dependencies import get_current_user
from app.main import app
from app.models.user import User


@pytest.mark.asyncio
async def test_react_fastapi_workspace_creates_starter_files(client):
    current_user = User(
        id=uuid4(),
        email="workspace-owner@example.com",
        hashed_password="not-used-in-this-test",
    )
    app.dependency_overrides[get_current_user] = lambda: current_user

    try:
        response = await client.post(
            "/projects/",
            json={
                "name": "Team workspace",
                "language": "react-fastapi",
                "template": "react-fastapi",
                "is_public": False,
            },
        )

        assert response.status_code == 201
        project_id = response.json()["id"]

        files_response = await client.get(f"/projects/{project_id}/files/")
        assert files_response.status_code == 200

        files = files_response.json()
        names = {file["name"] for file in files}
        assert {"frontend", "backend", "package.json", "main.py", "App.jsx"} <= names

        folders = {file["id"]: file["name"] for file in files if file["language"] == "__folder__"}
        app_file = next(file for file in files if file["name"] == "App.jsx")
        api_file = next(file for file in files if file["name"] == "main.py")
        assert folders[app_file["parent_id"]] == "src"
        assert folders[api_file["parent_id"]] == "backend"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
