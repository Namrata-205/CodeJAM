# Free Deployment Guide

This setup keeps the project student-friendly and avoids paid DevOps tools.

## Free Services

- GitHub: source control and CI
- GitHub Actions: backend tests and frontend build
- Vercel: frontend hosting
- Render, Railway, or Fly.io: FastAPI API and worker
- Neon or Supabase: PostgreSQL
- Upstash: Redis

## Local Setup

1. Copy `.env.example` to `.env`.
2. Fill `SECRET_KEY`.
3. Start local services with Docker Compose.
4. Run migrations with `alembic upgrade head`.
5. Start the API and frontend.

## Frontend Environment

On Vercel, set:

```text
VITE_API_URL=https://your-api-service-url
```

## Backend Environment

On your backend host, set:

```text
SECRET_KEY=your-long-random-secret
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=rediss://...
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
FRONTEND_URL=https://your-vercel-app.vercel.app
EXECUTION_TIMEOUT=10
```

Use `postgresql+asyncpg://` for SQLAlchemy async connections. If your database provider gives a normal `postgresql://` URL, change the prefix to `postgresql+asyncpg://`.

## Recommended Student Deployment Order

1. Push the project to GitHub.
2. Confirm GitHub Actions passes.
3. Create a free PostgreSQL database on Neon or Supabase.
4. Create a free Redis database on Upstash.
5. Deploy the backend API and worker.
6. Deploy the frontend on Vercel.
7. Put the frontend URL into `CORS_ORIGINS`.

## Collaboration Invite Email

Invite links always work without paid services: the app shows a link that can be copied.
To send invite emails automatically, configure SMTP on the backend:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_FROM_NAME=CodeJam
SMTP_STARTTLS=true
```

For Gmail, use an app password instead of your normal Gmail password.

## Workspace Previews On Deployment

The React + FastAPI preview runner starts Docker containers from the backend.
Many free hosts do not allow Docker-in-Docker or access to the Docker socket.
If your host does not support that, deployed previews will not run there even
though local previews work. The rest of the platform, including projects,
files, auth, sharing, and collaborator invites, can still be deployed normally.

## Notes

Do not expose unrestricted shell access to users on free hosting. Keep execution limited to the worker, enforce timeouts, and prefer container isolation where the platform supports it.
