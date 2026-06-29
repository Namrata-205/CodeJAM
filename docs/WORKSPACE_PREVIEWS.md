# Workspace Previews

CodeJam can preview the built-in React + FastAPI workspace without requiring
contributors to install Node, Python, Docker, or an editor locally. The server
does need Docker because it executes untrusted project code.

## Operator setup

Build the controlled runtime image once from the repository root:

```powershell
docker build -f Dockerfile.workspace-runner -t codejam-workspace-runner:latest .
```

Start the API on the same machine as Docker. Click **Preview project** in a
React + FastAPI workspace. CodeJam writes a temporary copy of the files,
builds the React app inside an isolated container, and serves it through the
API preview route.

Previews expire after 15 minutes by default. Configure
`WORKSPACE_RUNTIME_TTL_SECONDS` to change that duration.

## Current boundary

The image deliberately supports the dependencies in the provided template.
It has no network access, so adding arbitrary npm or pip packages is not
supported yet. This keeps a student deployment from turning into an open code
execution service with unrestricted network access.
