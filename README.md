# CodeJam - Browser-Based Code Playground

CodeJam is a full-stack collaborative code playground built especially for students who want to create projects quickly without spending too much time on setup. With AI tools, students can generate code and ideas faster than ever, but installing runtimes, configuring environments, and connecting project files still takes time. CodeJam reduces that friction by letting users write, execute, save, and share code projects directly from the browser.

It uses a FastAPI backend, a React/Vite frontend, PostgreSQL for data, and Redis/RQ for background code execution jobs.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Project Overview

Students often have good ideas but lose time setting up tools, installing packages, creating folders, configuring editors, and debugging environment issues before they can actually build. CodeJam gives them a ready-to-use browser-based workspace where they can create projects, test code, manage files, and collaborate.

The goal is simple: help students move from idea to working project faster.

This is useful for:

- Students learning programming for the first time
- Hackathon teams building quick prototypes
- AI-assisted project creation
- Classroom demos and assignments
- Sharing working code examples without asking others to install anything locally

## Features

- Multi-language project support
- User registration and JWT-based login
- Project create, update, delete, share, and invite flows
- Owner/editor/viewer collaboration roles
- File and folder management inside projects
- Sandboxed backend code execution
- Redis/RQ background job queue
- FastAPI Swagger docs for direct backend testing
- React/Vite frontend with Monaco editor-style code editing
- Token-based publishing flow for GitHub and Vercel

## Tech Stack

| Layer | Tools |
| --- | --- |
| Backend | FastAPI, SQLAlchemy, Alembic, Pydantic |
| Frontend | React, Vite, Tailwind CSS, Monaco Editor |
| Database | PostgreSQL |
| Queue | Redis, RQ |
| Testing | pytest, pytest-asyncio, httpx |

## Architecture

```text
React Frontend
      |
      v
FastAPI Backend
      |
      +----> PostgreSQL Database
      |
      +----> Redis Queue ----> RQ Worker / Code Runner
```

## Prerequisites

Install these before running the project:

- Python 3.11+
- Node.js 18+
- npm
- PostgreSQL 16+
- Redis 7+
- Docker Desktop, optional but useful

## Backend Setup

From the project root:

```bash
python -m venv venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1
```

```bash
# macOS/Linux
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

Example backend environment:

```env
SECRET_KEY=replace-this-with-a-secure-secret-key
DATABASE_URL=postgresql+asyncpg://codejam:password@localhost:5432/codejam
REDIS_HOST=localhost
REDIS_PORT=6379
EXECUTION_TIMEOUT=10
```

For collaboration invite emails on deployed apps, use Resend:

```env
RESEND_API_KEY=re_your_generated_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=CodeJam
```

Run database migrations:

```bash
alembic upgrade head
```

Start the FastAPI backend:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend will run at:

```text
http://localhost:8000
```

## Test the Backend Separately

Yes, the backend can be tested without running the frontend.

Start only the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Then open the FastAPI Swagger UI:

```text
http://localhost:8000/docs
```

You can also use the ReDoc page:

```text
http://localhost:8000/redoc
```

Useful backend checks:

```bash
# Root API check
curl http://localhost:8000/
```

```bash
# Run automated backend tests
pytest
```

In `/docs`, you can test endpoints such as authentication, projects, files, collaboration, runtimes, and code execution directly from the browser.

## Frontend Setup

Open a new terminal and go to the frontend folder:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Create the frontend environment file:

```bash
cp .env.example .env
```

Example frontend environment:

```env
VITE_API_URL=http://localhost:8000
```

For the deployed frontend, set this environment variable in Vercel to your deployed backend API URL:

```env
VITE_API_URL=https://your-backend-url.example.com
```

Start the frontend:

```bash
npm run dev
```

The frontend will usually run at:

```text
http://localhost:5173
```

## Test the Frontend Separately

Yes, the frontend can also be tested separately.

For UI-only testing, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

Important note: pages that call the API, such as login, register, dashboard, projects, files, and code execution, need the backend running at `VITE_API_URL`.

For the full frontend experience, run both:

```bash
# Terminal 1 - backend
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 2 - frontend
cd frontend
npm run dev
```

You can also test the production frontend build:

```bash
cd frontend
npm run build
npm run preview
```

## Deploy This Frontend on Vercel

Live frontend:

```text
https://codejam-collab.vercel.app/
```

This repository keeps the React/Vite app inside `frontend/`. The root `vercel.json` is configured so Vercel installs and builds from that folder:

```json
{
  "installCommand": "cd frontend && npm install",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist"
}
```

If configuring Vercel manually in the dashboard, use:

- Root Directory: project root, or set it directly to `frontend`
- Install Command: `cd frontend && npm install`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`

