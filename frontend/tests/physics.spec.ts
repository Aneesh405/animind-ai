import { expect, test } from "@playwright/test";
import { calculate, DEFAULT_PARAMETERS, sampleFlight } from "../lib/physics";
import { flightProgress, focusProgress, stepForChapter, visualChapter } from "../lib/walkthrough";
import type { Step } from "../lib/types";

for (const parameters of [DEFAULT_PARAMETERS, {angle: 30, speed: 100, gravity: .1}, {angle: 60, speed: 1, gravity: 50}]) {
  test(`analytic flight, vectors, and complementary ranges at v=${parameters.speed}, g=${parameters.gravity}`, () => {
    const m = calculate(parameters);
    const start = sampleFlight(parameters, 0);
    const up = sampleFlight(parameters, m.flight_time / 4);
    const apex = sampleFlight(parameters, m.flight_time / 2);
    const down = sampleFlight(parameters, 3 * m.flight_time / 4);
    const landed = sampleFlight(parameters, m.flight_time * 2);
    expect(start.x).toBe(0); expect(start.y).toBe(0);
    expect(up.vy).toBeGreaterThan(0); expect(apex.vy).toBeCloseTo(0, 9); expect(down.vy).toBeLessThan(0);
    for (const state of [start, up, apex, down]) expect(state.vx).toBeCloseTo(m.horizontal_velocity, 10);
    expect(apex.y).toBeCloseTo(m.max_height, 8);
    expect(up.y).toBeCloseTo(down.y, 8);
    expect(landed.time).toBe(m.flight_time); expect(landed.x).toBeCloseTo(m.range, 8); expect(landed.y).toBe(0);
    const thirty = calculate(parameters, 30), sixty = calculate(parameters, 60), best = calculate(parameters, 45);
    expect(thirty.range).toBeCloseTo(sixty.range, 8);
    expect(best.range).toBeGreaterThan(sixty.range);
    expect(sixty.flight_time).toBeGreaterThan(thirty.flight_time);
    expect(sixty.horizontal_velocity).toBeLessThan(thirty.horizontal_velocity);
  });
}

test("zero and vertical launches remain finite at the slider boundaries", () => {
  for (const angle of [0, 90]) {
    const p = {...DEFAULT_PARAMETERS, angle};
    const m = calculate(p), state = sampleFlight(p, 1e10);
    expect(m.range).toBeCloseTo(0, 9);
    expect(Object.values(state).every(value => typeof value !== "number" || Number.isFinite(value))).toBe(true);
    expect(state.y).toBe(0);
  }
});

test("walkthrough timing and AI step selection follow equation meaning", () => {
  expect([0,.12,.26,.38,.74,.88,1].map(visualChapter)).toEqual([0,1,2,3,4,5,5]);
  expect([0,.38,.56,.74,1].map(flightProgress)).toEqual([0,0,expect.closeTo(.5),1,1]);
  const steps = ["range", "components", "flight_time"].map((key, i) => ({id: String(i), equation_key:key})) as Step[];
  expect(stepForChapter(steps, 1, "range")).toBe(1);
  expect(stepForChapter(steps, 3, "range")).toBe(2);
  expect(stepForChapter(steps, 4, "range")).toBe(0);
  expect(focusProgress("components")).toBe(.16);
  expect(visualChapter(focusProgress("range"))).toBe(4);
});
