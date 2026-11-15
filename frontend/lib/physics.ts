import type { Metrics, Parameters } from "./types";

export const DEFAULT_PARAMETERS: Parameters = {
  angle: 45,
  speed: 20,
  gravity: 9.81,
};

export function calculate(
  parameters: Parameters,
  angle = parameters.angle,
): Metrics {
  const radians = (angle * Math.PI) / 180;
  const horizontal = parameters.speed * Math.cos(radians);
  const vertical = parameters.speed * Math.sin(radians);
  const time = (2 * vertical) / parameters.gravity;
  return {
    angle,
    horizontal_velocity: horizontal,
    vertical_velocity: vertical,
    flight_time: time,
    range: horizontal * time,
    max_height: vertical ** 2 / (2 * parameters.gravity),
  };
}

export function sameParameters(left: Parameters, right: Parameters): boolean {
  return (
    left.angle === right.angle &&
    left.speed === right.speed &&
    left.gravity === right.gravity
  );
}

/** Analytic flight, clamped at first return to launch height; no bounce model. */
export function sampleFlight(parameters: Parameters, elapsed: number, angle = parameters.angle) {
  const metrics = calculate(parameters, angle);
  const time = Math.max(0, Math.min(elapsed, metrics.flight_time));
  return {
    time,
    x: metrics.horizontal_velocity * time,
    y: Math.max(0, metrics.vertical_velocity * time - parameters.gravity * time ** 2 / 2),
    vx: metrics.horizontal_velocity,
    vy: metrics.vertical_velocity - parameters.gravity * time,
    landed: elapsed >= metrics.flight_time,
  };
}

export const SCENE_NAMES = {
  trajectories: "Trajectory comparison",
  components: "Velocity components in flight",
  range_comparison: "Range comparison",
};
