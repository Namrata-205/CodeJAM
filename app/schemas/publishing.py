from pydantic import BaseModel, Field


class GitHubPushRequest(BaseModel):
    token: str | None = Field(default=None, description="GitHub fine-grained token or PAT")
    save_token: bool = Field(default=False)
    owner: str = Field(..., min_length=1, description="GitHub username or organization")
    repo: str = Field(..., min_length=1, description="Repository name")
    branch: str = Field(default="main", min_length=1)
    message: str = Field(default="Update project from CodeJam", min_length=1)
    create_repo: bool = Field(default=False)
    private: bool = Field(default=False)


class GitHubPushResponse(BaseModel):
    repository_url: str
    branch: str
    files_pushed: int


class VercelDeployRequest(BaseModel):
    token: str | None = Field(default=None, description="Vercel access token")
    save_token: bool = Field(default=False)
    project_name: str | None = Field(default=None, description="Optional Vercel project name")
    team_id: str | None = Field(default=None, description="Optional Vercel team ID")
    framework: str | None = Field(default="vite", description="Vercel framework hint")


class VercelDeployResponse(BaseModel):
    deployment_url: str
    deployment_id: str
    state: str | None = None
