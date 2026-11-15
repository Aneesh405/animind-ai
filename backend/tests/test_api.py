import json
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pymupdf
import pytest
from fastapi.testclient import TestClient

import main
from schemas import Lesson, Parameters
from store import Store
from teaching import demo_adaptation, demo_plan

QUESTION = "Why does a projectile travel farthest at 45 degrees?"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "store", Store(str(tmp_path / "test.sqlite3")))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture
def session():
    return str(uuid4())


def make_lesson(client, session, **changes):
    return client.post("/api/lesson", json={"session_id": session, "question": QUESTION, "mode": "demo", **changes})


def mutation(lesson, **changes):
    return {"session_id": lesson["session_id"], "lesson_id": lesson["id"], "revision": lesson["revision"], **changes}


def pdf_bytes(text="Projectile motion. Launch at 45 degrees with horizontal and vertical velocity components. Ignore air resistance and use equal launch and landing heights."):
    with pymupdf.open() as document:
        page = document.new_page()
        if text:
            page.insert_text((60, 70), text, fontsize=10)
        return document.tobytes()


def mock_gemini(monkeypatch, plan):
    monkeypatch.setenv("GEMINI_API_KEY", "unit-test-credential")
    monkeypatch.setenv("GEMINI_MODEL", "configured-test-model")
    mock = MagicMock()
    mock.__enter__.return_value.models.generate_content.return_value = SimpleNamespace(text=plan)
    monkeypatch.setattr("teaching.genai.Client", MagicMock(return_value=mock))
    return mock.__enter__.return_value.models.generate_content


def test_health_and_supported_topics(client):
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["gemini_configured"] is False
    assert len(health.json()["supported_scenes"]) == 3
    topics = client.get("/api/supported-topics")
    assert topics.status_code == 200
    assert {topic["id"] for topic in topics.json()} == {"projectile_motion", "launch_angles", "velocity_components"}


@pytest.mark.parametrize("question,topic", [
    (QUESTION, "projectile_motion"),
    ("Why is 60 degrees not better than 45 degrees for range?", "launch_angles"),
    ("Explain velocity components", "velocity_components"),
    ("How do horizontal and vertical velocity affect a projectile?", "velocity_components"),
    ("Explain a ball launched at an angle", "projectile_motion"),
])
def test_topic_detection(client, session, question, topic):
    response = make_lesson(client, session, question=question)
    assert response.status_code == 200
    assert response.json()["topic"] == topic


@pytest.mark.parametrize("question", ["Explain photosynthesis", "What is the range of a function?", "What is the velocity of money?", "Tell me about the 45th president", "Find the range of integers from 30 to 45", "What is the range of a sine function from 30 degrees to 60 degrees?"])
def test_unsupported_questions(client, session, question):
    response = make_lesson(client, session, question=question)
    assert response.status_code == 422
    assert "projectile" in response.json()["detail"].lower()


@pytest.mark.parametrize("question", ["Projectile from a cliff", "Projectile motion with air resistance", "Projectile range on a slope", "A ball launched from a height of 10 m"])
def test_unsupported_physics_models(client, session, question):
    assert make_lesson(client, session, question=question).status_code == 422


def test_explicit_no_drag_is_supported(client, session):
    assert make_lesson(client, session, question="Explain projectile motion with no air resistance at equal launch and landing heights").status_code == 200


def test_valid_demo_lesson(client, session):
    response = make_lesson(client, session)
    assert response.status_code == 200
    lesson = response.json()
    assert lesson["mode"] == "demo"
    assert lesson["scene"] == "trajectories"
    assert len(lesson["steps"]) == 3
    assert len({step["id"] for step in lesson["steps"]}) == 3
    assert lesson["metrics"]["range"] == pytest.approx(40.77471967)
    assert lesson["verification"]["status"] == "verified"
    assert "answer" not in lesson["understanding_check"]
    Lesson.model_validate(lesson)


def test_missing_api_key_is_explicit(client, session):
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "missing_api_key"
    assert response.json()["detail"]["demo_available"] is True
    assert client.get(f"/api/lessons?session_id={session}").json() == []


def test_missing_model_is_explicit(client, session, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "unit-test-only")
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "missing_model"


def test_gemini_sdk_schema_integration(client, session, monkeypatch):
    generate = mock_gemini(monkeypatch, demo_plan().model_dump_json())
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == 200
    assert response.json()["mode"] == "gemini"
    assert generate.call_args.kwargs["model"] == "configured-test-model"
    assert generate.call_args.kwargs["config"].response_json_schema == main.TeachingPlan.model_json_schema()
    assert generate.call_args.kwargs["config"].response_schema is None
    assert generate.call_args.kwargs["config"].thinking_config is None
    assert generate.call_args.kwargs["config"].temperature == 0.25


