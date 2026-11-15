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

export const SCENE_NAMES = {
  trajectories: "Trajectory comparison",
  components: "Velocity decomposition",
  range_comparison: "Range comparison",
};
