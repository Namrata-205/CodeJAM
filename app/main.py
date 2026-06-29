from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, collaboration, execute, files, integrations, projects, publishing, runtimes, users
from app.config import AUTO_CREATE_SQLITE_TABLES, CORS_ORIGINS, DATABASE_URL


async def create_local_sqlite_tables() -> None:
    if not AUTO_CREATE_SQLITE_TABLES or not DATABASE_URL.startswith("sqlite"):
        return

    import app.models  # noqa: F401  # Register all models with Base.metadata.
    from app.db import Base, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_local_sqlite_tables()
    yield


app = FastAPI(title="CodeJam API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(collaboration.router)
app.include_router(files.router)
app.include_router(execute.router)
app.include_router(runtimes.router)
app.include_router(publishing.router)
app.include_router(integrations.router)


@app.get("/")
async def root():
    return {"message": "Welcome to Code Playground API!"}
