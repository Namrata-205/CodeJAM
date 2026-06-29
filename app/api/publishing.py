import base64
import re
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.api.permissions import require_owner
from app.db import get_db
from app.models.files import File
from app.models.integration_tokens import IntegrationToken
from app.models.projects import Project
from app.models.user import User
from app.schemas.publishing import (
    GitHubPushRequest,
    GitHubPushResponse,
    VercelDeployRequest,
    VercelDeployResponse,
)
from app.services.token_store import decrypt_token, encrypt_token

router = APIRouter(prefix="/projects/{project_id}", tags=["Publishing"])

MAX_EXPORT_FILES = 200
MAX_EXPORT_BYTES = 2 * 1024 * 1024


def _safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip()).strip("-._")
    return slug.lower() or "codejam-project"


def _safe_path_part(value: str) -> str:
    # Preserve case because imports such as ./App break on Vercel/Linux if App.jsx
    # becomes app.jsx. Only remove path separators and unsafe control characters.
    cleaned = re.sub(r'[\\/\x00-\x1f]+', "-", value.strip()).strip()
    return cleaned or "file"


def _build_export_paths(files: list[File], fallback_name: str, fallback_code: str) -> dict[str, str]:
    if not files:
        filename = "main.txt"
        if fallback_name:
            filename = _safe_slug(fallback_name) + ".txt"
        return {filename: fallback_code or ""}

    by_id = {str(file.id): file for file in files}
    paths: dict[str, str] = {}

    def resolve_path(file: File) -> str:
        parts = [file.name]
        parent_id = str(file.parent_id) if file.parent_id else None
        seen = {str(file.id)}
        while parent_id and parent_id in by_id and parent_id not in seen:
            parent = by_id[parent_id]
            parts.append(parent.name)
            seen.add(parent_id)
            parent_id = str(parent.parent_id) if parent.parent_id else None
        return "/".join(reversed([_safe_path_part(part) for part in parts if part]))

    for file in files:
        if file.language == "__folder__":
            continue
        path = resolve_path(file)
        if not path:
            continue
        paths[path] = file.content or ""

    if not paths:
        paths["README.md"] = f"# {fallback_name}\n\nCreated with CodeJam.\n"

    return paths


async def _get_saved_token(provider: str, user_id: UUID, db: AsyncSession) -> str | None:
    result = await db.execute(
        select(IntegrationToken).where(
            IntegrationToken.user_id == user_id,
            IntegrationToken.provider == provider,
        )
    )
    token_row = result.scalar_one_or_none()
    if not token_row:
        return None
    return decrypt_token(token_row.encrypted_token)


async def _save_token(provider: str, token: str, user_id: UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(IntegrationToken).where(
            IntegrationToken.user_id == user_id,
            IntegrationToken.provider == provider,
        )
    )
    token_row = result.scalar_one_or_none()
    encrypted = encrypt_token(token)
    if token_row:
        token_row.encrypted_token = encrypted
    else:
        db.add(
            IntegrationToken(
                user_id=user_id,
                provider=provider,
                encrypted_token=encrypted,
            )
        )
    await db.commit()


async def _resolve_token(
    provider: str,
    supplied_token: str | None,
    save_token: bool,
    user_id: UUID,
    db: AsyncSession,
) -> str:
    token = supplied_token.strip() if supplied_token else None
    if token and save_token:
        await _save_token(provider, token, user_id, db)
    if token:
        return token

    saved = await _get_saved_token(provider, user_id, db)
    if saved:
        return saved
    raise HTTPException(status_code=400, detail=f"Add a {provider.title()} token or save one in integrations first.")


def _validate_export(paths: dict[str, str]) -> None:
    total_bytes = sum(len(content.encode("utf-8")) for content in paths.values())
    if len(paths) > MAX_EXPORT_FILES:
        raise HTTPException(status_code=400, detail=f"Project has too many files to publish ({len(paths)}).")
    if total_bytes > MAX_EXPORT_BYTES:
        raise HTTPException(status_code=400, detail="Project is too large to publish from CodeJam.")


