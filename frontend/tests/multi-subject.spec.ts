import { test, expect } from "@playwright/test";
import { quadratic, linearValue } from "../lib/visualizations";
test("function mathematics and degenerate cases", () => {
  expect(linearValue(2, 3, 4)).toBe(11);
  expect(linearValue(0, 2, 10)).toBe(2);
  expect(quadratic(2, 4, 1).vertex).toEqual([-1, -1]);
  expect(quadratic(1, 2, 1).roots).toEqual([-1]);
  expect(quadratic(1, -4, 3).vertex).toEqual([2, -1]);
  expect(quadratic(1, -4, 3).roots).toEqual([1, 3]);
  expect(quadratic(0, 2, -4).roots).toEqual([2]);
  expect(quadratic(0, 0, 0).vertex).toBeNull();
  expect(quadratic(1, 0, 1).roots).toEqual([]);
});
test("linear and quadratic lessons respond to controls", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Mathematics", exact: true }).click();
  await page
    .getByRole("button", { name: "Linear function · Interactive" })
    .click();
  await expect(
    page.getByRole("img", { name: "Linear coordinate graph" }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "m", exact: true }).fill("2");
  await expect(page.getByText("Slope: 2.", { exact: false })).toBeVisible();
  await page.getByRole("slider", { name: "b", exact: true }).fill("3");
  await expect(page.getByText("Slope: 2.", { exact: false })).toContainText(
    "y-intercept: (0, 3)",
  );
  await page
    .getByRole("button", { name: "Quadratic function · Interactive" })
    .click();
  await page.getByRole("slider", { name: "a", exact: true }).fill("0");
  await expect(
    page.getByText("Constant: no x-intercept", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText("All real x are zeros", { exact: false }),
  ).toContainText("Real x-intercepts: all real x");
});

test("pendulum and Newton models have correct units and signs", async ({
  page,
}) => {
  const { pendulumPeriod, acceleration } = await import(
    "../lib/visualizations"
  );
  expect(pendulumPeriod(1, 9.81)).toBeCloseTo(2.006, 3);
  expect(pendulumPeriod(4, 9.81) / pendulumPeriod(1, 9.81)).toBeCloseTo(2);
  expect(acceleration(-6, 2)).toBe(-3);
  await page.goto("/studio");
  await page.getByRole("button", { name: "Physics", exact: true }).click();
  await page
    .getByRole("button", { name: "Simple pendulum · Interactive" })
    .click();
  await expect(page.getByText(/^Period T =/)).toContainText("2.006 s");
  await page
    .getByRole("button", { name: "Newton’s second law · Interactive" })
    .click();
  await page.getByRole("slider", { name: "force", exact: true }).fill("-6");
  await expect(page.getByText("a = F/m =", { exact: false })).toContainText(
    "-3.000 m/s². Acceleration: left",
  );
});

