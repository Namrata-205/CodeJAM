"""
app/worker/jobs.py
RQ worker job: runs user-submitted code in an isolated subprocess.

Security measures:
  - Subprocess isolation: code runs in a child process, not the main server.
  - Hard timeout via subprocess.run(timeout=...) — the process is killed if it
    exceeds EXECUTION_TIMEOUT seconds.
  - On Linux (production/Docker): resource.setrlimit() enforces hard limits on
    CPU time, virtual memory, file write size, and process count.
  - On Windows (dev): limits are skipped gracefully; use Docker for production.
  - stdout + stderr are captured and truncated to MAX_OUTPUT_BYTES.
  - Temp source file is always deleted after execution.

Supported languages (8): python, javascript, typescript, java, go, rust, c, cpp
"""
import os
import platform
import subprocess
import tempfile

from app.config import EXECUTION_TIMEOUT, SUPPORTED_LANGUAGES

# ---------------------------------------------------------------------------
# Resource limits — Linux only (production/Docker)
# ---------------------------------------------------------------------------

IS_LINUX = platform.system() == 'Linux'

CPU_TIME_LIMIT_SEC: int = int(os.getenv("CPU_TIME_LIMIT", "5"))
MEMORY_LIMIT_MB:    int = int(os.getenv("MEMORY_LIMIT_MB", "128"))
MAX_OUTPUT_BYTES:   int = int(os.getenv("MAX_OUTPUT_BYTES", str(512 * 1024)))

_MEMORY_BYTES  = MEMORY_LIMIT_MB * 1024 * 1024
_MAX_FILE_SIZE = 16 * 1024 * 1024


def _apply_resource_limits():
    """
    Called via preexec_fn inside the child process (Linux only).
    Sets hard CPU, memory, file size, and process limits.
    """
    import resource
    resource.setrlimit(resource.RLIMIT_CPU,   (CPU_TIME_LIMIT_SEC, CPU_TIME_LIMIT_SEC))
    resource.setrlimit(resource.RLIMIT_AS,    (_MEMORY_BYTES,  _MEMORY_BYTES))
    resource.setrlimit(resource.RLIMIT_FSIZE, (_MAX_FILE_SIZE, _MAX_FILE_SIZE))
    resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))


# ---------------------------------------------------------------------------
# Language → command template
# ---------------------------------------------------------------------------

RUNNERS: dict[str, callable] = {
    "python":     lambda path: ["python3", path],
    "javascript": lambda path: ["node", path],
    "typescript": lambda path: ["ts-node", "--transpile-only", path],
    "java":       lambda path: ["java", path],
    "go":         lambda path: ["go", "run", path],
    "rust":       lambda path: _rust_runner(path),
    "c":          lambda path: _c_runner(path),
    "cpp":        lambda path: _cpp_runner(path),
}

FILE_EXTENSIONS: dict[str, str] = {
    "python":     ".py",
    "javascript": ".js",
    "typescript": ".ts",
    "java":       ".java",
    "go":         ".go",
    "rust":       ".rs",
    "c":          ".c",
    "cpp":        ".cpp",
}


# ---------------------------------------------------------------------------
# Compiled language helpers
# ---------------------------------------------------------------------------

def _rust_runner(src_path: str) -> list[str]:
    out = src_path.replace(".rs", "")
    subprocess.run(["rustc", src_path, "-o", out], check=True, timeout=30)
    return [out]


def _c_runner(src_path: str) -> list[str]:
    out = src_path.replace(".c", "")
    subprocess.run(["gcc", src_path, "-o", out], check=True, timeout=30)
    return [out]


def _cpp_runner(src_path: str) -> list[str]:
    out = src_path.replace(".cpp", "")
    subprocess.run(["g++", src_path, "-o", out], check=True, timeout=30)
    return [out]


# ---------------------------------------------------------------------------
# Main job function (called by RQ worker)
# ---------------------------------------------------------------------------

def run_code(language: str, source_code: str, stdin: str = "") -> dict:
    """
    Execute `source_code` in the given `language`.

    Returns a dict with:
      - stdout:    str
      - stderr:    str
      - exit_code: int
      - timed_out: bool
    """
    if language not in SUPPORTED_LANGUAGES:
        return {
            "stdout": "",
            "stderr": f"Unsupported language: {language}",
            "exit_code": 1,
            "timed_out": False,
        }

    extension = FILE_EXTENSIONS[language]

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=extension,
        delete=False,
        encoding="utf-8",
    ) as tmp:
        tmp.write(source_code)
        tmp_path = tmp.name

    try:
        runner = RUNNERS[language]
        cmd = runner(tmp_path)

        # Apply resource limits on Linux only
        preexec = _apply_resource_limits if IS_LINUX else None

        result = subprocess.run(
            cmd,
            input=stdin,
            capture_output=True,
            text=True,
            timeout=EXECUTION_TIMEOUT,
            preexec_fn=preexec,
        )

        return {
            "stdout": result.stdout[:MAX_OUTPUT_BYTES],
            "stderr": result.stderr[:MAX_OUTPUT_BYTES],
            "exit_code": result.returncode,
            "timed_out": False,
        }

    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"Execution timed out after {EXECUTION_TIMEOUT} seconds.",
            "exit_code": -1,
            "timed_out": True,
        }
    except subprocess.CalledProcessError as e:
        return {
            "stdout": "",
            "stderr": (e.stderr or str(e))[:MAX_OUTPUT_BYTES],
            "exit_code": e.returncode,
            "timed_out": False,
        }
    except FileNotFoundError as e:
        return {
            "stdout": "",
            "stderr": f"Runtime not found: {e}",
            "exit_code": 1,
            "timed_out": False,
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass