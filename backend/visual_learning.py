"""Bounded multi-subject lessons. No generated code is accepted or executed."""
import os
import re
from typing import Annotated, Literal
from uuid import UUID
from fastapi import APIRouter, HTTPException
from pydantic import Field, model_validator
from schemas import StrictModel, Mode, Parameters
from teaching import generate_plan
from plan_cache import PlanCache, plan_key
from written_references import REFERENCES

visual_cache = PlanCache()
VISUAL_INSTRUCTION = "You are a careful multi-subject educator. Follow the supplied schema and trusted scientific reference. Never supply code or an unrelated visualization."

Subject = Literal['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science']
Concept = Literal['projectile_motion', 'linear_function', 'quadratic_function', 'simple_pendulum', 'newtons_second_law', 'water_molecule', 'animal_cell', 'bubble_sort']

class Linear(StrictModel):
    m: float = Field(default=1, ge=-10, le=10)
    b: float = Field(default=0, ge=-10, le=10)

class Quadratic(StrictModel):
    a: float = Field(default=1, ge=-5, le=5)
    b: float = Field(default=0, ge=-10, le=10)
    c: float = Field(default=0, ge=-10, le=10)

class Pendulum(StrictModel):
    length: float = Field(default=1, ge=0.2, le=5)
    angle: float = Field(default=10, ge=-15, le=15)
    gravity: float = Field(default=9.81, ge=0.1, le=25)

class Newton(StrictModel):
    mass: float = Field(default=2, ge=0.1, le=20)
    force: float = Field(default=6, ge=-20, le=20)

class Diagram(StrictModel):
    pass

class Bubble(StrictModel):
    values: list[int] = Field(default_factory=lambda: [5, 1, 4, 2, 8], min_length=2, max_length=12)

    @model_validator(mode='after')
    def bound_values(self):
        if any(abs(v) > 99 for v in self.values):
            raise ValueError('Array values must be between -99 and 99')
        return self

PARAMETERS = {'projectile_motion': Parameters, 'linear_function': Linear, 'quadratic_function': Quadratic, 'simple_pendulum': Pendulum, 'newtons_second_law': Newton, 'water_molecule': Diagram, 'animal_cell': Diagram, 'bubble_sort': Bubble}
CONTENT = {
 'projectile_motion': ('Projectile motion', 'For ideal motion with equal launch and landing heights and no air resistance, gravity changes vertical velocity while horizontal velocity stays constant.', ['Resolve launch velocity into horizontal and vertical components.', 'Use vertical motion to find flight time, then multiply by horizontal velocity to find range.'], 'Why do complementary launch angles have equal range?'),
 'water_molecule': ('Water molecule', 'H₂O contains one oxygen atom and two hydrogen atoms. The molecule is bent, with an H–O–H angle of about 104.5°. Each O–H bond is a polar covalent bond.', ['Select oxygen: oxygen attracts the shared electrons more strongly than hydrogen.', 'Select a hydrogen or an O–H bond. A covalent bond represents a shared electron pair.', 'The bent shape means the bond dipoles do not cancel. This makes water polar. This simplified ball-and-stick diagram does not show electron clouds or lone pairs.'], 'Why do the two bond dipoles fail to cancel?'),
 'animal_cell': ('Animal cell', 'Animal cells contain specialized structures called organelles. Select a labeled component to discover its function. This is a simplified diagram and is not drawn to scale.', ['The cell membrane selectively controls exchange with the surroundings. Cytoplasm includes the fluid and structures inside the membrane, excluding the nucleus.', 'The nucleus houses most cellular DNA. Mitochondria support cellular respiration and produce much of the cell’s ATP.', 'Ribosomes synthesize proteins by translating messenger RNA. They can be free in the cytosol or associated with rough endoplasmic reticulum.'], 'Which structure builds proteins, and which houses most DNA?'),
 'bubble_sort': ('Bubble sort', 'Bubble sort compares adjacent elements and swaps them when the left value is greater. After a pass, the largest unsorted value is in its final position.', ['Watch the highlighted adjacent pair. A comparison tests whether the left value exceeds the right.', 'A swap exchanges only an out-of-order pair. Move backward to inspect the preceding array state.', 'Repeat passes over the unsorted prefix. The algorithm stops when a pass has no swaps. Worst-case time is quadratic and the sort is stable.'], 'Why can a full pass with no swaps end the algorithm?'),
 'simple_pendulum': ('Simple pendulum', 'A pendulum exchanges gravitational potential energy and kinetic energy. For small angles, its angular displacement follows a sinusoid with period T = 2π√(L/g).', ['Adjust length in metres. A longer pendulum has a longer period.', 'Adjust gravity in m/s². Stronger gravity shortens the period.', 'The model uses the small-angle approximation, limited here to ±15°. It neglects damping and assumes a point mass on a massless rigid rod.'], 'If length quadruples, what happens to the period?'),
 'newtons_second_law': ("Newton’s second law", 'Acceleration equals net force divided by mass: a = F/m. The sign of the force determines the direction of acceleration.', ['Adjust mass in kilograms while holding net force fixed. Greater mass gives smaller acceleration.', 'Reverse the sign of net force to reverse acceleration. Zero net force gives zero acceleration.', 'The diagram displays net force and acceleration only. No friction or other individual forces are simulated.'], 'What happens to acceleration if mass doubles at fixed net force?'),
 'linear_function': ('Linear functions', 'A linear function has a constant rate of change. In y = mx + b, m is the slope and b is the y-intercept.', ['Change m to rotate the line. Slope is the change in y divided by the change in x.', 'Change b to move the line vertically. The line crosses the y-axis at (0, b).'], 'What happens to y when x increases by one?'),
 'quadratic_function': ('Quadratic functions', 'In y = ax² + bx + c, a controls the opening and curvature. When a is zero the expression becomes linear or constant.', ['Change a: positive opens upward and negative opens downward.', 'For nonzero a, the vertex has x = −b/(2a). The vertical line through it is the axis of symmetry.', 'Real x-intercepts exist when b² − 4ac is nonnegative.'], 'How does changing the sign of a change the graph?'),
}