If the Root Directory is set to `frontend`, then use the simpler Vercel settings:

- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

After deploying the frontend, configure the backend environment with the frontend URL:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://codejam-collab.vercel.app
FRONTEND_URL=https://codejam-collab.vercel.app
```

Also configure the Vercel frontend environment with the backend URL:

```env
VITE_API_URL=https://your-backend-url.example.com
```

## Collaboration Invite Email Setup

For Render deployment, Resend is recommended because it sends emails through HTTPS instead of SMTP. This avoids the SMTP network error that can happen on Render.

Add these only in the Render backend service environment variables:

```env
RESEND_API_KEY=re_your_generated_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=CodeJam
```

Do not commit the real API key to GitHub. After adding the variables, redeploy the backend.

For production, you can later verify your own domain in Resend and replace the sender with something like:

```env
RESEND_FROM_EMAIL=no-reply@yourdomain.com
```

If Resend is not configured, CodeJam falls back to SMTP. If neither Resend nor SMTP is configured, the invite link is still created and can be copied manually.

## Run the Code Execution Worker

Some code execution features depend on Redis and the RQ worker.

Start Redis first, then run:

```bash
rq worker code_execution
```

If the worker is not running, the app may still load, but code execution jobs may not complete.

## Publishing Integrations

CodeJam includes a token-based publishing MVP so students can publish their work without leaving the platform. Users can paste a GitHub or Vercel token once, choose to save it, and CodeJam will encrypt it in the backend database so they do not have to enter it again and again. If a saved token expires, students can paste a new token in the same Publish modal and keep the save option checked; CodeJam will replace the old saved token.

Important: tokens work like passwords. Students should never share them in chat, screenshots, GitHub commits, or public project files.

### How to Generate a GitHub Token

Use this for pushing CodeJam projects to GitHub.

1. Log in to GitHub.
2. Open this page:

```text
https://github.com/settings/tokens
```

3. Choose **Fine-grained tokens** if available.
4. Click **Generate new token**.
5. Give it a simple name, for example `CodeJam`.
6. Choose an expiration date, such as 30 or 90 days.
7. For repository access:
   - Choose selected repositories if pushing to an existing repo.
   - Or allow repository creation if the account settings show that option.
8. Give the token repository contents permission:
   - **Contents: Read and write**
   - **Metadata: Read-only**
9. Generate the token and copy it.
10. Paste it into CodeJam's **Publish > GitHub** tab and keep **Save this GitHub token for next time** checked.

If the token is lost, GitHub will not show it again. Generate a new one.

### How to Generate a Vercel Token

Use this for deploying frontend projects to Vercel.

1. Log in to Vercel.
2. Open this page:

```text
https://vercel.com/account/settings/tokens
```

3. Click **Create Token**.
4. Give it a simple name, for example `CodeJam`.
5. Choose an expiration date.
6. Copy the token.
7. Paste it into CodeJam's **Publish > Vercel** tab and keep **Save this Vercel token for next time** checked.

If deploying under a Vercel team, students may also need the Team ID. For personal accounts, the Team ID can usually be left empty.

### Push Project to GitHub

Yes, users can push code directly from CodeJam to GitHub.

Possible flow:

```text
User enters GitHub token and repository details
      |
      v
