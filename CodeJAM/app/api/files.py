"""
app/api/files.py
File management within a project.

Endpoints:
  POST   /projects/{id}/files          — create a new file (owner or editor)
  GET    /projects/{id}/files          — list all files in the project (any access)
  GET    /projects/{id}/files/{fid}    — get a single file (any access)
  PUT    /projects/{id}/files/{fid}    — update file content (owner or editor)
  PATCH  /projects/{id}/files/{fid}    — rename a file (owner or editor)
  DELETE /projects/{id}/files/{fid}    — delete a file (owner or editor)
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.api.permissions import require_edit_access, require_view_access
from app.db import get_db
from app.models.files import File
from app.models.projects import Project
from app.models.user import User
from app.schemas.files import FileCreate, FileRename, FileResponse, FileUpdate

router = APIRouter(
    prefix="/projects/{project_id}/files",
    tags=["Files"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_file_or_404(file_id: UUID, project_id: UUID, db: AsyncSession) -> File:
    result = await db.execute(
        select(File).where(
            File.id == file_id,
            File.project_id == project_id,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f


# ── POST / — Create file ──────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=FileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new file in a project (owner or editor)",
)
async def create_file(
    project_id: UUID,
    data: FileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_edit_access),
) -> FileResponse:
    # Validate parent_id if provided
    if data.parent_id:
        await _get_file_or_404(data.parent_id, project_id, db)

    f = File(
        project_id=project_id,
        parent_id=data.parent_id,
        name=data.name,
        language=data.language,
        content=data.content,
    )
    db.add(f)
    await db.commit()
    await db.refresh(f)
    return f


# ── GET / — List files ────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[FileResponse],
    summary="List all files in a project (any access level)",
)
async def list_files(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_view_access),
) -> list[FileResponse]:
    result = await db.execute(
        select(File).where(File.project_id == project_id)
    )
    return result.scalars().all()


# ── GET /{file_id} — Get single file ─────────────────────────────────────────

@router.get(
    "/{file_id}",
    response_model=FileResponse,
    summary="Get a single file (any access level)",
)
async def get_file(
    project_id: UUID,
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_view_access),
) -> FileResponse:
    return await _get_file_or_404(file_id, project_id, db)


# ── PUT /{file_id} — Update content ──────────────────────────────────────────

@router.put(
    "/{file_id}",
    response_model=FileResponse,
    summary="Replace a file's content (owner or editor)",
)
async def update_file_content(
    project_id: UUID,
    file_id: UUID,
    data: FileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_edit_access),
) -> FileResponse:
    f = await _get_file_or_404(file_id, project_id, db)
    f.content = data.content
    await db.commit()
    await db.refresh(f)
    return f


# ── PATCH /{file_id} — Rename ─────────────────────────────────────────────────

@router.patch(
    "/{file_id}",
    response_model=FileResponse,
    summary="Rename a file (owner or editor)",
)
async def rename_file(
    project_id: UUID,
    file_id: UUID,
    data: FileRename,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_edit_access),
) -> FileResponse:
    f = await _get_file_or_404(file_id, project_id, db)
    f.name = data.name
    await db.commit()
    await db.refresh(f)
    return f


# ── DELETE /{file_id} ─────────────────────────────────────────────────────────

@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a file (owner or editor)",
)
async def delete_file(
    project_id: UUID,
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_edit_access),
) -> None:
    f = await _get_file_or_404(file_id, project_id, db)
    await db.delete(f)
    await db.commit()