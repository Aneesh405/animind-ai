"""Run live API QA against the already-running local Animind backend."""

import json
import math
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import httpx
import pymupdf

BASE_URL = "http://127.0.0.1:8000"
QUESTION = "Why does a projectile travel farthest at 45 degrees?"


def main():
    results = []

    def check(name, response, expected_status):
        assert response.status_code == expected_status, f"{name} returned HTTP {response.status_code}, expected {expected_status}."
        results.append({"check": name, "status": "passed", "http_status": response.status_code})
        return response

    def mutation(lesson, **changes):
        return {"session_id": lesson["session_id"], "lesson_id": lesson["id"], "revision": lesson["revision"], **changes}

    with httpx.Client(base_url=BASE_URL, timeout=30, trust_env=False) as client:
        health = check("health", client.get("/health"), 200).json()
        assert health["status"] == "ok"
        topics = check("supported topics", client.get("/api/supported-topics"), 200).json()
        assert {topic["id"] for topic in topics} == {"projectile_motion", "launch_angles", "velocity_components"}
        check("API documentation", client.get("/docs"), 200)
        contract = check("OpenAPI contract", client.get("/openapi.json"), 200).json()
        expected_paths = ["/health", "/api/lesson", "/api/adapt", "/api/what-if", "/api/check-understanding", "/api/upload-pdf", "/api/supported-topics"]
        assert all(path in contract["paths"] for path in expected_paths)

        session = str(uuid4())
        payload = {"session_id": session, "question": QUESTION, "mode": "demo"}
        lesson = check("demo lesson", client.post("/api/lesson", json=payload), 200).json()
        assert lesson["mode"] == "demo"
        assert lesson["metrics"]["range"] == round(400 / 9.81, 8)
        comparison = {row["angle"]: row for row in lesson["comparisons"]}
        assert math.isclose(comparison[30]["range"], comparison[60]["range"], abs_tol=1e-7)
        assert comparison[45]["range"] > comparison[30]["range"]
        assert math.isclose(comparison[30]["range"], 35.311943069, abs_tol=1e-7)

        for question in ["Explain photosynthesis", "Find the range of integers from 30 to 45", "Explain projectile motion with air resistance"]:
            check("unsupported question", client.post("/api/lesson", json=payload | {"question": question}), 422)
        for parameters in [{"gravity": 0}, {"gravity": -1}, {"angle": 91}, {"speed": 101}]:
            check("invalid numeric input", client.post("/api/lesson", json=payload | {"parameters": parameters}), 422)
        check("missing required fields", client.post("/api/lesson", json={}), 422)
        check("malformed JSON", client.post("/api/lesson", content="{invalid", headers={"Content-Type": "application/json"}), 422)
        check("invalid selected step", client.post("/api/adapt", json=mutation(lesson, step_id="missing", confusion="Please explain this step.")), 422)

        confusion = "Why doesn't 60 degrees travel farther if it stays in the air longer?"
        lesson = check("exact adaptive confusion", client.post("/api/adapt", json=mutation(lesson, step_id="step-2", confusion=confusion)), 200).json()
        assert lesson["scene"] != "trajectories"
        assert lesson["adaptation"]["student_confusion"] == confusion
        assert lesson["strategy_history"] == ["trajectories", lesson["scene"]]

        correct = check("correct understanding answer", client.post("/api/check-understanding", json=mutation(lesson, check_id="tradeoff", answer="b")), 200).json()
        incorrect = check("incorrect understanding answer", client.post("/api/check-understanding", json=mutation(lesson, check_id="tradeoff", answer="a")), 200).json()
        assert correct["correct"] is True
        assert incorrect["correct"] is False and incorrect["suggested_confusion"]

        old_range = lesson["metrics"]["range"]
        lesson = check("double gravity", client.post("/api/what-if", json=mutation(lesson, question="What happens if gravity doubles?")), 200).json()["lesson"]
        assert math.isclose(lesson["metrics"]["range"], old_range / 2, abs_tol=1e-7)
        old_range = lesson["metrics"]["range"]
        lesson = check("double launch speed", client.post("/api/what-if", json=mutation(lesson, question="What if launch speed doubles?")), 200).json()["lesson"]
        assert math.isclose(lesson["metrics"]["range"], old_range * 4, abs_tol=1e-7)
        check("outdated understanding check", client.post("/api/check-understanding", json=mutation(lesson, check_id="tradeoff", answer="b")), 409)
        check("invalid what-if value", client.post("/api/what-if", json=mutation(lesson, question="Set gravity to 0")), 422)

        check("session ownership", client.get(f"/api/lessons/{lesson['id']}", params={"session_id": str(uuid4())}), 404)
        history = check("session lesson history", client.get("/api/lessons", params={"session_id": session}), 200).json()
        assert any(item["id"] == lesson["id"] for item in history)

        with ThreadPoolExecutor(max_workers=2) as executor:
            pending = [executor.submit(client.post, "/api/what-if", json=mutation(lesson, changes={"angle": angle})) for angle in [30, 60]]
            concurrent = [future.result() for future in pending]
        assert sorted(response.status_code for response in concurrent) == [200, 409]
        results.append({"check": "concurrent updates preserve one revision", "status": "passed", "http_statuses": [200, 409]})
        saved = check("load saved lesson", client.get(f"/api/lessons/{lesson['id']}", params={"session_id": session}), 200).json()
        assert saved["revision"] == lesson["revision"] + 1
        expected_range = saved["parameters"]["speed"] ** 2 * math.sin(2 * math.radians(saved["parameters"]["angle"])) / saved["parameters"]["gravity"]
        assert math.isclose(saved["metrics"]["range"], expected_range, abs_tol=1e-7)

        with pymupdf.open() as document:
            page = document.new_page()
            page.insert_textbox((50, 50, 550, 200), "Projectile motion uses equal launch and landing heights. Compare launch angles of 30, 45, and 60 degrees. Horizontal and vertical velocity components determine range.", fontsize=12)
            pdf = document.tobytes()
        document = check("small supported PDF upload", client.post("/api/upload-pdf", data={"session_id": session}, files={"file": ("qa-projectile-notes.pdf", pdf, "application/pdf")} ), 200).json()
        assert document["page_count"] == 1 and document["topics"]
        grounded = check("PDF topic lesson and references", client.post("/api/lesson", json=payload | {"document_id": document["id"], "topic": "projectile_motion"}), 200).json()
        assert grounded["sources"][0]["filename"] == "qa-projectile-notes.pdf"
        assert grounded["sources"][0]["page"] == 1
        check("invalid upload type", client.post("/api/upload-pdf", data={"session_id": session}, files={"file": ("notes.txt", b"text", "text/plain")}), 415)
        check("corrupt PDF", client.post("/api/upload-pdf", data={"session_id": session}, files={"file": ("broken.pdf", b"%PDF-1.7 corrupt", "application/pdf")}), 422)

        for origin in ["http://127.0.0.1:3000", "http://localhost:3000"]:
            preflight = check("local CORS preflight", client.options("/api/lesson", headers={"Origin": origin, "Access-Control-Request-Method": "POST"}), 200)
            assert preflight.headers["access-control-allow-origin"] == origin

        live_gemini = "not tested because the API key/model is not configured"
        if health["gemini_configured"] and health["gemini_model_configured"]:
            # At most one live generation request, using credentials already held by the backend.
            response = client.post("/api/lesson", json=payload | {"mode": "gemini"}, timeout=55)
            if response.status_code == 200:
                assert response.json()["mode"] == "gemini"
                live_gemini = "passed one configured live generation"
            else:
                live_gemini = f"configured live generation returned HTTP {response.status_code}"

    print(json.dumps({"passed_checks": len(results), "results": results, "live_gemini": live_gemini}, indent=2))


if __name__ == "__main__":
    main()
