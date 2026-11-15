/** Trusted components only. Gemini supplies data, never component names or code. */
import type { ComponentType } from "react";
import type { Concept } from "../../lib/visualizations";
import ProjectileScene from "../ProjectileScene";
import FunctionGraph from "./FunctionGraph";
import PhysicsModels from "./PhysicsModels";
import LifeDiagrams from "./LifeDiagrams";
import BubbleSort from "./BubbleSort";

// Inference retains each component's concrete prop contract. `never` allows
// heterogeneous props without erasing them to `any` at the registry boundary.
export const visualizerComponents = {
  projectile_motion: ProjectileScene,
  linear_function: FunctionGraph,
  quadratic_function: FunctionGraph,
  simple_pendulum: PhysicsModels,
  newtons_second_law: PhysicsModels,
  water_molecule: LifeDiagrams,
  animal_cell: LifeDiagrams,
  bubble_sort: BubbleSort,
} satisfies Record<Concept, ComponentType<never>>;

export const interactions: Record<Concept, readonly string[]> = {
  projectile_motion: ["angle", "speed", "gravity", "playback", "lesson focus"],
  linear_function: ["slope", "intercept"],
  quadratic_function: ["a", "b", "c"],
  simple_pendulum: [
    "length",
    "initial angle",
    "gravity",
    "play",
    "pause",
    "reset",
  ],
  newtons_second_law: ["mass", "signed net force"],
  water_molecule: ["select atom", "select bond"],
  animal_cell: ["select organelle"],
  bubble_sort: ["array input", "next", "previous", "play", "pause", "reset"],
};