class VisualRequest(StrictModel):
    session_id: UUID
    subject: Subject
    question: str = Field(min_length=3, max_length=1500)
    concept: Concept | None = None
    mode: Mode = 'demo'

class VisualPlan(StrictModel):
    title: str = Field(min_length=3, max_length=140)
    explanation: str = Field(min_length=15, max_length=1500)
    steps: list[Annotated[str, Field(min_length=5, max_length=650)]] = Field(min_length=2, max_length=5)
    comprehension_question: str = Field(min_length=5, max_length=300)
    concept: Concept | None = None
    planning_source: Literal['demo', 'gemini', 'gemini_cache', 'reference'] = 'demo'
    parameters: dict[str, float | list[int]] = Field(default_factory=dict)

    @model_validator(mode='after')
    def validate_parameters(self):
        if self.concept in PARAMETERS:
            self.parameters = PARAMETERS[self.concept].model_validate(self.parameters).model_dump()
        elif self.parameters:
            raise ValueError('Parameters require a supported visualizer')
        return self


def route(request: VisualRequest):
    # Explicit concept IDs from curated cards take precedence; arbitrary questions
    # use conservative recognition. Ambiguity goes to explanation, never projectile.
    subjects = {'linear_function': 'Mathematics', 'quadratic_function': 'Mathematics', 'projectile_motion': 'Physics', 'simple_pendulum': 'Physics', 'newtons_second_law': 'Physics', 'water_molecule': 'Chemistry', 'animal_cell': 'Biology', 'bubble_sort': 'Computer Science'}
    if request.concept:
        if subjects[request.concept] != request.subject:
            raise HTTPException(422, 'Concept does not belong to selected subject.')
        return request.concept
    q = request.question.lower()
    # Recognizing a supported word does not make a more complex model supported.
    if request.subject == 'Mathematics' and re.search(r'\b(cubic|quartic|sin|cos|tan|log|exp|sqrt)\b|x\s*\^\s*[3-9]', q): return None
    model_q = re.sub(r'\b(?:no|without|ignore|ignoring|neglect|neglecting)\s+(?:any\s+)?(?:air resistance|drag|friction)\b', '', q)
    if request.subject == 'Physics' and re.search(r'\b(double|coupled|damped|driven|forced|inverted|elastic)\b|\b(air resistance|drag|friction|relativistic)\b', model_q): return None
    if request.subject == 'Chemistry' and re.search(r'\b(methane|ethanol|ammonia|carbon dioxide|hydrogen peroxide|co2|h2o2)\b', q): return None
    if request.subject == 'Biology' and re.search(r'\bplant cell\b', q): return None
    if request.subject == 'Chemistry' and re.search(r'\bwater molecule\b|\bh[2₂]o\b', q): return 'water_molecule'
    if request.subject == 'Biology' and re.search(r'\banimal cell\b', q): return 'animal_cell'
    if request.subject == 'Computer Science' and re.search(r'\bbubble sort\b', q): return 'bubble_sort'
    if request.subject == 'Mathematics':
        if re.search(r'\b(quadratic|parabola)\b|x²|\bx\s*\^\s*2\b', q):
            return 'quadratic_function'
        if re.search(r'\blinear (function|equation)\b|y\s*=\s*mx\s*\+\s*b', q):
            return 'linear_function'
    if request.subject == 'Physics':
        if re.search(r'\bpendulum\b', q): return 'simple_pendulum'
        if re.search(r"newton(?:['’]s|s)? second law|\bf\s*=\s*ma\b", q): return 'newtons_second_law'
    if request.subject == 'Physics' and re.search(r'\bprojectile\b', q):
        return 'projectile_motion'
    return None