def _vercel_deployment_files(paths: dict[str, str]) -> dict[str, str]:
    """Return files with the Vercel app at deployment root.

    CodeJam's full-stack starter stores the deployable Vite app in frontend/.
    Vercel expects package.json at the deployment root for dependency install,
    otherwise builds can fail with "vite: command not found".
    """
    if "package.json" in paths:
        return paths

    frontend_prefix = "frontend/"
    if "frontend/package.json" in paths:
        return {
            path.removeprefix(frontend_prefix): content
            for path, content in paths.items()
            if path.startswith(frontend_prefix)
        }

    return paths


async def _get_owned_project_and_files(
    project_id: UUID,
    current_user: User,
    db: AsyncSession,
) -> tuple[Project, dict[str, str]]:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
            Project.is_deleted.is_(False),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files_result = await db.execute(select(File).where(File.project_id == project_id))
    paths = _build_export_paths(
        files_result.scalars().all(),
        project.name,
        project.source_code or "",
    )
    _validate_export(paths)
    return project, paths


async def _github_request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    token: str,
    **kwargs,
) -> httpx.Response:
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    response = await client.request(method, url, headers=headers, **kwargs)
    return response


@router.post("/github/push", response_model=GitHubPushResponse)
async def push_project_to_github(
    project_id: UUID,
    body: GitHubPushRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_owner),
) -> GitHubPushResponse:
    _project, paths = await _get_owned_project_and_files(project_id, current_user, db)
    token = await _resolve_token("github", body.token, body.save_token, current_user.id, db)
    repo = _safe_slug(body.repo)
    owner = body.owner.strip()
    branch = body.branch.strip()

    async with httpx.AsyncClient(timeout=30) as client:
        if body.create_repo:
            create_response = await _github_request(
                client,
                "POST",
                "https://api.github.com/user/repos",
                token,
                json={"name": repo, "private": body.private, "auto_init": True},
            )
            if create_response.status_code not in (201, 422):
                detail = create_response.json().get("message", "Could not create GitHub repository")
                raise HTTPException(status_code=create_response.status_code, detail=detail)

        for path, content in paths.items():
            contents_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
            existing = await _github_request(
                client,
                "GET",
                contents_url,
                token,
                params={"ref": branch},
            )
            sha = None
            if existing.status_code == 200:
                sha = existing.json().get("sha")
            elif existing.status_code != 404:
                detail = existing.json().get("message", f"Could not read {path} from GitHub")
                raise HTTPException(status_code=existing.status_code, detail=detail)

            payload = {
                "message": body.message,
                "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
                "branch": branch,
            }
            if sha:
                payload["sha"] = sha

            update = await _github_request(
                client,
                "PUT",
                contents_url,
                token,
                json=payload,
            )
            if update.status_code not in (200, 201):
                detail = update.json().get("message", f"Could not push {path} to GitHub")
                raise HTTPException(status_code=update.status_code, detail=detail)

    return GitHubPushResponse(
        repository_url=f"https://github.com/{owner}/{repo}",
        branch=branch,
        files_pushed=len(paths),
    )


@router.post("/vercel/deploy", response_model=VercelDeployResponse)
async def deploy_project_to_vercel(
    project_id: UUID,
    body: VercelDeployRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_owner),
) -> VercelDeployResponse:
    project, paths = await _get_owned_project_and_files(project_id, current_user, db)
    token = await _resolve_token("vercel", body.token, body.save_token, current_user.id, db)
    deployment_paths = _vercel_deployment_files(paths)
    project_name = _safe_slug(body.project_name or project.name)

    payload = {
        "name": project_name,
        "target": "production",
        "files": [
            {"file": path, "data": content}
            for path, content in deployment_paths.items()
        ],
        "projectSettings": {
            "framework": body.framework,
        },
    }
    params = {"teamId": body.team_id} if body.team_id else None
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.vercel.com/v13/deployments",
            headers=headers,
            params=params,
            json=payload,
        )

    if response.status_code not in (200, 201):
        detail = response.json().get("error", {}).get("message") or response.json().get("message", "Could not deploy to Vercel")
        raise HTTPException(status_code=response.status_code, detail=detail)

    data = response.json()
    deployment_url = data.get("url", "")
    if deployment_url and not deployment_url.startswith("http"):
        deployment_url = f"https://{deployment_url}"

    return VercelDeployResponse(
        deployment_url=deployment_url,
        deployment_id=data.get("id", ""),
        state=data.get("readyState") or data.get("state"),
    )
