"""
app/api/projects.py
Full CRUD for projects, including:
  - Create / list owned / get single / soft-delete
  - Update metadata (name, description, language, is_public) — PATCH
  - Update source code — PUT /{id}/code  (owner or editor)
  - Public listing — GET /public
  - Public share-link view — GET /share/{share_id}  (no auth required)
  - Generate share link — POST /{id}/share
  - Revoke share link — DELETE /{id}/share
"""
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.api.permissions import get_project_role, require_edit_access, require_owner
from app.db import get_db
from app.models.collaborators import ProjectCollaborator
from app.models.files import File
from app.models.projects import Project
from app.models.user import User
from app.schemas.projects import (
    CodeUpdate,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    PublicProjectResponse,
    ShareLinkResponse,
)
from app.workspace_templates import get_template_files

router = APIRouter(prefix="/projects", tags=["Projects"])


def _project_response(project: Project, access_role: str) -> ProjectResponse:
    return ProjectResponse.model_validate(project).model_copy(
        update={"access_role": access_role}
    )


async def _copy_project_files(
    source_project_id: UUID,
    target_project_id: UUID,
    db: AsyncSession,
) -> None:
    result = await db.execute(
        select(File).where(File.project_id == source_project_id)
    )
    source_files = result.scalars().all()
    id_map: dict[UUID, File] = {}

    for source_file in source_files:
        if source_file.parent_id is not None:
            continue
        copied_file = File(
            project_id=target_project_id,
            parent_id=None,
            name=source_file.name,
            language=source_file.language,
            content=source_file.content,
        )
        db.add(copied_file)
        await db.flush()
        id_map[source_file.id] = copied_file

    pending_files = [file for file in source_files if file.parent_id is not None]
    while pending_files:
        copied_any = False
        remaining = []
        for source_file in pending_files:
            copied_parent = id_map.get(source_file.parent_id)
            if not copied_parent:
                remaining.append(source_file)
                continue
            copied_file = File(
                project_id=target_project_id,
                parent_id=copied_parent.id,
                name=source_file.name,
                language=source_file.language,
                content=source_file.content,
            )
            db.add(copied_file)
            await db.flush()
            id_map[source_file.id] = copied_file
            copied_any = True

        if not copied_any:
            # Defensive fallback for malformed trees with missing/cyclic parents.
            for source_file in remaining:
                copied_file = File(
                    project_id=target_project_id,
                    parent_id=None,
                    name=source_file.name,
                    language=source_file.language,
                    content=source_file.content,
                )
                db.add(copied_file)
                await db.flush()
                id_map[source_file.id] = copied_file
            break

        pending_files = remaining


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_accessible_project(
    project_id: UUID,
    current_user: User,
    db: AsyncSession,
) -> Project:
    """
    Return a project if the current user is its owner OR a collaborator.
    Raises 404 if the project does not exist / is soft-deleted.
    Raises 403 if the user has no access.
    """
    # Owner check
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()

    if project:
        return project

    # Collaborator check
    result = await db.execute(
        select(Project)
        .join(ProjectCollaborator, Project.id == ProjectCollaborator.project_id)
        .where(
            Project.id == project_id,
            ProjectCollaborator.user_id == current_user.id,
            ProjectCollaborator.accepted.is_(True),
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


# ── Create ────────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    project = Project(
        name=data.name,
        description=data.description,
        language=data.language,
        source_code=data.source_code,
        is_public=data.is_public,
        user_id=current_user.id,
    )
    db.add(project)
    await db.flush()

    template_files = get_template_files(data.template)
    folders: dict[tuple[str | None, str], File] = {}
    for template_file in template_files:
        if not template_file.is_folder:
            continue
        parent = folders.get((None, template_file.parent_name))
        folder = File(
            project_id=project.id,
            parent_id=parent.id if parent else None,
            name=template_file.name,
            language=template_file.language,
            content=template_file.content,
        )
        db.add(folder)
        await db.flush()
        folders[(template_file.parent_name, template_file.name)] = folder

    folders_by_name = {folder.name: folder for folder in folders.values()}

    for template_file in template_files:
        if template_file.is_folder:
            continue
        parent = folders_by_name.get(template_file.parent_name)
        db.add(
            File(
                project_id=project.id,
                parent_id=parent.id if parent else None,
                name=template_file.name,
                language=template_file.language,
                content=template_file.content,
            )
        )

    await db.commit()
    await db.refresh(project)
    return project


# ── List owned projects ───────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[ProjectResponse],
    summary="List projects owned by or shared with the current user",
)
async def list_my_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectResponse]:
    owned_result = await db.execute(
        select(Project).where(
            Project.user_id == current_user.id,
            Project.is_deleted.is_(False),
        )
    )
    projects = [
        _project_response(project, "owner")
        for project in owned_result.scalars().all()
    ]

    shared_result = await db.execute(
        select(Project, ProjectCollaborator.role)
        .join(ProjectCollaborator, Project.id == ProjectCollaborator.project_id)
        .where(
            ProjectCollaborator.user_id == current_user.id,
            ProjectCollaborator.accepted.is_(True),
            Project.is_deleted.is_(False),
        )
    )
    seen_ids = {project.id for project in projects}
    for project, role in shared_result.all():
        if project.id not in seen_ids:
            projects.append(_project_response(project, role))
            seen_ids.add(project.id)

    return projects


