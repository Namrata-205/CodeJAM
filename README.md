# CodeJam - Browser-Based Code Playground

A full-stack collaborative code playground that lets users write, execute, and share code snippets online. Built with FastAPI, React, PostgreSQL, and Redis, CodeJam provides a zero-setup environment for learning, experimentation, and collaboration.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Project Overview

**Problem**: Developers need quick, zero-setup environments to test code snippets, collaborate on solutions, and share working examples without local installations or complex configurations.

**Solution**: CodeJam provides a browser-based IDE with:
- **Multi-language support** (Python, JavaScript, Go, Rust, C/C++, Java, TypeScript)
- **Real-time code execution** with sandboxed security
- **Collaboration features** (viewer/editor roles, invitations)
- **Project sharing** via public links or embedded snippets
- **File management** within projects for complex multi-file codebases

---

## ✨ Key Features

### 1. **User Management & Authentication**
- JWT-based authentication with secure password hashing (bcrypt)
- Session management with configurable token expiration
- OAuth support ready (Google/GitHub providers)

### 2. **Project Management**
- Create, update, and organize code projects
- Soft-delete for data recovery
- Public/private visibility controls
- Rich metadata (name, description, language, timestamps)

### 3. **Collaboration**
- Invite collaborators by email with granular roles:
  - **Owner**: Full control (delete, invite, manage settings)
  - **Editor**: Can modify code
  - **Viewer**: Read-only access
- Invitation acceptance workflow
- Role modification by project owners

### 4. **Secure Code Execution**
- Sandboxed subprocess execution with strict timeouts
- CPU and memory constraints (configurable)
- Multi-language runtime support
- Async job queue (Redis + RQ) for non-blocking execution
- Real-time job status polling

### 5. **File System**
- Hierarchical file structure within projects
- Create, rename, update, delete files
- Parent-child relationships for folders
- Language-specific syntax highlighting metadata

### 6. **Public Sharing**
- Generate unique share links for projects
- View shared projects without authentication
- Revoke share links to make projects private again
- Public project discovery feed

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │─────▶│   FastAPI    │─────▶│ PostgreSQL  │
│  Frontend   │◀─────│   Backend    │◀─────│  (async)    │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Redis     │
                     │   + RQ       │
                     │  (Job Queue) │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   RQ Worker  │
                     │ (Code Runner)│
                     └──────────────┘
```

### Tech Stack

**Backend**
- **FastAPI** - Modern async Python web framework
- **SQLAlchemy 2.0** - Async ORM with PostgreSQL
- **Alembic** - Database migrations
- **Pydantic v2** - Request/response validation
- **Redis + RQ** - Async task queue for code execution
- **python-jose** - JWT token handling
- **passlib** - Password hashing

**Database**
- **PostgreSQL 16** - Primary data store (async via asyncpg)
- **Redis 7** - Job queue and caching

**Testing**
- **pytest + pytest-asyncio** - Async test suite
- **httpx** - Async HTTP client for testing
- **SQLite (aiosqlite)** - In-memory test database

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 16+
- Redis 7+
- (Optional) Docker & Docker Compose

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/codejam.git
cd codejam
```

#### 2. Set Up Environment
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and fill in:
```env
# Generate a secure secret key
SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")

# Database connection
DATABASE_URL=postgresql+asyncpg://codejam:password@localhost:5432/codejam

# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379

# Code execution timeout (seconds)
EXECUTION_TIMEOUT=10
```

#### 4. Start PostgreSQL and Redis

**Option A: Docker**
```bash
docker run -d --name codejam-postgres \
  -e POSTGRES_USER=codejam \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=codejam \
  -p 5432:5432 postgres:16

docker run -d --name codejam-redis \
  -p 6379:6379 redis:7
```

**Option B: Local Installation**
```bash
# Install PostgreSQL and Redis via your package manager
# Ubuntu/Debian
sudo apt install postgresql redis-server

# macOS
brew install postgresql@16 redis
```

#### 5. Run Database Migrations
```bash
alembic upgrade head
```

#### 6. Start the Application

**Terminal 1: API Server**
```bash
uvicorn app.main:app --reload --port 8000
```

**Terminal 2: RQ Worker** (for code execution)
```bash
rq worker code_execution
```

API now available at: **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

---

## 🧪 Testing

Run the full test suite:
```bash
pytest tests/ -v
```

With coverage report:
```bash
pytest tests/ --cov=app --cov-report=term-missing
```