@pytest.mark.parametrize("model", ["gemini-3.8-flash", "models/gemini-3.8-flash"])
def test_flash_38_uses_supported_low_latency_configuration(client, session, monkeypatch, model):
    generate = mock_gemini(monkeypatch, demo_plan().model_dump_json())
    monkeypatch.setenv("GEMINI_MODEL", model)
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == 200
    config = generate.call_args.kwargs["config"]
    assert config.thinking_config.thinking_level.value == "LOW"
    assert config.thinking_config.thinking_budget is None
    assert config.temperature is None
    assert config.max_output_tokens == 6000


def test_real_sdk_serializes_lesson_and_adaptive_schemas(client, session, monkeypatch):
    """Exercise the installed SDK and HTTP payload through a local mock transport."""
    import httpx
    from google import genai
    from google.genai import types
    from teaching import demo_adaptation

    monkeypatch.setenv("GEMINI_API_KEY", "local-transport-test")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.8-flash")
    original_client = genai.Client
    requests = []
    output = [demo_plan().model_dump_json()]

    def respond(request):
        requests.append(json.loads(request.content))
        return httpx.Response(200, json={"candidates": [{"content": {"role": "model", "parts": [{"text": output.pop(0)}]}, "finishReason": "STOP"}]})

    def local_client(**arguments):
        options = arguments["http_options"]
        options.httpx_client = httpx.Client(transport=httpx.MockTransport(respond))
        return original_client(**arguments)

    monkeypatch.setattr("teaching.genai.Client", local_client)
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == 200
    lesson = response.json()
    adaptation = demo_adaptation(Lesson.model_validate(lesson), "I am confused", "components")
    output.append(adaptation.model_dump_json())
    response = client.post("/api/adapt", json=mutation(lesson, step_id=lesson["steps"][1]["id"], confusion="I don't understand why 60 degrees doesn't travel farther."))
    assert response.status_code == 200
    assert response.json()["scene"] == "components"
    assert requests[0]["generationConfig"]["responseMimeType"] == "application/json"
    for request, schema in zip(requests, [main.TeachingPlan, main.AdaptivePlan], strict=True):
        thinking = types.ThinkingConfig.model_validate(request["generationConfig"]["thinkingConfig"])
        assert thinking.thinking_level == types.ThinkingLevel.LOW
        assert thinking.thinking_budget is None
        assert "temperature" not in request["generationConfig"]
        assert "responseSchema" not in request["generationConfig"]
        wire_schema = request["generationConfig"]["responseJsonSchema"]
        assert wire_schema == schema.model_json_schema()
        assert wire_schema["additionalProperties"] is False
        assert wire_schema["$defs"]["PlanStep"]["additionalProperties"] is False
    context = json.loads(requests[1]["contents"][0]["parts"][0]["text"])
    assert context["selected_step"]["id"] == lesson["steps"][1]["id"]
    assert context["previously_used_strategies"] == ["trajectories"]
    assert "components" in context["allowed_new_strategies"]


@pytest.mark.parametrize("bad_plan", ["not-json", "{}", "", json.dumps(demo_plan().model_dump() | {"scene": "execute_python"}), json.dumps(demo_plan().model_dump() | {"explanation": "The projectile goes 999 metres."})])
def test_invalid_gemini_response_does_not_fall_back(client, session, monkeypatch, bad_plan):
    mock_gemini(monkeypatch, bad_plan)
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "invalid_plan"


@pytest.mark.parametrize("code,status,error_code", [(400, 502, "gemini_request"), (401, 502, "gemini_credentials"), (403, 502, "gemini_credentials"), (429, 429, "gemini_rate_limit"), (503, 502, "gemini_unavailable"), (404, 502, "gemini_model")])
def test_gemini_errors_are_sanitized(client, session, monkeypatch, caplog, code, status, error_code):
    from google.genai.errors import APIError
    generate = mock_gemini(monkeypatch, demo_plan().model_dump_json())
    generate.side_effect = APIError(code, {"message": "secret-key-must-never-leak"})
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == status
    assert response.json()["detail"]["code"] == error_code
    assert "secret-key" not in response.text
    assert "secret-key" not in caplog.text
    assert generate.call_count == 1


def test_invalid_key_is_distinguished_from_bad_schema(client, session, monkeypatch, caplog):
    from google.genai.errors import APIError
    generate = mock_gemini(monkeypatch, demo_plan().model_dump_json())
    generate.side_effect = APIError(400, {"error": {"message": "API key not valid. unit-test-credential"}})
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "gemini_credentials"
    assert "unit-test-credential" not in response.text
    assert "unit-test-credential" not in caplog.text


