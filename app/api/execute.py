"""
app/api/execute.py
Code execution endpoints.

POST /execute/          — submit code, get back a job_id
GET  /execute/{job_id}  — poll for the result
"""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.models.user import User
from app.redis_queue import code_queue, redis_conn
from app.schemas.execute import ExecuteRequest, JobStatusResponse
from app.worker.jobs import run_code

try:
    from rq.job import Job
    from rq.exceptions import NoSuchJobError
except ImportError:  # pragma: no cover
    Job = None       # type: ignore

router = APIRouter(prefix="/execute", tags=["Code Execution"])

DIRECT_RESULTS: dict[str, dict] = {}


def _format_result(job_id: str, result: dict) -> JobStatusResponse:
    output_lines = []
    if result.get("stdout"):
        output_lines.append(result["stdout"])
    if result.get("stderr"):
        output_lines.append(f"[stderr]\n{result['stderr']}")
    if result.get("timed_out"):
        output_lines.append("[Execution timed out]")

    return JobStatusResponse(
        job_id=job_id,
        status="finished",
        output="\n".join(output_lines) if output_lines else "",
    )


# ---------------------------------------------------------------------------
# POST /execute/  —  Submit a job
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=JobStatusResponse,
    summary="Submit code for execution",
    description=(
        "Enqueues the code as an async RQ job. "
        "Poll `GET /execute/{job_id}` to retrieve the output."
    ),
)
def execute_code(
    data: ExecuteRequest,
    current_user: User = Depends(get_current_user),
) -> JobStatusResponse:
    """
    Requires authentication so we can enforce per-user rate limits in future.
    The job is intentionally sync (RQ workers are sync processes).
    """
    try:
        job = code_queue.enqueue(
            run_code,
            data.language,
            data.source_code,
            job_timeout=60,     # RQ-level guard; worker also enforces EXECUTION_TIMEOUT
        )
    except Exception as exc:
        job_id = f"direct-{uuid4()}"
        DIRECT_RESULTS[job_id] = run_code(data.language, data.source_code)
        return _format_result(job_id, DIRECT_RESULTS[job_id])

    return JobStatusResponse(job_id=job.id, status="queued")


# ---------------------------------------------------------------------------
# GET /execute/{job_id}  —  Poll job status
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}",
    response_model=JobStatusResponse,
    summary="Poll execution result by job ID",
)
def get_execution_result(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> JobStatusResponse:
    if job_id in DIRECT_RESULTS:
        return _format_result(job_id, DIRECT_RESULTS[job_id])

    if Job is None:
        raise HTTPException(status_code=500, detail="RQ not installed")

    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.is_finished:
        result: dict = job.result or {}
        return _format_result(job_id, result)

    if job.is_failed:
        return JobStatusResponse(
            job_id=job_id,
            status="failed",
            error=str(job.exc_info) if job.exc_info else "Unknown error",
        )

    if job.is_started:
        return JobStatusResponse(job_id=job_id, status="running")

    return JobStatusResponse(job_id=job_id, status="queued")
