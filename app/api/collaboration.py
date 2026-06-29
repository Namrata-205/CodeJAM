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
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.db import get_db
from app.emailer import send_email
from app.models.collaborators import ProjectCollaborator
from app.models.projects import Project
from app.models.user import User
from app.schemas.collaboration import (
    ChangeRoleRequest,
    CollaboratorResponse,
    InviteRequest,
    InviteResponse,
)

# redirect_slashes=False prevents FastAPI from issuing a 307 when clients POST
# to /projects/{id}/collaborators (no trailing slash).  Without this flag,
# FastAPI sees the canonical path as ending in "/" and redirects bare-path
# requests — but the test client does not follow redirects, so every invite /
# list call returned 307 instead of the expected 2xx/4xx.
router = APIRouter(
    prefix="/projects/{project_id}/collaborators",
    tags=["Collaboration"],
    redirect_slashes=False,
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


def _build_accept_url(request: Request, project_id: UUID) -> str:
    from app.config import FRONTEND_URL

    origin = request.headers.get("origin") or FRONTEND_URL
    return f"{origin.rstrip('/')}/invite/{project_id}"


def _invite_email_text(project_name: str, role: str, accept_url: str) -> str:
    return (
        "You have been invited to collaborate on a CodeJam project.\n\n"
        f"Project: {project_name}\n"
        f"Role: {role}\n\n"
        f"Accept the invitation here:\n{accept_url}\n\n"
        "If you do not have a CodeJam account yet, create one using this same email address first."
    )


def _invite_response(
    email: str,
    project_name: str,
    role: str,
    accept_url: str,
    message: str,
    email_sent: bool = False,
    email_error: str | None = None,
) -> InviteResponse:
    subject = quote(f"CodeJam collaboration invite: {project_name}")
    body = quote(_invite_email_text(project_name, role, accept_url))
    return InviteResponse(
        message=message,
        role=role,
        accept_url=accept_url,
        mailto_url=f"mailto:{email}?subject={subject}&body={body}",
        email_sent=email_sent,
        email_error=email_error,
    )


# ── POST  — Invite collaborator ───────────────────────────────────────────────

@router.post(
    "",
    response_model=InviteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a user to collaborate on this project (owner only)",
)
async def invite_collaborator(
    project_id: UUID,
    body: InviteRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InviteResponse:
    project = await _get_project_or_404(project_id, db)

    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can invite collaborators")

    result = await db.execute(select(User).where(User.email == body.email))
    invitee = result.scalar_one_or_none()
    if not invitee:
        raise HTTPException(status_code=404, detail="No user found with that email address")

    if invitee.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot invite yourself")

    result = await db.execute(
        select(ProjectCollaborator).where(
            ProjectCollaborator.project_id == project_id,
            ProjectCollaborator.user_id == invitee.id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        accept_url = _build_accept_url(request, project_id)
        return _invite_response(
            body.email,
            project.name,
            existing.role,
            accept_url,
            f"{body.email} is already a collaborator",
        )

    collab = ProjectCollaborator(
        project_id=project_id,
        user_id=invitee.id,
        role=body.role,
        invited_by=current_user.id,
        accepted=False,
    )
    db.add(collab)
    await db.commit()

    accept_url = _build_accept_url(request, project_id)
    subject = f"CodeJam collaboration invite: {project.name}"
    body_text = _invite_email_text(project.name, body.role, accept_url)
    email_result = send_email(body.email, subject, body_text)
    return _invite_response(
        body.email,
        project.name,
        body.role,
        accept_url,
        f"{body.email} invited as {body.role}. Awaiting acceptance.",
        email_sent=email_result.sent,
        email_error=email_result.error,
    )


# ── GET  — List collaborators ─────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[CollaboratorResponse],
    summary="List all collaborators on this project (owner or any collaborator)",
)
async def list_collaborators(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CollaboratorResponse]:
    project = await _get_project_or_404(project_id, db)

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
