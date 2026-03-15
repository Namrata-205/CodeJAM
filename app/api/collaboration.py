"""
app/api/collaboration.py
Unified collaboration API under /projects/{project_id}/collaborators.

Endpoints:
  POST   /projects/{id}/collaborators          — invite by email (owner)
  GET    /projects/{id}/collaborators          — list collaborators (owner or collaborator)
  POST   /projects/{id}/collaborators/accept   — accept an invitation (invitee)
  PATCH  /projects/{id}/collaborators/{uid}    — change a collaborator's role (owner)
  DELETE /projects/{id}/collaborators/{uid}    — remove a collaborator (owner)
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.db import get_db
from app.models.collaborators import ProjectCollaborator
from app.models.projects import Project
from app.models.user import User
from app.schemas.collaboration import (
    ChangeRoleRequest,
    CollaboratorResponse,
    InviteRequest,
)

router = APIRouter(
    prefix="/projects/{project_id}/collaborators",
    tags=["Collaboration"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_project_or_404(project_id: UUID, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _get_collab_or_404(
    project_id: UUID, user_id: UUID, db: AsyncSession
) -> ProjectCollaborator:
    result = await db.execute(
        select(ProjectCollaborator).where(
            ProjectCollaborator.project_id == project_id,
            ProjectCollaborator.user_id == user_id,
        )
    )
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    return collab


# ── POST /invite ──────────────────────────────────────────────────────────────

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Invite a user to collaborate on this project (owner only)",
)
async def invite_collaborator(
    project_id: UUID,
    body: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    project = await _get_project_or_404(project_id, db)

    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can invite collaborators")

    # Resolve the invitee
    result = await db.execute(select(User).where(User.email == body.email))
    invitee = result.scalar_one_or_none()
    if not invitee:
        raise HTTPException(status_code=404, detail="No user found with that email address")

    if invitee.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot invite yourself")

    # Idempotency — if already a collaborator, return current state
    result = await db.execute(
        select(ProjectCollaborator).where(
            ProjectCollaborator.project_id == project_id,
            ProjectCollaborator.user_id == invitee.id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"message": f"{body.email} is already a collaborator", "role": existing.role}

    collab = ProjectCollaborator(
        project_id=project_id,
        user_id=invitee.id,
        role=body.role,
        invited_by=current_user.id,
        accepted=False,
    )
    db.add(collab)
    await db.commit()

    return {"message": f"{body.email} invited as {body.role}. Awaiting acceptance."}


# ── GET / — List collaborators ────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[CollaboratorResponse],
    summary="List all collaborators on this project (owner or any collaborator)",
)
async def list_collaborators(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CollaboratorResponse]:
    project = await _get_project_or_404(project_id, db)

    # Both the owner and any collaborator can see the list
    is_owner = project.user_id == current_user.id
    if not is_owner:
        result = await db.execute(
            select(ProjectCollaborator).where(
                ProjectCollaborator.project_id == project_id,
                ProjectCollaborator.user_id == current_user.id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You do not have access to this project")

    result = await db.execute(
        select(ProjectCollaborator, User.email)
        .join(User, User.id == ProjectCollaborator.user_id)
        .where(ProjectCollaborator.project_id == project_id)
    )
    rows = result.all()

    return [
        CollaboratorResponse(
            user_id=row.ProjectCollaborator.user_id,
            email=row.email,
            role=row.ProjectCollaborator.role,
            accepted=row.ProjectCollaborator.accepted,
            invited_by=row.ProjectCollaborator.invited_by,
            created_at=row.ProjectCollaborator.created_at,
        )
        for row in rows
    ]


# ── POST /accept — Invitee accepts invitation ─────────────────────────────────

@router.post(
    "/accept",
    summary="Accept a pending collaboration invitation for this project",
)
async def accept_invitation(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _get_project_or_404(project_id, db)

    collab = await _get_collab_or_404(project_id, current_user.id, db)

    if collab.accepted:
        return {"message": "Invitation already accepted"}

    collab.accepted = True
    await db.commit()

    return {"message": "Invitation accepted"}


# ── PATCH /{user_id} — Change a collaborator's role ──────────────────────────

@router.patch(
    "/{user_id}",
    response_model=CollaboratorResponse,
    summary="Change a collaborator's role (owner only)",
)
async def change_role(
    project_id: UUID,
    user_id: UUID,
    body: ChangeRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CollaboratorResponse:
    project = await _get_project_or_404(project_id, db)

    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can change roles")

    collab = await _get_collab_or_404(project_id, user_id, db)

    # Fetch the collaborator's email for the response
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    collab.role = body.role
    await db.commit()
    await db.refresh(collab)

    return CollaboratorResponse(
        user_id=collab.user_id,
        email=user.email,
        role=collab.role,
        accepted=collab.accepted,
        invited_by=collab.invited_by,
        created_at=collab.created_at,
    )


# ── DELETE /{user_id} — Remove a collaborator ────────────────────────────────

@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a collaborator from this project (owner only)",
)
async def remove_collaborator(
    project_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    project = await _get_project_or_404(project_id, db)

    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can remove collaborators")

    collab = await _get_collab_or_404(project_id, user_id, db)

    await db.delete(collab)
    await db.commit()