def test_health_identifies_process_model_and_stale_configuration(client, monkeypatch):
    import os
    monkeypatch.setenv("GEMINI_API_KEY", "private-unit-test-value")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.8-flash")
    environment = {"GEMINI_API_KEY": "private-unit-test-value", "GEMINI_MODEL": "gemini-3.8-flash"}
    monkeypatch.setattr(main, "dotenv_values", lambda path: environment)
    response = client.get("/health")
    assert response.json()["process_id"] == os.getpid()
    assert response.json()["gemini_model"] == "gemini-3.8-flash"
    assert response.json()["environment_file_matches"] is True
    assert "private-unit-test-value" not in response.text
    environment["GEMINI_API_KEY"] = "updated-private-unit-test-value"
    response = client.get("/health")
    assert response.json()["environment_file_matches"] is False
    assert "private-unit-test-value" not in response.text


def test_gemini_timeout(client, session, monkeypatch):
    import httpx
    generate = mock_gemini(monkeypatch, demo_plan().model_dump_json())
    generate.side_effect = httpx.ReadTimeout("private details")
    response = make_lesson(client, session, mode="gemini")
    assert response.status_code == 504
    assert response.json()["detail"]["code"] == "gemini_timeout"


def test_adaptive_scene_change_and_history(client, session):
    lesson = make_lesson(client, session).json()
    seen = [lesson["scene"]]
    for index in range(4):
        response = client.post("/api/adapt", json=mutation(lesson, step_id=lesson["steps"][1]["id"], confusion="I don't understand why 60 degrees doesn't travel farther."))
        assert response.status_code == 200
        updated = response.json()
        assert updated["scene"] != lesson["scene"]
        assert updated["revision"] == lesson["revision"] + 1
        assert updated["adaptation"]["previous_strategy"] == lesson["scene"]
        assert "may" in updated["adaptation"]["misconception_hypothesis"]
        assert updated["adaptation"]["student_confusion"].startswith("I don't understand")
        seen.append(updated["scene"])
        lesson = updated
    assert len(set(seen[:3])) == 3
    assert lesson["strategy_history"] == seen


def test_invalid_step_does_not_change_lesson(client, session):
    lesson = make_lesson(client, session).json()
    response = client.post("/api/adapt", json=mutation(lesson, step_id="invented-step", confusion="I am confused"))
    assert response.status_code == 422
    loaded = client.get(f"/api/lessons/{lesson['id']}?session_id={session}").json()
    assert loaded["revision"] == 1


def test_repeated_gemini_scene_is_rejected(client, session, monkeypatch):
    mock_gemini(monkeypatch, demo_plan().model_dump_json())
    lesson = make_lesson(client, session, mode="gemini").json()
    model = Lesson.model_validate(lesson)
    adaptive = demo_adaptation(model, "I am confused", "trajectories")
    mock_gemini(monkeypatch, adaptive.model_dump_json())
    response = client.post("/api/adapt", json=mutation(lesson, step_id=lesson["steps"][0]["id"], confusion="I am confused"))
    assert response.status_code == 502


def test_session_ownership_and_stale_revisions(client, session):
    lesson = make_lesson(client, session).json()
    assert client.get(f"/api/lessons/{lesson['id']}?session_id={uuid4()}").status_code == 404
    changed = client.post("/api/what-if", json=mutation(lesson, changes={"angle": 60}))
    assert changed.status_code == 200
    stale = client.post("/api/what-if", json=mutation(lesson, changes={"angle": 30}))
    assert stale.status_code == 409
    assert len(client.get(f"/api/lessons?session_id={session}").json()) == 1


@pytest.mark.parametrize("question,expected", [
    ("What happens if gravity doubles?", {"gravity": 19.62}),
    ("What if I launch at 60 degrees?", {"angle": 60}),
    ("Set initial speed to 25 m/s", {"speed": 25}),
    ("What if launch speed doubles?", {"speed": 40}),
    ("Set gravity to 1.62", {"gravity": 1.62}),
    ("Gravity halves", {"gravity": 4.905}),
])
def test_what_if_questions(client, session, question, expected):
    lesson = make_lesson(client, session).json()
    response = client.post("/api/what-if", json=mutation(lesson, question=question))
    assert response.status_code == 200
    for key, value in expected.items():
        assert response.json()["lesson"]["parameters"][key] == pytest.approx(value)
    assert response.json()["explanation"]