User selects a CodeJam project
      |
      v
CodeJam creates or updates a GitHub repository
      |
      v
Project files are committed and pushed
```

The current MVP supports:

- Pushing project files to a GitHub repository
- Creating the repository if requested
- Public or private repository creation
- Custom branch and commit message
- Optional encrypted token storage

Backend endpoint:

```text
POST /projects/{project_id}/github/push
```

For a production version, GitHub OAuth would be better than asking users to paste tokens manually.

### Deploy Project to Vercel

Yes, users can deploy supported frontend projects directly to Vercel.

Possible flow:

```text
User enters Vercel token and project settings
      |
      v
User selects a frontend project
      |
      v
CodeJam sends project files/configuration to Vercel
      |
      v
Vercel returns a live deployment URL
```

The current MVP supports:

- Sending CodeJam project files to Vercel
- Setting a Vercel project name
- Optional team ID
- Framework hint, such as `vite`
- Returning the live deployment URL

Backend endpoint:

```text
POST /projects/{project_id}/vercel/deploy
```

This feature is especially useful for students because they can go from AI-generated code to a shareable GitHub repository or live Vercel URL from one place.

## Docker Helpers

You can start PostgreSQL and Redis manually with Docker:

```bash
docker run -d --name codejam-postgres `
  -e POSTGRES_USER=codejam `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=codejam `
  -p 5432:5432 postgres:16
```

```bash
docker run -d --name codejam-redis `
  -p 6379:6379 redis:7
```

For macOS/Linux shells, replace the PowerShell backtick line continuations with backslashes.

## Common API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | API health/root check |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Log in |
| `GET` | `/projects` | List projects |
| `POST` | `/projects` | Create project |
| `GET` | `/projects/{id}` | Get project |
| `PUT` | `/projects/{id}` | Update project |
| `DELETE` | `/projects/{id}` | Delete project |
| `GET` | `/projects/{id}/files` | List project files |
| `POST` | `/projects/{id}/files` | Create file |
| `POST` | `/execute/` | Submit code execution job |
| `GET` | `/execute/{job_id}` | Check execution status |

For the most accurate and current endpoint list, use:

```text
http://localhost:8000/docs
```

## Syntax Highlighting in This README

Code examples are written with fenced code blocks and language labels, like this:

````markdown
```bash
npm run dev
```
````

That makes VS Code, GitHub, and most Markdown preview tools show color-coded commands instead of plain text.

## Database Schema Summary

```text
users
|-- id
|-- email
|-- hashed_password
|-- provider
`-- timestamps

projects
|-- id
|-- user_id
|-- name
|-- description
|-- language
|-- source_code
|-- is_public
|-- is_deleted
|-- share_id
`-- timestamps

project_collaborators
|-- id
|-- project_id
|-- user_id
|-- role
|-- accepted
|-- invited_by
`-- created_at

files
|-- id
|-- project_id
|-- parent_id
|-- name
|-- language
|-- content
`-- timestamps
```

## Security Notes

- Passwords are hashed before storage.
- Authentication uses JWT tokens.
- Project access is protected by role-based permissions.
- API input is validated with Pydantic schemas.
- Code execution runs through a controlled backend execution flow with timeouts.
- Production deployments should use strong secrets, restricted CORS origins, and managed database credentials.

## Learning Outcomes

This project demonstrates:

- Full-stack React + FastAPI development
- REST API design with OpenAPI documentation
- Async Python backend patterns
- SQLAlchemy models and Alembic migrations
- Authentication and authorization
- Background jobs with Redis/RQ
- Browser-based code editing with Monaco Editor

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Built with FastAPI, React, PostgreSQL, Redis, and a healthy amount of debugging patience.
