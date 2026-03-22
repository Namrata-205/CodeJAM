"""
app/models/__init__.py
Import all models here so that:
  1. Alembic's env.py can do `from app.models import *` and see every table.
  2. Relationship back-references resolve correctly at startup.
"""
from app.models.user import User                          # noqa: F401
from app.models.projects import Project                   # noqa: F401
from app.models.collaborators import ProjectCollaborator  # noqa: F401
from app.models.files import File                         # noqa: F401