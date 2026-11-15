"""Animind's validated teaching API. Run with uvicorn main:app."""

import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from uuid import UUID, uuid4

from dotenv import dotenv_values, load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from documents import extract_pdf, relevant_sources
from physics import ASSUMPTIONS, EQUATIONS, TOPICS, calculate, comparisons, detect_topic, parse_what_if
from schemas import (
    Adaptation, AdaptRequest, AdaptivePlan, CheckRequest, CheckResponse, HealthResponse,
    Lesson, LessonRequest, LessonSummary, Parameters, PDFResponse, Step, TeachingPlan,
    Topic, Verification, WhatIfRequest, WhatIfResponse,
)
from store import Store
from teaching import CHECKS, demo_adaptation, demo_plan, generate_plan, next_strategies, understanding_check
from timing import measurements, span
from plan_cache import PlanCache, plan_key
from teaching import SYSTEM_INSTRUCTION

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
app = FastAPI(title="Animind AI", version="1.0.0", description="Adaptive visual lessons for ideal projectile motion.")
origins = [origin.strip() for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if origin.strip()]
if "http://localhost:3000" in origins:
    origins.append("http://127.0.0.1:3000")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"], expose_headers=["Server-Timing"])
store = Store(os.getenv("ANIMIND_DB_PATH", str(BASE_DIR / "data" / "animind.sqlite3")))
plan_cache = PlanCache()


@app.middleware("http")
async def development_timing(request, call_next):
    if os.getenv("ANIMIND_DEV_TIMING") != "1":
        return await call_next(request)
    values = {}
    token = measurements.set(values)
    started = perf_counter()
    try:
        response = await call_next(request)
        values["total"] = (perf_counter() - started) * 1000
        response.headers["Server-Timing"] = ", ".join(f"{name};dur={duration:.2f}" for name, duration in values.items())
        return response
    finally:
        measurements.reset(token)


@app.exception_handler(RequestValidationError)
async def validation_error(_request, error):
    # Do not echo raw input. Non-finite numbers cannot be serialized as valid JSON.
    details = [{"loc": list(item["loc"]), "msg": item["msg"]} for item in error.errors()]
    return JSONResponse(status_code=422, content={"detail": details})


@app.exception_handler(sqlite3.Error)
async def database_error(_request, error):
    logging.error("Local database failure (%s)", type(error).__name__)
    return JSONResponse(status_code=503, content={"detail": "The local lesson store is unavailable. Close duplicate backend processes and try again."})


def render_steps(steps, prefix: str) -> list[Step]:
    return [Step(**step.model_dump(), id=f"{prefix}-{index + 1}", equation=EQUATIONS[step.equation_key]) for index, step in enumerate(steps)]


@app.get("/health", response_model=HealthResponse)
def health():
    environment = dotenv_values(BASE_DIR / ".env")
    names = ("GEMINI_API_KEY", "GEMINI_MODEL")
    file_matches = None
    if all(name in environment for name in names):
        file_matches = all(os.getenv(name, "").strip() == (environment[name] or "").strip() for name in names)
    return HealthResponse(
        gemini_configured=bool(os.getenv("GEMINI_API_KEY", "").strip()),
        gemini_model_configured=bool(os.getenv("GEMINI_MODEL", "").strip()),
        supported_scenes=["trajectories", "components", "range_comparison"],
        process_id=os.getpid(),
        gemini_model=os.getenv("GEMINI_MODEL", "").strip() or None,
        environment_file_matches=file_matches,
    )


@app.get("/api/supported-topics", response_model=list[Topic])
def supported_topics():
    return TOPICS


