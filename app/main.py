# app/main.py
from fastapi import FastAPI
from app.api import users, projects, auth

app = FastAPI(title="Code Playground API")

# Include routers
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(projects.router)
from app.api import execute
app.include_router(execute.router)


# Optional root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to Code Playground API!"}

