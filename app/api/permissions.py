"""
app/api/permissions.py
Async permission-checking helpers used as FastAPI dependencies.

WHY we use Request to read project_id
--------------------------------------
If a dependency declares `project_id: UUID` as a plain parameter alongside
the route handler that also declares `project_id: UUID`, FastAPI's OpenAPI
generator sees two declarations of the same path parameter and gets confused —
it drops the field from the Swagger UI form entirely.

The clean fix is to read project_id directly from request.path_params inside
the dependency. FastAPI still resolves the value from the URL path correctly,
but there is only ONE declaration visible to the schema generator (the one on
the route handler), so Swagger renders all fields properly.
"""
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.db import get_db
from app.models.collaborators import ProjectCollaborator
from app.models.projects import Project
from app.models.user import User


# ---------------------------------------------------------------------------
# Core role resolver  (plain async function, not a dependency itself)
# ---------------------------------------------------------------------------

async def get_project_role(
    project_id: UUID,
    db: AsyncSession,
    user: User,
) -> str:
    """
    Returns "owner", "editor", or "viewer" for the given user on the project.
    Raises HTTP 404 if the project doesn't exist or is soft-deleted.
    Raises HTTP 403 if the user has no access at all.
    """
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id == user.id:
        return "owner"

    result = await db.execute(
        select(ProjectCollaborator).where(
            ProjectCollaborator.project_id == project_id,
            ProjectCollaborator.user_id == user.id,
            ProjectCollaborator.accepted.is_(True),
        )
    )
    collab = result.scalar_one_or_none()

    if collab is None:
        raise HTTPException(status_code=403, detail="You do not have access to this project")

    return collab.role


# ---------------------------------------------------------------------------
# Dependency factories  — read project_id from the URL path via Request
# ---------------------------------------------------------------------------

async def require_view_access(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> str:
    """Grants access to owners, editors, and viewers."""
    try:
        project_id = UUID(request.path_params.get("project_id"))
    except (KeyError, ValueError, TypeError) as e:
        # This should never happen if routes are configured correctly
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: project_id not found in path. Path params: {dict(request.path_params)}"
        )
    return await get_project_role(project_id, db, user)


async def require_edit_access(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> str:
    """Grants access to owners and editors only."""
    try:
        project_id = UUID(request.path_params.get("project_id"))
    except (KeyError, ValueError, TypeError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: project_id not found in path. Path params: {dict(request.path_params)}"
        )
    role = await get_project_role(project_id, db, user)
    if role not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="You only have view permission")
    return role


async def require_owner(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> str:
    """Grants access to the project owner only."""
    try:
        project_id = UUID(request.path_params.get("project_id"))
    except (KeyError, ValueError, TypeError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: project_id not found in path. Path params: {dict(request.path_params)}"
        )
    role = await get_project_role(project_id, db, user)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the project owner can perform this action")
    return role