router = APIRouter()

@router.post('/api/visual-lesson', response_model=VisualPlan)
def visual_lesson(request: VisualRequest):
    concept = route(request)
    if concept in CONTENT:
        title, explanation, steps, check = CONTENT[concept]
    else:
        title = f'{request.subject}: explanation only'
        explanation = 'This topic has no matched interactive diagram. Demo mode contains a limited set of written reference lessons. Start by identifying the quantities or structures involved, describe their relationships, and check them against a concrete example. Select Gemini mode for a tailored explanation of your question.'
        steps = ['Identify the central idea and define the terms in your question.', 'Describe a concrete example and explain how the relationships apply to it.']
        reference = REFERENCES.get(request.subject)
        if reference and reference[0] in request.question.lower():
            explanation, steps = reference[1], reference[2]
        check = 'Can you explain the central relationship in your own words?'
    fallback = VisualPlan(title=title, explanation=explanation, steps=steps, comprehension_question=check, concept=concept, parameters={})
    # The established projectile API owns its Gemini plan, metrics and history.
    # Return routing data here without generating a plan that would be discarded.
    if request.mode == 'demo' or concept == 'projectile_motion':
        return fallback
    try:
        context = {'task': 'multi_subject_lesson', 'subject': request.subject, 'question': request.question, 'allowed_concept': concept, 'instructions': 'Teach the requested subject. Use only allowed_concept or null. Supply ordered teaching steps, a comprehension question, and bounded parameters. No code. For unsupported topics give a useful written explanation.', 'trusted_reference': fallback.model_dump()}
        key = plan_key(request.session_id, context, os.getenv('GEMINI_MODEL', ''), os.getenv('GEMINI_API_KEY', ''), VISUAL_INSTRUCTION, VisualPlan.model_json_schema())
        plan, cached = visual_cache.get_or_create(key, lambda: generate_plan(VisualPlan, context, system_instruction=VISUAL_INSTRUCTION))
        plan = plan.model_copy(update={'planning_source': 'gemini_cache' if cached else 'gemini'})
        if plan.concept != concept:
            return plan.model_copy(update={'concept': None, 'parameters': {}})
        return plan
    except HTTPException as error:
        if error.status_code == 502 and (not isinstance(error.detail, dict) or error.detail.get('code') == 'invalid_plan'):
            return fallback.model_copy(update={'concept': None, 'parameters': {}, 'planning_source': 'reference', 'explanation': fallback.explanation + ' The generated lesson could not be validated; showing the written reference.'})
        raise
