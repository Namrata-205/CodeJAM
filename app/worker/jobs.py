"""
app/worker/jobs.py
RQ worker job: runs user-submitted code in an isolated subprocess.

Security measures:
  - Subprocess isolation: code runs in a child process, not the main server.
  - Hard timeout via subprocess.run(timeout=...) — the process is killed if it
    exceeds EXECUTION_TIMEOUT seconds.
  - stdout + stderr are both captured and returned.
  - The worker process should itself be run inside a container/sandbox with
    restricted network access and a read-only filesystem (Docker recommended).

Supported language runners are mapped in RUNNERS below.
"""
import subprocess
import tempfile
import os
from pathlib import Path

from app.config import EXECUTION_TIMEOUT, SUPPORTED_LANGUAGES

# ---------------------------------------------------------------------------
# Language → command template
# Each entry is a callable that receives the temp file path and returns the
# argv list passed to subprocess.run().
# ---------------------------------------------------------------------------

RUNNERS: dict[str, callable] = {
    "python":     lambda path: ["python3", path],
    "javascript": lambda path: ["node", path],
    "typescript": lambda path: ["ts-node", "--transpile-only", path],
    "java":       lambda path: ["java", path],          # expects a .java file
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
# Compiled language helpers (compile then run)
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

def run_code(language: str, source_code: str) -> dict:
    """
    Execute `source_code` in the given `language`.

    Returns a dict with:
      - stdout: str
      - stderr: str
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

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=EXECUTION_TIMEOUT,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
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
        # Compilation error for compiled languages
        return {
            "stdout": "",
            "stderr": e.stderr or str(e),
            "exit_code": e.returncode,
            "timed_out": False,
        }
    except FileNotFoundError as e:
        # Runtime not installed
        return {
            "stdout": "",
            "stderr": f"Runtime not found: {e}",
            "exit_code": 1,
            "timed_out": False,
        }
    finally:
        # Always clean up the temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass