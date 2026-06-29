"""Starter file trees for browser-based CodeJam workspaces."""

from dataclasses import dataclass


FULL_STACK_TEMPLATE = "react-fastapi"


@dataclass(frozen=True)
class WorkspaceFile:
    name: str
    language: str
    content: str
    parent_name: str | None = None
    is_folder: bool = False


REACT_FASTAPI_FILES: tuple[WorkspaceFile, ...] = (
    WorkspaceFile("frontend", "__folder__", "", is_folder=True),
    WorkspaceFile("backend", "__folder__", "", is_folder=True),
    WorkspaceFile(
        "package.json",
        "json",
        """{
  "name": "codejam-workspace",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {}
}
""",
        "frontend",
    ),
    WorkspaceFile(
        "index.html",
        "html",
        """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeJam Workspace</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
""",
        "frontend",
    ),
    WorkspaceFile("src", "__folder__", "", "frontend", is_folder=True),
    WorkspaceFile(
        "main.jsx",
        "javascript",
        """import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
""",
        "src",
    ),
    WorkspaceFile(
        "App.jsx",
        "javascript",
        """import React, { useEffect, useState } from "react";

export default function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("health")
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Backend is not running yet."));
  }, []);

  return (
    <main>
      <p className="eyebrow">React + FastAPI</p>
      <h1>Build together in the browser.</h1>
      <p>{message}</p>
    </main>
  );
}
""",
        "src",
    ),
    WorkspaceFile(
        "styles.css",
        "css",
        """* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
main { max-width: 720px; margin: 0 auto; padding: 96px 24px; }
.eyebrow { color: #0f766e; font-weight: 700; text-transform: uppercase; }
h1 { font-size: 48px; margin: 12px 0; }
""",
        "src",
    ),
    WorkspaceFile(
        "requirements.txt",
        "text",
        "fastapi>=0.111.0\nuvicorn[standard]>=0.29.0\n",
        "backend",
    ),
    WorkspaceFile(
        "main.py",
        "python",
        """from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="CodeJam Workspace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"message": "FastAPI is ready."}


@app.get("/api/greeting")
async def greeting() -> dict[str, str]:
    return {"message": "Hello from FastAPI."}


frontend_dist = Path(__file__).parent / "frontend_dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
""",
        "backend",
    ),
    WorkspaceFile(
        "README.md",
        "markdown",
        """# React + FastAPI Workspace

Frontend: `frontend/`
Backend: `backend/`

This starter runs as one preview service in CodeJam. The React application is
built and served by FastAPI, so frontend requests can use relative API paths.
""",
    ),
)


def get_template_files(template: str | None) -> tuple[WorkspaceFile, ...]:
    if template == FULL_STACK_TEMPLATE:
        return REACT_FASTAPI_FILES
    return ()
