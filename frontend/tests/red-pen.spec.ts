import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { calculate, DEFAULT_PARAMETERS, sampleFlight } from "../lib/physics";
import {
  RED_PEN_CHALLENGES,
  validateRedPenBank,
} from "../lib/redPenChallenges";

function challengePanel(page: Page) {
  return page.getByTestId("red-pen-challenge");
}

async function openChallenge(page: Page) {
  await page.getByRole("button", { name: "Try Red Pen Challenge" }).click();
  await expect(challengePanel(page)).toBeVisible();
}

async function chooseAndCheck(panel: Locator, statement: string) {
  await panel.getByRole("radio", { name: statement, exact: true }).check();
  await panel.getByRole("button", { name: "Check Answer" }).click();
}

async function setTimeline(scope: Locator, value: number) {
  const timeline = scope.getByLabel("Animation timeline");
  await timeline.evaluate((element, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      element,
      String(next),
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await expect(timeline).toHaveValue(String(value));
}

test("verified Red Pen bank contains three bounded challenges with one indexed misconception each", () => {
  expect(validateRedPenBank()).toBe(true);
  expect(RED_PEN_CHALLENGES).toHaveLength(3);
  expect(RED_PEN_CHALLENGES.map((challenge) => challenge.id)).toEqual([
    "maximum-range",
    "velocity-at-apex",
    "complementary-ranges",
  ]);
  for (const challenge of RED_PEN_CHALLENGES) {
    expect(challenge.statements).toHaveLength(3);
    expect(challenge.incorrectStatementIndex).toBeGreaterThanOrEqual(0);
    expect(challenge.incorrectStatementIndex).toBeLessThan(3);
    expect(challenge.statements[challenge.incorrectStatementIndex].rationale).toContain(
      "misconception",
    );
    expect(challenge.assumptions.length).toBeGreaterThanOrEqual(4);
  }
});

test("Red Pen claims match the deterministic projectile model", () => {
  const thirty = calculate(DEFAULT_PARAMETERS, 30);
  const fortyFive = calculate(DEFAULT_PARAMETERS, 45);
  const sixty = calculate(DEFAULT_PARAMETERS, 60);
  expect(fortyFive.range).toBeGreaterThan(thirty.range);
  expect(fortyFive.range).toBeGreaterThan(sixty.range);
  expect(thirty.range).toBeCloseTo(sixty.range, 8);
  expect(sixty.flight_time).toBeGreaterThan(thirty.flight_time);
  expect(sixty.max_height).toBeGreaterThan(thirty.max_height);
  expect(thirty.horizontal_velocity).toBeGreaterThan(sixty.horizontal_velocity);

  const apex = sampleFlight(DEFAULT_PARAMETERS, fortyFive.flight_time / 2, 45);
  expect(apex.vy).toBeCloseTo(0, 9);
  expect(apex.vx).toBeCloseTo(fortyFive.horizontal_velocity, 9);
  expect(apex.vx).toBeGreaterThan(0);
});

test("complete Red Pen journey retries gently and proves all three corrections with SVG physics", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await expect(page.getByTestId("lesson-mode")).toHaveText("Demo lesson");
  await expect(page.getByText("A 60° launch travels farther than 45° because it stays in the air longer.", { exact: true })).toHaveCount(0);

  const teachingRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/(lesson|adapt)$/.test(request.url())) teachingRequests.push(request.url());
  });
  await openChallenge(page);
  const panel = challengePanel(page);
  await expect(panel.getByRole("heading", { name: "The AI made a mistake. Can you catch it?" })).toBeVisible();
  await expect(panel).toContainText("Regular AniMind lessons remain scientifically verified.");
  await expect(panel).toContainText("Challenge 1 of 3");
  await expect(panel.getByRole("radio")).toHaveCount(3);
  await expect(panel.getByRole("button", { name: "Check Answer" })).toBeDisabled();

  await chooseAndCheck(panel, "A 45° launch produces the greatest horizontal range.");
  await expect(panel.getByRole("status")).toContainText("That statement is scientifically accurate.");
  await expect(panel.getByRole("button", { name: "Try again" })).toBeVisible();
  await panel.getByRole("button", { name: "Try again" }).click();
  await chooseAndCheck(panel, "A 60° launch travels farther than 45° because it stays in the air longer.");
  await expect(panel.getByRole("status")).toContainText("You caught the misconception.");
  await expect(panel.getByTestId("red-pen-correction")).toContainText("45° gives the greatest");
  await panel.getByRole("button", { name: "Show Me Why" }).click();
  let proof = panel.getByTestId("red-pen-visual");
  await expect(proof.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "trajectories");
  await expect(proof.locator(".scene-canvas polyline")).toHaveCount(3);
  await expect(proof.getByTestId("red-pen-evidence-30")).toContainText("35.31 m range");
  await expect(proof.getByTestId("red-pen-evidence-45")).toContainText("40.77 m range");
  await expect(proof.getByTestId("red-pen-evidence-60")).toContainText("35.31 m range");

  await panel.getByRole("button", { name: "Next Challenge" }).click();
  await expect(panel).toContainText("Challenge 2 of 3");
  await expect(panel.getByRole("heading", { name: "What stops at the top?" })).toBeVisible();
  await chooseAndCheck(panel, "At the highest point, both horizontal and vertical velocity are zero.");
  await panel.getByRole("button", { name: "Show Me Why" }).click();
  proof = panel.getByTestId("red-pen-visual");
  await expect(proof.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "components");
  await setTimeline(proof, 0.5);
  await expect(proof.getByTestId("vy-readout")).toContainText("0.00");
  await expect(proof.getByTestId("vx-readout")).toContainText("14.14");
  const gravity = proof.getByTestId("gravity-vector");
  expect(Number(await gravity.getAttribute("y2"))).toBeGreaterThan(
    Number(await gravity.getAttribute("y1")),
  );

  await panel.getByRole("button", { name: "Next Challenge" }).click();
  await expect(panel).toContainText("Challenge 3 of 3");
  await expect(panel.getByRole("heading", { name: "Same landing, same journey?" })).toBeVisible();
  await chooseAndCheck(panel, "Because their ranges are equal, the 30° and 60° launches follow the same path.");
  await panel.getByRole("button", { name: "Show Me Why" }).click();
  proof = panel.getByTestId("red-pen-visual");
  await expect(proof.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "trajectories");
  await expect(proof.locator(".scene-canvas polyline")).toHaveCount(2);
  const evidence30 = await proof.getByTestId("red-pen-evidence-30").innerText();
  const evidence60 = await proof.getByTestId("red-pen-evidence-60").innerText();
  expect(evidence30).toContain("35.31 m range");
  expect(evidence60).toContain("35.31 m range");
  expect(evidence30).toContain("2.04 s flight");
  expect(evidence60).toContain("3.53 s flight");
  await panel.getByRole("button", { name: "Finish Challenge" }).click();
  await expect(panel).toContainText("CHALLENGE COMPLETE");
  await expect(panel).toContainText("You caught 2 of 3 misconceptions on the first try.");
  await expect(panel.getByRole("button", { name: "Play again" })).toBeVisible();
  expect(teachingRequests).toEqual([]);
});

test("reveal path names the misconception and still offers visual proof", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await openChallenge(page);
  const panel = challengePanel(page);
  await chooseAndCheck(panel, "Horizontal range depends on both sideways speed and time in the air.");
  await panel.getByRole("button", { name: "Reveal the misconception" }).click();
  await expect(panel.getByTestId("red-pen-correction")).toContainText(
    "A 60° launch travels farther than 45°",
  );
  await expect(panel.getByRole("button", { name: "Show Me Why" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Next Challenge" })).toBeVisible();
});

test("Red Pen is keyboard-accessible, responsive, and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await openChallenge(page);
  const panel = challengePanel(page);
  const misconception = panel.getByRole("radio", {
    name: "A 60° launch travels farther than 45° because it stays in the air longer.",
    exact: true,
  });
  await misconception.focus();
  await page.keyboard.press("Space");
  await expect(misconception).toBeChecked();
  await panel.getByRole("button", { name: "Check Answer" }).click();
  await panel.getByRole("button", { name: "Show Me Why" }).click();
  const proof = panel.getByTestId("red-pen-visual");
  await expect(proof.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  await expect(proof.getByLabel("Animation timeline")).toHaveValue("0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.map((violation) => ({
      id: violation.id,
      elements: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
