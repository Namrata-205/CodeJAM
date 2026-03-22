from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, collaboration, execute, files, projects, users

app = FastAPI(title="CodeJam API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your Vite dev server
    allow_credentials=True,
    allow_methods=["*"],    # ← this is what handles OPTIONS preflight
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(collaboration.router)
app.include_router(files.router)
app.include_router(execute.router)

# Optional root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to Code Playground API!"}