@app.post("/lesson", response_model=Lesson, include_in_schema=False)
@app.post("/api/lesson", response_model=Lesson)
def create_lesson(request: LessonRequest):
    with span("topic"):
        topic = detect_topic(request.question)
    sources = []
    if request.document_id:
        with span("sources"):
            document = store.get_document(request.document_id, request.session_id)
        topic = request.topic or topic
        if topic not in document["topics"]:
            raise HTTPException(422, "That supported topic wasn't identified in this PDF. Select a detected topic or ask a question without a document.")
        with span("sources"):
            sources = relevant_sources(document, topic)
        if not sources:
            raise HTTPException(422, "No relevant excerpt was found for this topic.")
    elif request.topic and request.topic != topic:
        raise HTTPException(422, "The selected topic and question don't match.")
    scene = {"projectile_motion": "trajectories", "launch_angles": "trajectories", "velocity_components": "components"}[topic]
    with span("physics"):
        metrics = calculate(request.parameters)
        comparison_metrics = comparisons(request.parameters)
    planning_source = "demo"
    if request.mode == "demo":
        plan = demo_plan(scene)
    else:
        context = {
            "task": "initial_lesson", "topic": topic, "question": request.question,
            "parameters": request.parameters.model_dump(), "verified_metrics": metrics.model_dump(),
            "assumptions": ASSUMPTIONS, "pdf_excerpts": [source.model_dump() for source in sources],
        }
        if sources:
            # Uploaded material is deliberately excluded from the reusable plan cache.
            plan, cached = generate_plan(TeachingPlan, context), False
        else:
            key = plan_key(request.session_id, context, os.getenv("GEMINI_MODEL", ""),
                           os.getenv("GEMINI_API_KEY", ""), SYSTEM_INSTRUCTION, TeachingPlan.model_json_schema())
            plan, cached = plan_cache.get_or_create(key, lambda: generate_plan(TeachingPlan, context))
        planning_source = "gemini_cache" if cached else "gemini"
    check = understanding_check("components" if topic == "velocity_components" else "tradeoff")
    lesson = Lesson(
        id=uuid4(), session_id=request.session_id, created_at=datetime.now(timezone.utc).isoformat(),
        topic=topic, title=plan.title, objective=plan.objective, student_question=request.question,
        explanation=plan.explanation, steps=render_steps(plan.steps, "step"), scene=plan.scene,
        parameters=request.parameters, metrics=metrics, comparisons=comparison_metrics,
        assumptions=ASSUMPTIONS, verification=Verification(), suggested_questions=plan.suggested_questions,
        mode=request.mode, planning_source=planning_source, strategy_history=[plan.scene], understanding_check=check, sources=sources,
    )
    with span("store"):
        return store.create_lesson(lesson)


@app.get("/api/lessons", response_model=list[LessonSummary])
def list_lessons(session_id: UUID):
    return store.list_lessons(session_id)


@app.get("/api/lessons/{lesson_id}", response_model=Lesson)
def get_lesson(lesson_id: UUID, session_id: UUID):
    return store.get_lesson(lesson_id, session_id)


@app.post("/api/adapt", response_model=Lesson)
def adapt(request: AdaptRequest):
    lesson = store.get_lesson(request.lesson_id, request.session_id, request.revision)
    selected = next((step for step in lesson.steps if step.id == request.step_id), None)
    if selected is None:
        raise HTTPException(422, "Select a step from the current lesson before asking for another explanation.")
    allowed = next_strategies(lesson, request.confusion)
    if lesson.mode == "demo":
        plan = demo_adaptation(lesson, request.confusion, allowed[0])
    else:
        plan = generate_plan(AdaptivePlan, {
            "task": "adaptive_explanation", "topic": lesson.topic,
            "original_question": lesson.student_question, "lesson_objective": lesson.objective,
            "current_explanation": lesson.explanation, "all_steps": [step.model_dump() for step in lesson.steps],
            "selected_step": selected.model_dump(), "student_feedback": request.confusion,
            "previously_used_strategies": lesson.strategy_history,
            "previous_adaptation": lesson.adaptation.model_dump() if lesson.adaptation else None,
            "current_strategy": lesson.scene, "allowed_new_strategies": allowed,
            "parameters": lesson.parameters.model_dump(), "verified_metrics": lesson.metrics.model_dump(),
            "pdf_excerpts": [source.model_dump() for source in lesson.sources],
        })
        if plan.new_strategy not in allowed:
            raise HTTPException(502, detail={"message": "Gemini repeated a strategy instead of selecting an available alternative. Try again or open a Demo lesson.", "demo_available": True})
    check = understanding_check(plan.check_key)
    adaptation = Adaptation(
        selected_step_id=selected.id, student_confusion=request.confusion,
        misconception_hypothesis=plan.misconception_hypothesis, category=plan.category,
        previous_strategy=lesson.scene, new_strategy=plan.new_strategy, title=plan.title,
        explanation=plan.explanation, parameters=lesson.parameters, understanding_check=check,
    )
    updated = lesson.model_copy(update={
        "scene": plan.new_strategy, "title": plan.title, "explanation": plan.explanation,
        "steps": render_steps(plan.steps, f"adapt-{lesson.revision}"), "adaptation": adaptation,
        "strategy_history": [*lesson.strategy_history, plan.new_strategy][-50:], "understanding_check": check,
        "planning_source": "gemini" if lesson.mode == "gemini" else "demo",
    })
    return store.update_lesson(updated)


