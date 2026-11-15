import { calculate } from "./physics";
import type { Parameters, SceneType, Step } from "./types";

export const CHAPTERS = ["Knowns", "Components", "Equations", "Motion", "Calculation", "Meaning"];
export const CHAPTER_STARTS = [0, .12, .26, .38, .74, .88];
export const WALKTHROUGH_MS = 18000;
export function visualChapter(progress: number) {
  return Math.max(0, CHAPTER_STARTS.findLastIndex((start) => progress >= start));
}
export function flightProgress(progress: number) {
  return Math.min(1, Math.max(0, (progress - .38) / .36));
}
export function focusProgress(key: Step["equation_key"]) {
  return { components: .16, flight_time: .56, height: .56, range: .8 }[key];
}
export function stepForChapter(steps: Step[], chapter: number, goal: Step["equation_key"]) {
  const key = chapter < 3 ? "components" : chapter === 3 ? "flight_time" : goal;
  const match = steps.findIndex((step) => step.equation_key === key);
  return match >= 0 ? match : Math.min(steps.length - 1, chapter < 3 ? 0 : chapter === 3 ? 1 : steps.length - 1);
}
export function visualEvidence(key: Step["equation_key"], mode: SceneType) {
  if (key === "components") return mode === "range_comparison" ? "Compare the sideways-speed factors in the rows." : "Follow the horizontal and vertical arrows on the selected projectile.";
  if (key === "flight_time") return mode === "range_comparison" ? "Compare each flight time beside its sideways speed." : mode === "components" ? "Follow the ball to landing and read its elapsed flight time." : "Watch which ball is still airborne at the same elapsed time.";
  if (key === "height") return "At the top of the path, vertical velocity is zero; horizontal velocity remains.";
  return mode === "components" ? "The landing point is horizontal velocity multiplied by the full flight time." : "Compare the landing distances: 30° and 60° match; 45° is farthest.";
}
export function walkthrough(parameters: Parameters, chapter: number, goal: Step["equation_key"], mode: SceneType) {
  const m = calculate(parameters);
  const target = goal === "components" ? "range" : goal;
  const goalName = { range: "horizontal range", flight_time: "flight time", height: "maximum height" }[target];
  const equations = { range: "R = vₓT", flight_time: "T = 2vᵧ₀/g", height: "H = vᵧ₀²/(2g)" };
  const answer = { range: `${m.range.toFixed(2)} m`, flight_time: `${m.flight_time.toFixed(2)} s`, height: `${m.max_height.toFixed(2)} m` }[target];
  const substitution = {
    range: `(${m.horizontal_velocity.toFixed(2)} m/s) × (${m.flight_time.toFixed(2)} s)`,
    flight_time: `2 × (${m.vertical_velocity.toFixed(2)} m/s) ÷ (${parameters.gravity} m/s²)`,
    height: `(${m.vertical_velocity.toFixed(2)} m/s)² ÷ (2 × ${parameters.gravity} m/s²)`,
  }[target];
  const rows = [
    { title: "Start with what we know", text: `Launch at ${parameters.speed} m/s and ${parameters.angle}°. Gravity is ${parameters.gravity} m/s² downward. Find the ${goalName}.`, evidence: "The path begins and ends at the same height. Air resistance is ignored.", key: target },
    { title: "Give each direction its own job", text: `vₓ = ${m.horizontal_velocity.toFixed(2)} m/s moves sideways. vᵧ₀ = ${m.vertical_velocity.toFixed(2)} m/s starts the upward motion.`, evidence: visualEvidence("components", mode), key: "components" },
    { title: "Choose equations that fit the model", text: "No horizontal force means constant vₓ. Constant downward gravity gives vᵧ = vᵧ₀ − gt. Equal endpoint heights give T = 2vᵧ₀/g.", evidence: "These assumptions let us connect sideways distance to airtime with R = vₓT.", key: target },
    { title: "Follow the motion, moment by moment", text: "Gravity reduces upward velocity to zero at the apex, then makes it downward. Horizontal velocity stays constant throughout flight.", evidence: mode === "range_comparison" ? "Filled bars show distance so far; outlines show final range. Each bar stops at landing." : "Watch the vertical arrow shrink and reverse; the horizontal arrow keeps its length.", key: "flight_time" },
    { title: "Connect the picture to the calculation", text: `${equations[target]} ≈ ${substitution} ≈ ${answer}.`, evidence: "The displayed values are rounded; the calculation uses full precision.", key: target },
    { title: "Explain what the result means", text: target === "height" ? `The selected launch reaches ${answer} when vᵧ is zero. Gravity still acts there.` : target === "flight_time" ? `The selected launch is airborne for ${answer}. More airtime alone does not guarantee more range.` : `The selected range is ${answer}. At fixed speed and gravity, 45° maximizes range; 30° and 60° have equal range.`, evidence: visualEvidence(target, mode), key: target },
  ];
  return rows[chapter] as {title: string; text: string; evidence: string; key: Step["equation_key"]};
}
