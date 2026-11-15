from concurrent.futures import ThreadPoolExecutor
from threading import Event
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest

import main
from plan_cache import PlanCache, plan_key
from store import Store
from teaching import demo_plan


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "store", Store(str(tmp_path / "test.sqlite3")))
    monkeypatch.setattr(main, "plan_cache", PlanCache())
    monkeypatch.delenv("ANIMIND_DEV_TIMING", raising=False)
    with TestClient(main.app) as client:
        yield client


def payload(**changes):
    return {"session_id": str(uuid4()), "question": "Explain projectile motion", "mode": "gemini", **changes}


def test_timing_is_opt_in_and_contains_only_fixed_numeric_phases(client, monkeypatch):
    data = payload(mode="demo")
    assert "server-timing" not in client.post("/api/lesson", json=data).headers
    monkeypatch.setenv("ANIMIND_DEV_TIMING", "1")
    response = client.post("/api/lesson", json=data)
    timing = response.headers["server-timing"]
    phases = dict(part.strip().split(";dur=") for part in timing.split(","))
    assert set(phases) == {"topic", "physics", "store", "total"}
    assert all(float(value) >= 0 for value in phases.values())
    assert data["question"] not in timing and data["session_id"] not in timing
    assert "Server-Timing" in client.post("/api/lesson", json=data, headers={"Origin": "http://localhost:3000"}).headers["access-control-expose-headers"]


def test_cache_reuses_validated_plan_but_creates_independent_lessons(client, monkeypatch):
    calls = []
    monkeypatch.setattr(main, "generate_plan", lambda *args: (calls.append(1) or demo_plan()))
    data = payload()
    first = client.post("/api/lesson", json=data).json()
    second = client.post("/api/lesson", json=data).json()
    assert len(calls) == 1
    assert first["planning_source"] == "gemini"
    assert second["planning_source"] == "gemini_cache"
    assert first["id"] != second["id"]
    assert first["metrics"] == second["metrics"]
    # Session, parameters, prompt and provider configuration all invalidate reuse.
    for change in [{"session_id": str(uuid4())}, {"parameters": {"angle": 60}}, {"question": "Explain projectile trajectories"}]:
        assert client.post("/api/lesson", json=data | change).json()["planning_source"] == "gemini"
    monkeypatch.setenv("GEMINI_MODEL", "another-model")
    assert client.post("/api/lesson", json=data).json()["planning_source"] == "gemini"
    monkeypatch.setenv("GEMINI_API_KEY", "test-credential-only")
    assert client.post("/api/lesson", json=data).json()["planning_source"] == "gemini"
    assert len(calls) == 6


def test_cache_does_not_hide_provider_errors(client, monkeypatch):
    calls = []
    def fail(*args):
        calls.append(1)
        raise HTTPException(502, "Simulated invalid plan")
    monkeypatch.setattr(main, "generate_plan", fail)
    data = payload()
    assert client.post("/api/lesson", json=data).status_code == 502
    assert client.post("/api/lesson", json=data).status_code == 502
    assert len(calls) == 2
    monkeypatch.setattr(main, "generate_plan", lambda *args: demo_plan())
    assert client.post("/api/lesson", json=data).json()["planning_source"] == "gemini"


def test_pdf_plans_bypass_cache(client, monkeypatch):
    from schemas import SourceReference
    monkeypatch.setattr(main.store, "get_document", lambda *_: {"topics": ["projectile_motion"]})
    monkeypatch.setattr(main, "relevant_sources", lambda *_: [SourceReference(filename="lecture.pdf", page=1, excerpt="Projectile motion notes.")])
    calls = []
    monkeypatch.setattr(main, "generate_plan", lambda *args: (calls.append(1) or demo_plan()))
    data = payload(document_id=str(uuid4()))
    for _ in range(2):
        assert client.post("/api/lesson", json=data).json()["planning_source"] == "gemini"
    assert len(calls) == 2


def test_cache_expires_evicts_and_returns_deep_copies():
    now = [0]
    cache = PlanCache(capacity=2, ttl=5, clock=lambda: now[0])
    first, hit = cache.get_or_create(b"a", demo_plan)
    assert hit is False
    first.steps[0].title = "Caller mutation"
    again, hit = cache.get_or_create(b"a", demo_plan)
    assert hit and again.steps[0].title != first.steps[0].title
    cache.get_or_create(b"b", demo_plan)
    cache.get_or_create(b"a", demo_plan)  # Make b the least recently used.
    cache.get_or_create(b"c", demo_plan)
    assert cache.get_or_create(b"b", demo_plan)[1] is False
    now[0] = 5
    assert cache.get_or_create(b"b", demo_plan)[1] is False


def test_concurrent_identical_requests_share_one_validated_result():
    cache = PlanCache()
    started, release = Event(), Event()
    calls = []
    def loader():
        calls.append(1)
        started.set()
        assert release.wait(3)
        return demo_plan()
    with ThreadPoolExecutor(2) as pool:
        first = pool.submit(cache.get_or_create, b"same", loader)
        assert started.wait(3)
        second = pool.submit(cache.get_or_create, b"same", loader)
        release.set()
        assert sorted([first.result()[1], second.result()[1]]) == [False, True]
    assert len(calls) == 1


def test_cache_key_binds_instruction_and_schema_without_exposing_content():
    args = ["session", {"question": "private student text"}, "model", "test-credential", "instruction", {"schema": 1}]
    original = plan_key(*args)
    assert isinstance(original, bytes) and len(original) == 32
    for index in range(len(args)):
        changed = args.copy()
        changed[index] = "changed"
        assert plan_key(*changed) != original
