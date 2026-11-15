"""The API and planner share an explicit, bounded lesson vocabulary."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

SceneType = Literal["trajectories", "components", "range_comparison"]
TopicId = Literal["projectile_motion", "launch_angles", "velocity_components"]
Mode = Literal["demo", "gemini"]
EquationKey = Literal["components", "flight_time", "range", "height"]
CheckKey = Literal["tradeoff", "complementary", "gravity", "speed", "components"]
Category = Literal[
    "formula_interpretation", "missing_prerequisite", "variable_relationships",
    "physical_intuition", "algebraic_manipulation", "graph_interpretation",
    "incorrect_assumption", "unclear_explanation",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class Parameters(StrictModel):
    angle: float = Field(default=45, ge=0, le=90)
    speed: float = Field(default=20, ge=1, le=100)
    gravity: float = Field(default=9.81, ge=0.1, le=50)


class ParameterChange(StrictModel):
    angle: float | None = Field(default=None, ge=0, le=90)
    speed: float | None = Field(default=None, ge=1, le=100)
    gravity: float | None = Field(default=None, ge=0.1, le=50)


class Metrics(StrictModel):
    angle: float
    horizontal_velocity: float
    vertical_velocity: float
    flight_time: float
    range: float
    max_height: float


class Verification(StrictModel):
    status: Literal["verified"] = "verified"
    method: str = "Canonical formulas checked symbolically with SymPy. Values calculated deterministically."
    scope: str = "Verification covers equations and computed values. Tutor prose is explanatory content."


class PlanStep(StrictModel):
    title: str = Field(min_length=3, max_length=100)
    text: str = Field(min_length=10, max_length=650)
    equation_key: EquationKey


class TeachingPlan(StrictModel):
    title: str = Field(min_length=5, max_length=140)
    objective: str = Field(min_length=10, max_length=400)
    explanation: str = Field(min_length=15, max_length=900)
    scene: SceneType
    steps: list[PlanStep] = Field(min_length=3, max_length=5)
    suggested_questions: list[str] = Field(min_length=1, max_length=3)


class AdaptivePlan(StrictModel):
    misconception_hypothesis: str = Field(min_length=10, max_length=600)
    category: Category
    new_strategy: SceneType
    title: str = Field(min_length=5, max_length=140)
    explanation: str = Field(min_length=15, max_length=1200)
    steps: list[PlanStep] = Field(min_length=3, max_length=5)
    check_key: CheckKey


class Step(PlanStep):
    id: str
    equation: str


class CheckOption(StrictModel):
    id: str
    label: str


class UnderstandingCheck(StrictModel):
    id: CheckKey
    question: str
    options: list[CheckOption]


class Adaptation(StrictModel):
    selected_step_id: str
    student_confusion: str
    misconception_hypothesis: str
    category: Category
    previous_strategy: SceneType
    new_strategy: SceneType
    title: str
    explanation: str
    parameters: Parameters
    understanding_check: UnderstandingCheck


class SourceReference(StrictModel):
    filename: str
    page: int
    excerpt: str


class Lesson(StrictModel):
    id: UUID
    session_id: UUID
    revision: int = 1
    created_at: str
    topic: TopicId
    title: str
    objective: str
    student_question: str
    explanation: str
    steps: list[Step]
    scene: SceneType
    parameters: Parameters
    metrics: Metrics
    comparisons: list[Metrics]
    assumptions: list[str]
    verification: Verification
    suggested_questions: list[str]
    mode: Mode
    strategy_history: list[SceneType]
    adaptation: Adaptation | None = None
    understanding_check: UnderstandingCheck
    sources: list[SourceReference] = Field(default_factory=list)


class LessonRequest(StrictModel):
    session_id: UUID
    question: str = Field(min_length=3, max_length=1500)
    mode: Mode = "demo"
    parameters: Parameters = Field(default_factory=Parameters)
    document_id: UUID | None = None
    topic: TopicId | None = None


class LessonMutation(StrictModel):
    session_id: UUID
    lesson_id: UUID
    revision: int = Field(ge=1)


class AdaptRequest(LessonMutation):
    step_id: str = Field(min_length=1, max_length=80)
    confusion: str = Field(min_length=3, max_length=1500)


class WhatIfRequest(LessonMutation):
    question: str = Field(default="", max_length=500)
    changes: ParameterChange | None = None

    @model_validator(mode="after")
    def require_change(self):
        if not self.question and (self.changes is None or not self.changes.model_dump(exclude_none=True)):
            raise ValueError("Enter a what-if question or a parameter change.")
        if self.question and self.changes is not None:
            raise ValueError("Send either a question or explicit changes in one request.")
        return self


class WhatIfResponse(StrictModel):
    lesson: Lesson
    explanation: str
    previous_metrics: Metrics


class CheckRequest(LessonMutation):
    check_id: CheckKey
    answer: str = Field(min_length=1, max_length=500)


class CheckResponse(StrictModel):
    correct: bool
    feedback: str
    answer_explanation: str
    suggested_confusion: str | None = None


class Topic(StrictModel):
    id: TopicId
    name: str
    description: str
    example: str


class PDFResponse(StrictModel):
    id: UUID
    filename: str
    title: str
    page_count: int
    topics: list[Topic]
    references: list[SourceReference]
    notice: str


class LessonSummary(StrictModel):
    id: UUID
    title: str
    topic: TopicId
    mode: Mode
    created_at: str


class HealthResponse(StrictModel):
    status: Literal["ok"] = "ok"
    gemini_configured: bool
    gemini_model_configured: bool
    supported_scenes: list[SceneType]
    process_id: int | None = None
    gemini_model: str | None = None
    environment_file_matches: bool | None = None
