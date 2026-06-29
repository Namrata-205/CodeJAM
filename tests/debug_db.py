"""
Debug script to verify the test database setup works correctly.
Run this before pytest to diagnose issues.
"""
import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

# Import models to register them
import app.models  # noqa
from app.db import Base

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_db.sqlite")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

print(f"Test DB path: {TEST_DB_PATH}")
print(f"Test DB URL: {TEST_DATABASE_URL}")

async def test_db_setup():
    print("\n1. Creating engine...")
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=True,  # Show SQL
        connect_args={"check_same_thread": False},
        poolclass=None,
    )
    
    print("\n2. Checking registered tables...")
    print(f"Tables in metadata: {list(Base.metadata.tables.keys())}")
    
    print("\n3. Creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("\n4. Verifying tables exist...")
    TestSessionLocal = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with TestSessionLocal() as session:
        # Try to query the users table
        result = await session.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = result.fetchall()
        print(f"Tables in database: {[t[0] for t in tables]}")
    
    print("\n5. Testing user creation...")
    from app.models.user import User
    from passlib.hash import bcrypt
    
    async with TestSessionLocal() as session:
        user = User(
            email="test@example.com",
            hashed_password=bcrypt.hash("testpass"),
            provider="local"
        )
        session.add(user)
        await session.commit()
        print(f"Created user: {user.email}")
    
    print("\n6. Testing user query...")
    from sqlalchemy import select
    async with TestSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Found {len(users)} user(s): {[u.email for u in users]}")
    
    print("\n7. Cleaning up...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()
    
    if os.path.exists(TEST_DB_PATH):
        os.unlink(TEST_DB_PATH)
    
    print("\n✅ All checks passed! Test database setup is working correctly.")

if __name__ == "__main__":
    asyncio.run(test_db_setup())