# ── List public projects ──────────────────────────────────────────────────────

@router.get(
    "/public",
    response_model=list[PublicProjectResponse],
    summary="Browse all publicly listed projects (no auth required)",
)
async def list_public_projects(
    db: AsyncSession = Depends(get_db),
) -> list[PublicProjectResponse]:
    result = await db.execute(
        select(Project).where(
            Project.is_public.is_(True),
            Project.is_deleted.is_(False),
        )
    )
    return result.scalars().all()


# ── View a project via share link (no auth) ───────────────────────────────────

@router.get(
    "/share/{share_id}",
    response_model=PublicProjectResponse,
    summary="View a project using its public share link (no auth required)",
)
async def view_shared_project(
    share_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> PublicProjectResponse:
    result = await db.execute(
        select(Project).where(
            Project.share_id == share_id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Shared project not found")
    return project


# ── Get single project (owner or collaborator) ────────────────────────────────

@router.post(
    "/public/{project_id}/copy",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Copy a public project into the current user's workspace",
)
async def copy_public_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.is_public.is_(True),
            Project.is_deleted.is_(False),
        )
    )
    source_project = result.scalar_one_or_none()
    if not source_project:
        raise HTTPException(status_code=404, detail="Public project not found")

    copied_project = Project(
        name=f"{source_project.name} (Copy)",
        description=source_project.description,
        language=source_project.language,
        source_code=source_project.source_code,
        is_public=False,
        user_id=current_user.id,
    )
    db.add(copied_project)
    await db.flush()
    await _copy_project_files(source_project.id, copied_project.id, db)
    await db.commit()
    await db.refresh(copied_project)
    return _project_response(copied_project, "owner")


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get a project by ID (must be owner or collaborator)",
)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    project = await _get_accessible_project(project_id, current_user, db)
    role = await get_project_role(project_id, db, current_user)
    return _project_response(project, role)


# ── Update metadata (name, description, language, is_public) ─────────────────

@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update project metadata (owner only)",
)
async def update_project_metadata(
    project_id: UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_owner),
) -> ProjectResponse:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


# ── Update source code (owner or editor) ─────────────────────────────────────

@router.put(
    "/{project_id}/code",
    response_model=ProjectResponse,
    summary="Replace the project's source code (owner or editor)",
)
async def update_code(
    project_id: UUID,
    data: CodeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_edit_access),
) -> ProjectResponse:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.source_code = data.source_code
    await db.commit()
    await db.refresh(project)
    return project


# ── Soft delete ───────────────────────────────────────────────────────────────

@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a project (owner only)",
)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_owner),
) -> None:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_deleted = True
    await db.commit()


# ── Generate share link ───────────────────────────────────────────────────────

@router.post(
    "/{project_id}/share",
    response_model=ShareLinkResponse,
    summary="Generate a public share link for a project (owner only)",
)
async def generate_share_link(
    project_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_owner),
) -> ShareLinkResponse:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.share_id:
        project.share_id = uuid4()
        project.is_public = True
        await db.commit()
        await db.refresh(project)

    share_url = str(request.base_url) + f"projects/share/{project.share_id}"
    return ShareLinkResponse(share_url=share_url, share_id=project.share_id)


# ── Revoke share link ─────────────────────────────────────────────────────────

@router.delete(
    "/{project_id}/share",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a project's public share link (owner only)",
)
async def revoke_share_link(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_owner),
) -> None:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.share_id = None
    project.is_public = False
    await db.commit()
