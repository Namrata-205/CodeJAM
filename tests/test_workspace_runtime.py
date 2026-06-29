from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models.files import File
from app.workspace_runtime import RuntimeError, WorkspaceRuntimeManager


def test_materialize_preserves_nested_workspace_tree(tmp_path: Path):
    project_id = uuid4()
    frontend = File(id=uuid4(), project_id=project_id, name="frontend", language="__folder__")
    src = File(id=uuid4(), project_id=project_id, parent_id=frontend.id, name="src", language="__folder__")
    app_file = File(
        id=uuid4(), project_id=project_id, parent_id=src.id,
        name="App.jsx", language="javascript", content="export default null;",
    )
    manager = WorkspaceRuntimeManager(workspace_root=tmp_path / "runtimes")
    destination = tmp_path / "workspace"

    manager._materialize(destination, [frontend, src, app_file])

    assert (destination / "frontend" / "src" / "App.jsx").read_text() == "export default null;"


def test_materialize_rejects_path_traversal(tmp_path: Path):
    project_id = uuid4()
    unsafe_file = File(id=uuid4(), project_id=project_id, name="../secret.py", content="bad")
    manager = WorkspaceRuntimeManager(workspace_root=tmp_path / "runtimes")

    with pytest.raises(RuntimeError, match="path separators"):
        manager._materialize(tmp_path / "workspace", [unsafe_file])


def test_run_docker_publishes_preview_port(monkeypatch, tmp_path: Path):
    manager = WorkspaceRuntimeManager(workspace_root=tmp_path / "runtimes")
    runtime = SimpleNamespace(
        container_name="codejam-workspace-test",
        workspace_path=tmp_path / "workspace",
        port=None,
    )
    commands = []

    def fake_run(command, **kwargs):
        commands.append(command)
        if command[:2] == ["docker", "port"]:
            return SimpleNamespace(returncode=0, stdout="127.0.0.1:49152\n", stderr="")
        return SimpleNamespace(returncode=0, stdout="container-id\n", stderr="")

    monkeypatch.setattr("app.workspace_runtime.subprocess.run", fake_run)

    manager._run_docker(runtime)

    docker_run = commands[0]
    assert docker_run[docker_run.index("--network") + 1] == "bridge"
    assert "127.0.0.1::8000" in docker_run
    assert "/run:rw,exec,nosuid,size=256m,mode=1777" in docker_run
    assert runtime.port == 49152