test("water composition and cell functions", async ({ page }) => {
  const { waterParts, organelles } = await import("../lib/visualizations");
  expect(
    Object.keys(waterParts).filter((k) => k.startsWith("Hydrogen")),
  ).toHaveLength(2);
  expect(Object.keys(waterParts).filter((k) => k === "Oxygen")).toHaveLength(1);
  expect(organelles.Ribosomes).toContain("proteins");
  expect(organelles.Nucleus).toContain("DNA");
  await page.goto("/studio");
  await page.getByRole("button", { name: "Chemistry", exact: true }).click();
  await page
    .getByRole("button", { name: "Water molecule · Interactive" })
    .click();
  await expect(page.getByText("H₂O · H–O–H ≈ 104.5°")).toBeVisible();
  await page
    .getByRole("button", { name: "Oxygen", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Oxygen:" }),
  ).toContainText("One oxygen atom");
  await page.getByRole("button", { name: "Biology", exact: true }).click();
  await page.getByRole("button", { name: "Animal cell · Interactive" }).click();
  await page
    .getByRole("button", { name: "Ribosomes", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Ribosomes:" }),
  ).toContainText("synthesize proteins");
});

test("bubble sort is real, reversible, and handles duplicates and negatives", async ({
  page,
}) => {
  const { bubbleSteps } = await import("../lib/visualizations");
  for (const input of [
    [5, 1, 4, 2, 8],
    [3, 3, -1, 0],
    [],
    [1],
    [1, 2, 3],
    [3, 2, 1],
  ]) {
    const steps = bubbleSteps(input);
    expect(steps.at(-1)?.values).toEqual([...input].sort((a, b) => a - b));
    steps.forEach((s, i) => {
      if (s.kind === "swap") {
        const previous = steps[i - 1];
        expect(previous.kind).toBe("compare");
        const expected = [...previous.values];
        const [a, b] = s.pair;
        [expected[a], expected[b]] = [expected[b], expected[a]];
        expect(s.values).toEqual(expected);
      }
    });
  }
  await page.goto("/studio");
  await page
    .getByRole("button", { name: "Computer Science", exact: true })
    .click();
  await page.getByRole("button", { name: "Bubble sort · Interactive" }).click();
  await expect(
    page.getByRole("img", { name: "Array: 5, 1, 4, 2, 8. compare" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Array: 1, 5, 4, 2, 8. swap" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Array: 5, 1, 4, 2, 8. compare" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("Sorting complete", { exact: true })).toBeVisible(
    { timeout: 25000 },
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Array: 5, 1, 4, 2, 8. compare" }),
  ).toBeVisible();
});

test("unsupported molecules receive explanation only", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Chemistry", exact: true }).click();
  await page
    .getByLabel("Question", { exact: true })
    .fill("Explain sodium chloride");
  await page.getByRole("button", { name: "Open lesson", exact: true }).click();
  await expect(
    page.getByText("Explanation only · demo", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: /H₂O/ })).toHaveCount(0);
});

test("new lessons remain accessible on mobile and respect reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/studio");
  await page.getByRole("button", { name: "Physics", exact: true }).click();
  await page
    .getByRole("button", { name: "Simple pendulum · Interactive" })
    .click();
  await expect(
    page.getByRole("button", { name: "Play pendulum" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const AxeBuilder = (await import("@axe-core/playwright")).default;
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("projectile card preserves its question in the established studio", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Physics", exact: true }).click();
  await page
    .getByRole("button", { name: "Projectile motion · Interactive" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Why is projectile range greatest at 45 degrees?",
  );
  await page.getByRole("button", { name: "Try Red Pen Challenge" }).click();
  await expect(page.getByTestId("red-pen-challenge")).toBeVisible();
});

test('voice follows new lesson steps and resets after editing or switching subjects', async ({page}) => {
  await page.addInitScript(() => {
    class Utterance {
      text: string;
      onstart?: () => void;
      constructor(text: string) { this.text = text; }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {configurable:true,value:Utterance});
    Object.defineProperty(window, 'speechSynthesis', {configurable:true,value:{
      getVoices:()=>[],addEventListener:()=>{},removeEventListener:()=>{},
      speak:(u:Utterance)=>u.onstart?.(),cancel:()=>{},pause:()=>{},resume:()=>{},
    }});
  });
  await page.goto('/studio');
  await page.getByRole('button',{name:'Mathematics',exact:true}).click();
  await page.getByRole('button',{name:'Linear function · Interactive'}).click();
  const voice=page.getByRole('region',{name:'Voice Tutor'});
  await voice.getByRole('button',{name:'Listen',exact:true}).click();
  await expect(voice.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Next step',exact:true}).click();
  await expect(voice.getByRole('button',{name:'Listen',exact:true})).toBeVisible();
  await voice.getByRole('button',{name:'Listen',exact:true}).click();
  await page.getByLabel('Question',{exact:true}).fill('Explain a different linear function');
  await expect(voice.getByRole('button',{name:'Listen',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Biology',exact:true}).click();
  await expect(voice).toHaveCount(0);
});

test('validated Gemini coefficients keep slider position and graph consistent', async ({page}) => {
  await page.route('**/api/visual-lesson', route=>route.fulfill({json:{
    title:'A fractional slope',explanation:'Slope is the rate of change of y with respect to x.',
    steps:['Observe the initial fractional slope.','Change the slope and inspect the line.'],
    comprehension_question:'What does the slope tell you?',concept:'linear_function',parameters:{m:1.1,b:0.3},planning_source:'gemini',
  }}));
  await page.goto('/studio');
  await page.getByRole('button',{name:'Mathematics',exact:true}).click();
  await page.getByRole('button',{name:'Linear function · Interactive'}).click();
  await expect(page.getByRole('slider',{name:'m',exact:true})).toHaveValue('1.1');
  await expect(page.getByRole('slider',{name:'b',exact:true})).toHaveValue('0.3');
});