Run specific test modules:
```bash
pytest tests/test_auth.py -v
pytest tests/test_permissions.py -v
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Obtain JWT access token |
| POST | `/users/` | Register new account |
| GET | `/users/me` | Get current user profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/` | List owned projects |
| POST | `/projects/` | Create project |
| GET | `/projects/public` | Browse public projects |
| GET | `/projects/{id}` | Get project details |
| PATCH | `/projects/{id}` | Update metadata |
| DELETE | `/projects/{id}` | Soft-delete project |
| PUT | `/projects/{id}/code` | Update source code |
| POST | `/projects/{id}/share` | Generate share link |
| DELETE | `/projects/{id}/share` | Revoke share link |
| GET | `/projects/share/{share_id}` | View via share link |

### Collaboration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{id}/collaborators` | Invite user |
| GET | `/projects/{id}/collaborators` | List collaborators |
| POST | `/projects/{id}/collaborators/accept` | Accept invitation |
| PATCH | `/projects/{id}/collaborators/{uid}` | Change role |
| DELETE | `/projects/{id}/collaborators/{uid}` | Remove collaborator |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{id}/files` | Create file |
| GET | `/projects/{id}/files` | List files |
| GET | `/projects/{id}/files/{fid}` | Get file |
| PUT | `/projects/{id}/files/{fid}` | Update content |
| PATCH | `/projects/{id}/files/{fid}` | Rename file |
| DELETE | `/projects/{id}/files/{fid}` | Delete file |

### Code Execution
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/execute/` | Submit code job |
| GET | `/execute/{job_id}` | Poll job status |

---

## 🔒 Security Features

### Authentication & Authorization
- ✅ JWT-based stateless authentication
- ✅ Password hashing with bcrypt (72-byte limit enforced)
- ✅ Role-based access control (owner/editor/viewer)
- ✅ Request-level permission validation

### Code Execution Sandbox
- ✅ Subprocess isolation (separate process per execution)
- ✅ Hard timeout enforcement (configurable, default 10s)
- ✅ No network access (worker runs in isolated container)
- ✅ Temporary file cleanup after execution
- ✅ Stdout/stderr capture with size limits

### Data Protection
- ✅ SQL injection prevention (parameterized queries via SQLAlchemy)
- ✅ Soft-delete for data recovery
- ✅ Input validation on all endpoints (Pydantic schemas)
- ✅ CORS configuration for production deployment

---

## 📊 Database Schema

```sql
users
├── id (UUID, PK)
├── email (unique)
├── hashed_password
├── provider (local|google|github)
└── timestamps

projects
├── id (UUID, PK)
├── user_id (FK → users)
├── name, description, language
├── source_code (text)
├── is_public, is_deleted
├── share_id (UUID, unique)
└── timestamps

project_collaborators
├── id (UUID, PK)
├── project_id (FK → projects)
├── user_id (FK → users)
├── role (viewer|editor)
├── accepted (boolean)
├── invited_by (FK → users)
└── created_at

files
├── id (UUID, PK)
├── project_id (FK → projects)
├── parent_id (FK → files, nullable)
├── name, language, content
└── timestamps
```

---

## 🎓 Learning Outcomes

This project demonstrates:

1. **Async Python & FastAPI**
   - Full async/await throughout the stack
   - Async SQLAlchemy ORM patterns
   - Background job processing with RQ

2. **REST API Design**
   - Resource-based routing
   - Proper HTTP status codes
   - OpenAPI/Swagger documentation

3. **Security Engineering**
   - Authentication & authorization
   - Code execution sandboxing
   - Input validation & sanitization

4. **Database Design**
   - Normalized schema with relationships
   - Soft-delete patterns
   - Migration management with Alembic

5. **Testing**
   - Comprehensive test coverage
   - Async test fixtures
   - Isolated test environments

6. **Deployment-Ready**
   - Environment-based configuration
   - Docker containerization ready
   - Production security practices

---

## 🛣️ Roadmap

- [ ] WebSocket support for real-time collaboration
- [ ] Frontend React application
- [ ] Code version history & diffs
- [ ] Syntax highlighting in API responses
- [ ] Rate limiting per user
- [ ] Email notifications for invitations
- [ ] OAuth integration (Google/GitHub)
- [ ] Export projects as GitHub gists
- [ ] Embedded code snippets (iframe support)
- [ ] Admin dashboard

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Your Name**
- GitHub: [ttps://github.com/Namrata-205](https://github.com/Namrata-205)
- Portfolio: [https://namratadalvi.vercel.app](https://namratadalvi.vercel.app)

---



**Built with ❤️ by Namrata**
