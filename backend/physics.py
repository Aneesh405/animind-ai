"""Only canonical, equal-height projectile equations enter the renderer."""

import math
import re
from functools import lru_cache

import sympy as sp
from fastapi import HTTPException
from pydantic import ValidationError

from schemas import Metrics, Parameters, ParameterChange, Topic, TopicId

ASSUMPTIONS = [
    "Equal launch and landing heights",
    "No air resistance",
    "Constant downward gravity",
    "Fixed launch speed when comparing angles",
]
EQUATIONS = {
    "components": "vₓ = v₀ cos(θ)    vᵧ₀ = v₀ sin(θ)",
    "flight_time": "T = 2v₀ sin(θ) / g",
    "range": "R = v₀² sin(2θ) / g = vₓ × T",
    "height": "H = v₀² sin²(θ) / (2g)",
}
TOPICS = [
    Topic(id="projectile_motion", name="Projectile motion", description="Follow a launch from takeoff to landing.", example="Why does a projectile travel farthest at 45 degrees?"),
    Topic(id="launch_angles", name="Launch-angle comparison", description="Compare distance, airtime, and height.", example="Why doesn't a 60 degree launch go farther than 45 degrees?"),
    Topic(id="velocity_components", name="Velocity components", description="Resolve launch velocity into horizontal and vertical parts.", example="How do horizontal and vertical velocity affect a projectile?"),
]
UNSUPPORTED = "This MVP supports ideal, equal-height projectile motion, launch-angle comparisons, and initial velocity components. Try ‘Why does a projectile travel farthest at 45 degrees?’"


def reject_unsupported_model(text: str) -> None:
    normalized = text.lower()
    normalized = re.sub(r"(?:no|without|ignore|ignoring|neglect|neglecting)\s+(?:any\s+)?(?:air resistance|drag|wind)", "", normalized)
    normalized = re.sub(r"(?:equal|same)\s+(?:launch\s+and\s+landing\s+)?heights?", "", normalized)
    if re.search(r"\b(cliff|roof|unequal|different heights|air resistance|drag|wind|bounce|orbital|relativistic|inclined|slope)\b|\bfrom (?:a )?height\b", normalized):
        raise HTTPException(422, "This model requires equal launch and landing heights, constant gravity, and no air resistance. The requested physics needs a different model.")


def detect_topic(text: str) -> TopicId:
    reject_unsupported_model(text)
    text = text.lower()
    if re.search(r"\b(projectile|trajectory|trajectories|ballistic)\b", text):
        if re.search(r"\b(components?|horizontal|vertical)\b", text):
            return "velocity_components"
        return "projectile_motion"
    if re.search(r"\b(?:velocity|speed) components?\b|\b(?:horizontal|vertical) velocity\b", text):
        return "velocity_components"
    has_angle = bool(re.search(r"\b\d+(?:\.\d+)?\s*(?:degrees?|°)|\blaunch angles?\b", text))
    unrelated_context = re.search(r"\b(functions?|triangles?|geometry|celsius|fahrenheit)\b", text)
    if has_angle and not unrelated_context and re.search(r"\b(launch|range|farther|farthest|further|distance|better)\b", text):
        return "launch_angles"
    if re.search(r"\b(?:launch|throw|thrown|launched)\b", text) and re.search(r"\b(ball|gravity|angle|speed|range|time|height|velocity)\b", text):
        return "projectile_motion"
    raise HTTPException(422, UNSUPPORTED)


@lru_cache(maxsize=1)
def verify_formulas() -> bool:
    angle = sp.Symbol("theta", real=True)
    speed, gravity = sp.symbols("v g", positive=True)
    horizontal = speed * sp.cos(angle)
    flight = 2 * speed * sp.sin(angle) / gravity
    distance = speed**2 * sp.sin(2 * angle) / gravity
    checks = [
        sp.trigsimp(horizontal * flight - distance) == 0,
        sp.simplify(distance - distance.subs(angle, sp.pi / 2 - angle)) == 0,
        sp.simplify(sp.diff(distance, angle).subs(angle, sp.pi / 4)) == 0,
        sp.simplify(sp.diff(distance, angle, 2).subs(angle, sp.pi / 4)) == -4 * speed**2 / gravity,
    ]
    if not all(checks):
        raise RuntimeError("Canonical projectile equations failed symbolic verification.")
    return True


def calculate(parameters: Parameters, angle: float | None = None) -> Metrics:
    verify_formulas()
    theta = parameters.angle if angle is None else angle
    radians = math.radians(theta)
    vx = parameters.speed * math.cos(radians)
    vy = parameters.speed * math.sin(radians)
    flight = 2 * vy / parameters.gravity
    return Metrics(
        angle=theta,
        horizontal_velocity=round(vx, 8),
        vertical_velocity=round(vy, 8),
        flight_time=round(flight, 8),
        range=round(vx * flight, 8),
        max_height=round(vy**2 / (2 * parameters.gravity), 8),
    )


def comparisons(parameters: Parameters) -> list[Metrics]:
    return [calculate(parameters, angle) for angle in [30, 45, 60]]


def parse_what_if(question: str, current: Parameters) -> Parameters:
    reject_unsupported_model(question)
    text = question.lower().replace("−", "-")
    aliases = {
        "gravity": r"(?:gravity|gravitational acceleration)",
        "speed": r"(?:initial (?:velocity|speed)|launch (?:velocity|speed)|speed)",
        "angle": r"(?:launch angle|angle|launch(?:ed)? at)",
    }
    changes: dict[str, float] = {}
    for name, alias in aliases.items():
        assignment = re.search(alias + r"\s*(?:(?:increases?|decreases?|changes?)\s+)?(?:to\s*|=\s*|is\s*|at\s*)?(-?\d+(?:\.\d+)?)", text)
        relative = re.search(alias + r"\s+(doubles?|triples?|halves?|is halved|is doubled)", text)
        if assignment:
            changes[name] = float(assignment.group(1))
        elif relative:
            factor = {"double": 2, "doubles": 2, "is doubled": 2, "triple": 3, "triples": 3, "halve": 0.5, "halves": 0.5, "is halved": 0.5}[relative.group(1)]
            changes[name] = getattr(current, name) * factor
    if "angle" not in changes:
        angle = re.search(r"(?:launch|angle)\D{0,15}(-?\d+(?:\.\d+)?)\s*(?:degrees?|°)", text)
        if angle:
            changes["angle"] = float(angle.group(1))
    if not changes:
        raise HTTPException(422, "Try ‘What happens if gravity doubles?’, ‘Launch at 60 degrees’, or ‘Set initial speed to 25 m/s’. Include a specific value or a multiplier.")
    try:
        validated = ParameterChange.model_validate(changes)
        return Parameters.model_validate(current.model_dump() | validated.model_dump(exclude_none=True))
    except ValidationError:
        raise HTTPException(422, "Use an angle from 0–90°, speed from 1–100 m/s, and gravity from 0.1–50 m/s².") from None
