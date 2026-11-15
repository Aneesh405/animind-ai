"""Verify an actual uvicorn process without touching the running application's DB."""

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
import pytest


def test_fresh_backend_process_serves_health(tmp_path):
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]

    environment = os.environ.copy()
    environment["ANIMIND_DB_PATH"] = str(tmp_path / "startup.sqlite3")
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port), "--log-level", "error"],
        cwd=Path(__file__).resolve().parents[1],
        env=environment,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    try:
        deadline = time.monotonic() + 25
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", trust_env=False, timeout=1) as client:
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    pytest.fail("Fresh backend process exited before becoming healthy.")
                try:
                    response = client.get("/health")
                except httpx.TransportError:
                    time.sleep(0.1)
                    continue
                assert response.status_code == 200
                assert response.json()["status"] == "ok"
                assert client.get("/api/supported-topics").status_code == 200
                break
            else:
                pytest.fail("Fresh backend process did not become healthy within 25 seconds.")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