@app.post("/api/what-if", response_model=WhatIfResponse)
def what_if(request: WhatIfRequest):
    lesson = store.get_lesson(request.lesson_id, request.session_id, request.revision)
    parameters = parse_what_if(request.question, lesson.parameters) if request.question else Parameters.model_validate(lesson.parameters.model_dump() | request.changes.model_dump(exclude_none=True))
    previous = lesson.metrics
    metrics = calculate(parameters)
    changes = []
    units = {"angle": "°", "speed": " m/s", "gravity": " m/s²"}
    names = {"angle": "launch angle", "speed": "launch speed", "gravity": "gravity"}
    for key in ["angle", "speed", "gravity"]:
        if getattr(parameters, key) != getattr(lesson.parameters, key):
            changes.append(f"{names[key]} changes from {getattr(lesson.parameters, key):g}{units[key]} to {getattr(parameters, key):g}{units[key]}")
    if not changes:
        explanation = "These values match the current simulation. "
    else:
        explanation = " and ".join(changes).capitalize() + ". "
    explanation += f"The range is {metrics.range:.2f} m (previously {previous.range:.2f} m), with {metrics.flight_time:.2f} s of flight and {metrics.horizontal_velocity:.2f} m/s horizontal speed. R = vₓ × T under the stated assumptions."
    check_key = "tradeoff"
    if parameters.gravity != lesson.parameters.gravity:
        check_key = "gravity"
    elif parameters.speed != lesson.parameters.speed:
        check_key = "speed"
    check = understanding_check(check_key)
    updated_adaptation = lesson.adaptation.model_copy(update={"parameters": parameters, "understanding_check": check}) if lesson.adaptation else None
    updated = store.update_lesson(lesson.model_copy(update={
        "parameters": parameters, "metrics": metrics, "comparisons": comparisons(parameters),
        "understanding_check": check, "adaptation": updated_adaptation,
    }))
    return WhatIfResponse(lesson=updated, explanation=explanation, previous_metrics=previous)


@app.post("/api/check-understanding", response_model=CheckResponse)
def check_understanding(request: CheckRequest):
    lesson = store.get_lesson(request.lesson_id, request.session_id, request.revision)
    if request.check_id != lesson.understanding_check.id:
        raise HTTPException(409, "The understanding check has changed. Answer the current question.")
    check = CHECKS[request.check_id]
    answer = request.answer.strip().lower()
    valid_answers = {option_id for option_id, _ in check["options"]}
    correct_text = next(label for option_id, label in check["options"] if option_id == check["answer"])
    correct = answer in {check["answer"], correct_text.lower()}
    if answer not in valid_answers and answer not in {label.lower() for _, label in check["options"]}:
        raise HTTPException(422, "Choose one of the provided answers for this conceptual check.")
    return CheckResponse(
        correct=correct,
        feedback="You've connected the right ideas." if correct else "Let's revisit the relationship with another visual explanation.",
        answer_explanation=check["explanation"],
        suggested_confusion=None if correct else check["confusion"],
    )


@app.post("/api/upload-pdf", response_model=PDFResponse)
def upload_pdf(session_id: UUID = Form(...), file: UploadFile = File(...)):
    try:
        return extract_pdf(file, session_id, store)
    finally:
        file.file.close()