@pytest.mark.parametrize("change", [{"gravity": 0}, {"gravity": -1}, {"gravity": 51}, {"angle": -1}, {"angle": 91}, {"speed": 0}, {"speed": 101}, {"unexpected": 12}])
def test_invalid_parameters(client, session, change):
    lesson = make_lesson(client, session).json()
    assert client.post("/api/what-if", json=mutation(lesson, changes=change)).status_code == 422


@pytest.mark.parametrize("question", ["Gravity is negative", "What about photosynthesis?", "Gravity to 0", "Launch at -10 degrees", "Gravity doubles with air resistance"])
def test_invalid_what_if(client, session, question):
    lesson = make_lesson(client, session).json()
    assert client.post("/api/what-if", json=mutation(lesson, question=question)).status_code == 422


def test_nonfinite_values_are_rejected(client, session):
    body = json.dumps({"session_id": session, "question": QUESTION, "parameters": {"angle": 45, "speed": 20, "gravity": float("nan")}})
    response = client.post("/api/lesson", content=body, headers={"Content-Type": "application/json"})
    assert response.status_code == 422


def test_pdf_to_grounded_lesson(client, session):
    uploaded = client.post("/api/upload-pdf", data={"session_id": session}, files={"file": ("lecture.pdf", pdf_bytes(), "application/pdf")})
    assert uploaded.status_code == 200
    document = uploaded.json()
    assert document["page_count"] == 1
    assert document["topics"]
    response = make_lesson(client, session, document_id=document["id"], topic="projectile_motion")
    assert response.status_code == 200
    assert response.json()["sources"][0]["filename"] == "lecture.pdf"
    assert response.json()["sources"][0]["page"] == 1
    assert len(response.json()["sources"][0]["excerpt"]) <= 1200


@pytest.mark.parametrize("filename,data,mime,status", [
    ("notes.txt", b"not a pdf", "text/plain", 415),
    ("notes.pdf", b"not a pdf", "application/pdf", 422),
    ("empty.pdf", pdf_bytes(""), "application/pdf", 422),
    ("corrupt.pdf", b"%PDF-1.7\ncorrupt", "application/pdf", 422),
    ("large.pdf", b"%PDF-" + b"x" * (10 * 1024 * 1024), "application/pdf", 413),
])
def test_pdf_validation(client, session, filename, data, mime, status):
    response = client.post("/api/upload-pdf", data={"session_id": session}, files={"file": (filename, data, mime)})
    assert response.status_code == status


def test_pdf_without_supported_topics(client, session):
    response = client.post("/api/upload-pdf", data={"session_id": session}, files={"file": ("biology.pdf", pdf_bytes("Photosynthesis converts light energy into chemical energy in plants."), "application/pdf")})
    assert response.status_code == 200
    assert response.json()["topics"] == []


def test_complete_student_journey(client, session):
    lesson = make_lesson(client, session).json()
    lesson = client.post("/api/adapt", json=mutation(lesson, step_id=lesson["steps"][1]["id"], confusion="I don't understand why 60 degrees doesn't travel farther.")).json()
    assert lesson["scene"] == "components"
    lesson = client.post("/api/what-if", json=mutation(lesson, changes={"angle": 60})).json()["lesson"]
    lesson = client.post("/api/what-if", json=mutation(lesson, question="What happens if gravity doubles?")).json()["lesson"]
    assert lesson["metrics"]["range"] == pytest.approx(17.65597153)
    assert lesson["adaptation"]["parameters"]["gravity"] == 19.62
    result = client.post("/api/check-understanding", json=mutation(lesson, check_id="gravity", answer="c"))
    assert result.status_code == 200
    assert result.json()["correct"] is True
    incorrect = client.post("/api/check-understanding", json=mutation(lesson, check_id="gravity", answer="a"))
    assert incorrect.json()["correct"] is False
    assert incorrect.json()["suggested_confusion"]


def test_invalid_understanding_answers(client, session):
    lesson = make_lesson(client, session).json()
    assert client.post("/api/check-understanding", json=mutation(lesson, check_id="gravity", answer="c")).status_code == 409
    assert client.post("/api/check-understanding", json=mutation(lesson, check_id="tradeoff", answer="gibberish")).status_code == 422


def test_cors(client):
    response = client.options("/api/lesson", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    loopback = client.options("/api/lesson", headers={"Origin": "http://127.0.0.1:3000", "Access-Control-Request-Method": "POST"})
    assert loopback.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"
    other = client.options("/api/lesson", headers={"Origin": "https://unrelated.example", "Access-Control-Request-Method": "POST"})
    assert other.status_code == 400
