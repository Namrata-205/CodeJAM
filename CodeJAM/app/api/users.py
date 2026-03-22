"""
app/api/users.py
User registration and profile endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.hash import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


# ---------------------------------------------------------------------------
# POST /users/  —  Register a new account
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    responses={
        400: {"description": "Email already registered"},
    },
)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Create a new local (email + password) user account.
    The password is hashed with bcrypt before storage; it is never stored in plain text.
    """
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    db_user = User(
        email=user.email,
        hashed_password=bcrypt.hash(user.password),
        provider="local",
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


# ---------------------------------------------------------------------------
# GET /users/me  —  Return the current user's profile
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user's profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Returns the profile of the user whose Bearer token is presented."""
    return current_user