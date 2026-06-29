"""Lifecycle manager for short-lived React + FastAPI preview containers."""
import secrets
import shutil
import subprocess
import tempfile
import time
from http.client import RemoteDisconnected
from urllib.error import URLError
from urllib.request import urlopen
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID, uuid4

from app.config import (
    WORKSPACE_RUNTIME_IMAGE,
    WORKSPACE_RUNTIME_MAX_BYTES,
    WORKSPACE_RUNTIME_MAX_FILES,
    WORKSPACE_RUNTIME_TTL_SECONDS,
)
from app.models.files import File


class RuntimeError(Exception):
    """Expected preview-start failures that can be returned to the client."""


@dataclass
class WorkspaceRuntime:
    id: UUID
    project_id: UUID
    container_name: str
    workspace_path: Path
    preview_token: str
    created_at: datetime
    expires_at: datetime
    status: str = "starting"
    port: int | None = None
    error: str | None = None


class WorkspaceRuntimeManager:
    """Materializes project files and manages their isolated Docker container."""

    def __init__(self, workspace_root: Path | None = None) -> None:
        self.workspace_root = workspace_root or Path(tempfile.gettempdir()) / "codejam-runtimes"
        self.runtimes: dict[UUID, WorkspaceRuntime] = {}
        self.project_runtimes: dict[UUID, UUID] = {}

    def start(self, project_id: UUID, files: list[File]) -> WorkspaceRuntime:
        self.cleanup_expired()
        previous_id = self.project_runtimes.get(project_id)
        if previous_id:
            self.stop(previous_id)

        runtime_id = uuid4()
        runtime = WorkspaceRuntime(
            id=runtime_id,
            project_id=project_id,
            container_name=f"codejam-workspace-{runtime_id.hex}",
            workspace_path=self.workspace_root / str(runtime_id),
            preview_token=secrets.token_urlsafe(24),
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(seconds=WORKSPACE_RUNTIME_TTL_SECONDS),
        )
        self.runtimes[runtime_id] = runtime
        self.project_runtimes[project_id] = runtime_id
        try:
            self._materialize(runtime.workspace_path, files)
            self._run_docker(runtime)
            self._wait_until_ready(runtime)
            runtime.status = "running"
        except RuntimeError as exc:
            runtime.status = "failed"
            runtime.error = str(exc)
            self._remove_container(runtime)
            self._remove_workspace(runtime)
        return runtime

    def stop(self, runtime_id: UUID) -> WorkspaceRuntime | None:
        runtime = self.runtimes.get(runtime_id)
        if runtime is None:
            return None
        if runtime.status in {"running", "starting"}:
            self._remove_container(runtime)
        if runtime.status != "failed":
            runtime.status = "stopped"
        self._remove_workspace(runtime)
        if self.project_runtimes.get(runtime.project_id) == runtime.id:
            del self.project_runtimes[runtime.project_id]
        return runtime

    def get(self, runtime_id: UUID) -> WorkspaceRuntime | None:
        self.cleanup_expired()
        return self.runtimes.get(runtime_id)

    def cleanup_expired(self) -> None:
        now = datetime.now(UTC)
        for runtime in list(self.runtimes.values()):
            if runtime.status in {"running", "starting"} and runtime.expires_at <= now:
                self.stop(runtime.id)
                runtime.status = "expired"

    def _materialize(self, root: Path, files: list[File]) -> None:
        if len(files) > WORKSPACE_RUNTIME_MAX_FILES:
            raise RuntimeError("This workspace has too many files to preview.")
        total_bytes = sum(len((file.content or "").encode("utf-8")) for file in files)
        if total_bytes > WORKSPACE_RUNTIME_MAX_BYTES:
            raise RuntimeError("This workspace is too large to preview.")

        by_id = {file.id: file for file in files}
        root.mkdir(parents=True, exist_ok=False)
        for file in files:
            destination = root / self._relative_path(file, by_id)
            if file.language == "__folder__":
                destination.mkdir(parents=True, exist_ok=True)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_text(file.content or "", encoding="utf-8")

    def _relative_path(self, file: File, by_id: dict[UUID, File]) -> Path:
        parts = [self._safe_name(file.name)]
        parent_id = file.parent_id
        visited = {file.id}
        while parent_id is not None:
            if parent_id in visited or parent_id not in by_id:
                raise RuntimeError("The workspace file tree is invalid.")
            visited.add(parent_id)
            parent = by_id[parent_id]
            parts.append(self._safe_name(parent.name))
            parent_id = parent.parent_id
        return Path(*reversed(parts))

    @staticmethod
    def _safe_name(name: str) -> str:
        if not name or name in {".", ".."} or "/" in name or "\\" in name:
            raise RuntimeError("Workspace file names cannot contain path separators.")
        return name

    def _run_docker(self, runtime: WorkspaceRuntime) -> None:
        try:
            result = subprocess.run(
                [
                    "docker", "run", "--detach", "--name", runtime.container_name,
                    "--network", "bridge", "--read-only", "--cap-drop", "ALL",
                    "--security-opt", "no-new-privileges", "--pids-limit", "128",
                    "--memory", "512m", "--cpus", "1.0",
                    "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
                    "--tmpfs", "/run:rw,exec,nosuid,size=256m,mode=1777",
                    "--publish", "127.0.0.1::8000",
                    "--volume", f"{runtime.workspace_path.resolve()}:/workspace:ro",
                    WORKSPACE_RUNTIME_IMAGE,
                ],
                capture_output=True, text=True, check=False, timeout=30,
            )
        except FileNotFoundError as exc:
            raise RuntimeError("Docker is not installed on the CodeJam server.") from exc
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("The preview container took too long to start.") from exc
        if result.returncode != 0:
            raise RuntimeError((result.stderr or "Unable to start preview container.").strip())

        inspect = None
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            inspect = subprocess.run(
                ["docker", "port", runtime.container_name, "8000/tcp"],
                capture_output=True, text=True, check=False, timeout=10,
            )
            if inspect.returncode == 0 and inspect.stdout.strip():
                break
            time.sleep(0.25)

        if inspect is None or inspect.returncode != 0 or not inspect.stdout.strip():
            logs = self._container_logs(runtime.container_name)
            if logs:
                raise RuntimeError(f"Preview container exited before exposing a port:\n{logs}")
            raise RuntimeError("Preview container started without an exposed port.")
        try:
            runtime.port = int(inspect.stdout.strip().rsplit(":", 1)[1])
        except ValueError as exc:
            raise RuntimeError("Could not determine the preview port.") from exc

    @staticmethod
    def _container_logs(container_name: str) -> str:
        try:
            result = subprocess.run(
                ["docker", "logs", "--tail", "80", container_name],
                capture_output=True, text=True, check=False, timeout=10,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return ""
        return (result.stderr or result.stdout).strip()

    @staticmethod
    def _wait_until_ready(runtime: WorkspaceRuntime) -> None:
        if runtime.port is None:
            raise RuntimeError("Preview container did not expose a port.")
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            try:
                with urlopen(f"http://127.0.0.1:{runtime.port}/health", timeout=2) as response:
                    if response.status == 200:
                        return
            except (RemoteDisconnected, URLError, TimeoutError):
                time.sleep(0.5)
        raise RuntimeError("Preview service did not become ready in time.")

    @staticmethod
    def _remove_container(runtime: WorkspaceRuntime) -> None:
        try:
            subprocess.run(
                ["docker", "rm", "--force", runtime.container_name],
                capture_output=True, text=True, check=False, timeout=15,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

    @staticmethod
    def _remove_workspace(runtime: WorkspaceRuntime) -> None:
        shutil.rmtree(runtime.workspace_path, ignore_errors=True)


runtime_manager = WorkspaceRuntimeManager()
