from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.db import get_db
from app.models.integration_tokens import IntegrationToken
from app.models.user import User
from app.schemas.integrations import IntegrationStatus, IntegrationTokenSave
from app.services.token_store import encrypt_token

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("/status", response_model=list[IntegrationStatus])
async def integration_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[IntegrationStatus]:
    result = await db.execute(
        select(IntegrationToken.provider).where(IntegrationToken.user_id == current_user.id)
    )
    connected = set(result.scalars().all())
    return [
        IntegrationStatus(provider="github", connected="github" in connected),
        IntegrationStatus(provider="vercel", connected="vercel" in connected),
    ]


@router.put("/{provider}", response_model=IntegrationStatus)
async def save_integration_token(
    provider: str,
    body: IntegrationTokenSave,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntegrationStatus:
    if provider not in {"github", "vercel"} or body.provider != provider:
        raise HTTPException(status_code=400, detail="Unsupported integration provider")

    result = await db.execute(
        select(IntegrationToken).where(
            IntegrationToken.user_id == current_user.id,
            IntegrationToken.provider == provider,
        )
    )
    token_row = result.scalar_one_or_none()
    encrypted = encrypt_token(body.token)

    if token_row:
        token_row.encrypted_token = encrypted
    else:
        db.add(
            IntegrationToken(
                user_id=current_user.id,
                provider=provider,
                encrypted_token=encrypted,
            )
        )

    await db.commit()
    return IntegrationStatus(provider=provider, connected=True)


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration_token(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if provider not in {"github", "vercel"}:
        raise HTTPException(status_code=400, detail="Unsupported integration provider")

    result = await db.execute(
        select(IntegrationToken).where(
            IntegrationToken.user_id == current_user.id,
            IntegrationToken.provider == provider,
        )
    )
    token_row = result.scalar_one_or_none()
    if token_row:
        await db.delete(token_row)
        await db.commit()
