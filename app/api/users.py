# app/api/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, MAX_BCRYPT_LENGTH
from passlib.hash import bcrypt

router = APIRouter(prefix="/users", tags=["Users"])

# Create a new user
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Check if email already exists
        result = await db.execute(select(User).where(User.email == user.email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Truncate password if longer than bcrypt limit
        password_to_hash = user.password[:MAX_BCRYPT_LENGTH]
        hashed_password = bcrypt.hash(password_to_hash)

        db_user = User(
            email=user.email,
            hashed_password=hashed_password,
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user
    except Exception:
        await db.rollback()
        raise
