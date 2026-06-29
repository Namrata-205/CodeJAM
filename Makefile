.PHONY: help install dev test clean migrate docker-up docker-down

help:
	@echo "CodeJam Development Commands"
	@echo "============================"
	@echo "install       - Install dependencies"
	@echo "dev           - Run development server"
	@echo "worker        - Run RQ worker"
	@echo "test          - Run test suite"
	@echo "test-cov      - Run tests with coverage"
	@echo "migrate       - Run database migrations"
	@echo "migration     - Create new migration"
	@echo "docker-up     - Start all services with Docker Compose"
	@echo "docker-down   - Stop all Docker services"
	@echo "docker-logs   - View Docker logs"
	@echo "clean         - Remove cache and temp files"
	@echo "lint          - Run code linters"

install:
	pip install -r requirements.txt
	pip install pytest pytest-asyncio pytest-cov httpx aiosqlite ruff

dev:
	uvicorn app.main:app --reload --port 8000

worker:
	rq worker code_execution

test:
	pytest tests/ -v

test-cov:
	pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing
	@echo "Coverage report generated in htmlcov/index.html"

migrate:
	alembic upgrade head

migration:
	@read -p "Enter migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

docker-up:
	docker-compose up -d
	@echo "Services started. API: http://localhost:8000/docs"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.db" -delete
	rm -rf .pytest_cache .coverage htmlcov/ .mypy_cache/

lint:
	ruff check app/ tests/
	ruff format app/ tests/ --check

format:
	ruff format app/ tests/

shell:
	python -m IPython
