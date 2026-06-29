"""Endpoints for running supported browser workspaces in disposable containers."""
import asyncio
import hmac
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.api.permissions import require_edit_access, require_view_access
from app.db import get_db
from app.models.files import File
from app.models.projects import Project
from app.models.user import User
from app.schemas.runtimes import RuntimeResponse, RuntimeStartResponse
from app.workspace_runtime import WorkspaceRuntime, runtime_manager

router = APIRouter(prefix="/projects/{project_id}/runtime", tags=["Workspace Runtime"])


def _response(runtime: WorkspaceRuntime, request: Request, include_preview: bool = False) -> RuntimeResponse:
    preview_url = None
    if include_preview and runtime.status == "running":
        preview_url = str(request.base_url).rstrip("/") + (
            f"/projects/{runtime.project_id}/runtime/{runtime.id}/preview/{runtime.preview_token}/"
        )
    return RuntimeResponse(
        id=runtime.id,
        project_id=runtime.project_id,
        status=runtime.status,
        preview_url=preview_url,
        expires_at=runtime.expires_at,
        error=runtime.error,
    )


async def _repair_react_fastapi_workspace(project_id: UUID, db: AsyncSession) -> None:
    files = (
        await db.execute(select(File).where(File.project_id == project_id))
    ).scalars().all()
    by_id = {file.id: file for file in files}

    frontend = next(
        (
            file for file in files
            if file.name == "frontend" and file.language == "__folder__" and file.parent_id is None
        ),
        None,
    )
    if frontend is None:
        return

    src = next(
        (
            file for file in files
            if file.name == "src" and file.language == "__folder__" and file.parent_id == frontend.id
        ),
        None,
    )
    root_src = next(
        (
            file for file in files
            if file.name == "src" and file.language == "__folder__" and file.parent_id is None
        ),
        None,
    )
    if src is None and root_src is not None:
        root_src.parent_id = frontend.id
        src = root_src
    if src is None:
        src = File(
            project_id=project_id,
            parent_id=frontend.id,
            name="src",
            language="__folder__",
            content="",
        )
        db.add(src)
        await db.flush()

    expected_src_files = {"main.jsx", "App.jsx", "styles.css"}
    existing_src_names = {
        file.name for file in files
        if file.parent_id == src.id and file.name in expected_src_files
    }
    for file in list(files):
        parent_is_missing = file.parent_id is not None and file.parent_id not in by_id
        if not parent_is_missing or file.name not in expected_src_files:
            continue
        if file.name in existing_src_names:
            await db.delete(file)
        else:
            file.parent_id = src.id
            existing_src_names.add(file.name)

    await db.commit()


@router.post("/", response_model=RuntimeStartResponse, status_code=status.HTTP_201_CREATED)
async def start_runtime(
    project_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_edit_access),
) -> RuntimeStartResponse:
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if project is None or project.language != "react-fastapi":
        raise HTTPException(status_code=400, detail="Only React + FastAPI workspaces can be previewed.")
    await _repair_react_fastapi_workspace(project_id, db)
    files = (await db.execute(select(File).where(File.project_id == project_id))).scalars().all()
    runtime = await asyncio.to_thread(runtime_manager.start, project_id, list(files))
    return RuntimeStartResponse(**_response(runtime, request, include_preview=True).model_dump())


@router.get("/{runtime_id}", response_model=RuntimeResponse)
async def get_runtime(
    project_id: UUID,
    runtime_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    _role: str = Depends(require_view_access),
) -> RuntimeResponse:
    runtime = runtime_manager.get(runtime_id)
    if runtime is None or runtime.project_id != project_id:
        raise HTTPException(status_code=404, detail="Preview not found")
    return _response(runtime, request)


@router.delete("/{runtime_id}", response_model=RuntimeResponse)
async def stop_runtime(
    project_id: UUID,
    runtime_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    _role: str = Depends(require_edit_access),
) -> RuntimeResponse:
    runtime = runtime_manager.get(runtime_id)
    if runtime is None or runtime.project_id != project_id:
        raise HTTPException(status_code=404, detail="Preview not found")
    stopped = await asyncio.to_thread(runtime_manager.stop, runtime_id)
    return _response(stopped, request)


@router.api_route(
    "/{runtime_id}/preview/{token}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    include_in_schema=False,
)
async def preview_proxy(
    project_id: UUID,
    runtime_id: UUID,
    path: str,
    token: str,
    request: Request,
) -> Response:
    runtime = runtime_manager.get(runtime_id)
    if (
        runtime is None or runtime.project_id != project_id or runtime.status != "running"
        or not hmac.compare_digest(token, runtime.preview_token)
        or runtime.port is None
    ):
        raise HTTPException(status_code=404, detail="Preview not found")
    try:
        body = await request.body()
        forwarded_headers = {
            key: value for key, value in request.headers.items()
            if key.lower() in {"content-type", "accept"}
        }
        async with httpx.AsyncClient(timeout=15) as client:
            upstream = await client.request(
                request.method,
                f"http://127.0.0.1:{runtime.port}/{path.lstrip('/')}",
                content=body,
                headers=forwarded_headers,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Preview service is unavailable") from exc
    headers = {
        key: value for key, value in upstream.headers.items()
        if key.lower() in {"content-type", "cache-control"}
    }
    return Response(content=upstream.content, status_code=upstream.status_code, headers=headers)
