import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing navigation opens the real studio and restores notebook lessons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Big ideas\.\s*Made visible\./);
  await page.getByRole("link", { name: "How It Works", exact: true }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole("heading", { name: "Ask a question.", exact: true })).toBeInViewport();
  await page.getByRole("link", { name: "Start Exploring", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByTestId("lesson-mode")).toHaveText("Demo lesson");
  await page.getByRole("button", { name: "New lesson", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("curious");
  await page.getByText("Notebook", { exact: true }).click();
  await page.locator(".recent-item").first().click();
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await expect(page.locator(".notebook-menu")).not.toHaveAttribute("open");
  await page.getByRole("link", { name: "AniMind home" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await page.getByRole("link", { name: /One velocity, two directions/ }).click();
  await expect(page).toHaveURL(/\/studio\?question=/);
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "components");
  await expect(page.getByLabel("What would you like to understand?")).toHaveValue("How do horizontal and vertical velocity components affect a projectile?");
});

test("Curiosity Lab question console and subject discovery stay truthful and functional", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Five doors. One open lab." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Physics Motion you can touch/ })).toBeVisible();
  await expect(page.getByText("PREVIEW", { exact: true })).toHaveCount(4);
  await expect(page.getByText("Explanation preview · visual lab coming later.", { exact: true })).toHaveCount(4);
  const question = "How do horizontal and vertical velocity components affect a projectile?";
  await page.getByLabel("What have you always wanted to understand?").fill(question);
  await page.getByRole("button", { name: "Make it visible" }).click();
  await expect(page).toHaveURL(/\/studio\?question=/);
  await expect(page.getByLabel("What would you like to understand?")).toHaveValue(question);
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "components");
});

test("landing experiment has correct angle relationships, comparison, and playback", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("region", { name: "Interactive projectile experiment" });
  const scene = hero.getByTestId("lesson-scene");
  await expect(hero.getByTestId("hero-range")).toContainText("40.77");
  await hero.getByRole("button", { name: "30°", exact: true }).click();
  await expect(hero.getByTestId("hero-range")).toContainText("35.31");
  await hero.getByRole("button", { name: "60°", exact: true }).click();
  await expect(hero.getByTestId("hero-range")).toContainText("35.31");
  await expect(hero.getByLabel("Explore launch angle")).toHaveValue("60");
  await expect(scene.locator(".scene-canvas polyline")).toHaveCount(1);
  await hero.getByLabel("Compare angles", { exact: true }).check();
  await expect(scene.locator(".scene-canvas polyline")).toHaveCount(3);
  await hero.getByRole("button", { name: "Pause animation", exact: true }).click();
  const timeline = hero.getByLabel("Animation timeline");
  const paused = await timeline.inputValue();
  await page.waitForTimeout(180);
  expect(await timeline.inputValue()).toBe(paused);
  await hero.getByRole("button", { name: "Replay animation", exact: true }).click();
  await expect(hero.getByRole("button", { name: "Pause animation", exact: true })).toBeVisible();
  await hero.getByLabel("Explore launch angle").focus();
  await hero.getByLabel("Explore launch angle").press("Home");
  await expect(hero.getByTestId("hero-range")).toContainText("0.00");
});

test("landing teaching preview changes SVG and clearly labels its provenance", async ({ page }) => {
  const teachingRequests: string[] = [];
  page.on("request", (request) => { if (/\/api\/(lesson|adapt)$/.test(request.url())) teachingRequests.push(request.url()); });
  await page.goto("/");
  await page.getByRole("link", { name: "See AniMind in Action", exact: true }).click();
  const preview = page.locator(".perspective-preview");
  await expect(preview.getByText("Interactive preview · no AI request", { exact: true })).toBeVisible();
  await expect(preview.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "trajectories");
  await preview.getByRole("button", { name: "The components", exact: true }).click();
  await expect(preview.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "components");
  await expect(preview.locator(".scene-canvas polyline")).toHaveCount(1);
  await expect(preview.locator(".scene-canvas marker")).toHaveCount(1);
  await expect(preview.getByRole("img", { name: /Velocity components during projectile flight/ })).toBeVisible();
  expect(teachingRequests).toEqual([]);
});

test("reduced motion pauses automatic playback and responds to preference changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/studio");
  const scene = page.getByTestId("lesson-scene");
  await expect(scene.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  const timeline = scene.getByLabel("Animation timeline");
  expect(await timeline.inputValue()).toBe("0");
  await page.waitForTimeout(200);
  expect(await timeline.inputValue()).toBe("0");
  await scene.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  await page.goto("/");
  const hero = page.getByRole("region", { name: "Interactive projectile experiment" });
  await expect(hero.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
});

test("adaptive transition preserves the selected step and presents different diagrams on mobile", async ({ page }) => {
  mkdirSync("design-review", { recursive: true });
  await page.goto("/studio");
  await page.getByTestId("lesson-step-2").click();
  await page.getByLabel("What feels unclear about step 2?").fill("Why doesn't 60 degrees travel farther if it stays in the air longer?");
  await page.route("**/api/adapt", async (route) => { await new Promise((resolve) => setTimeout(resolve, 800)); await route.continue(); });
  await page.getByRole("button", { name: "Explain it differently", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Switching to another visual strategy" })).toBeVisible();
  await expect(page.getByTestId("lesson-step-2")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "components");
  await expect(page.getByTestId("adaptation-banner")).toContainText("Velocity components in flight");
  await page.getByTestId("lesson-scene").screenshot({ path: "design-review/components-1440.png" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByTestId("lesson-scene").screenshot({ path: "design-review/components-390.png" });
  await page.getByRole("complementary", { name: "Step-by-step tutor" }).screenshot({ path: "design-review/adapted-companion-390.png" });
  await page.getByLabel("Gravity is stronger at a higher angle.", { exact: true }).check();
  await page.getByRole("button", { name: "Check my understanding" }).click();
  await page.getByRole("button", { name: "Try another visual" }).click();
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "range_comparison");
  await expect(page.getByRole("img", { name: /Range comparison/ })).toBeVisible();
  await page.getByTestId("lesson-scene").screenshot({ path: "design-review/range-comparison-390.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("unsupported PDF upload explains the error and preserves the current lesson", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await page.getByLabel("Upload PDF file").setInputFiles({ name: "unsupported.txt", mimeType: "text/plain", buffer: Buffer.from("Projectile motion notes") });
  await expect(page.locator(".error-banner")).toContainText("PDF");
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-scene", "trajectories");
  await expect(page.getByTestId("lesson-mode")).toHaveText("Demo lesson");
});

for (const width of [1440, 1280, 768, 390]) {
  for (const route of ["/", "/studio"]) {
    test(`atelier responsive, accessible, and rendered at ${width}px on ${route}`, async ({ page }, testInfo) => {
      mkdirSync("design-review", { recursive: true });
      const errors: string[] = [];
      const consoleErrors: string[] = [];
      const networkErrors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("requestfailed", (request) => networkErrors.push(new URL(request.url()).pathname));
      page.on("response", (response) => { if (response.status() >= 400) networkErrors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(route);
      await expect(page.getByTestId("lesson-scene").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      for (const pause of await page.getByRole("button", { name: "Pause animation", exact: true }).all()) await pause.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // Reset scroll before full-page capture so offscreen fixed skip links stay offscreen.
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
      const name = route === "/" ? "landing" : "studio";
      await page.screenshot({ path: `design-review/${name}-${width}.png`, fullPage: true });
      await page.getByTestId("lesson-scene").first().screenshot({ path: `design-review/${name}-canvas-${width}.png` });
      if (route === "/studio") {
        await page.getByTestId("lesson-step-2").click();
        await expect(page.locator(".selected-explanation math")).toBeVisible();
        await page.getByRole("complementary", { name: "Step-by-step tutor" }).screenshot({ path: `design-review/companion-${width}.png` });
      }
      const accessibility = await new AxeBuilder({ page }).exclude("nextjs-portal").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(accessibility.violations.map((item) => ({ id: item.id, elements: item.nodes.map((node) => ({ target: node.target, issue: node.failureSummary })) }))).toEqual([]);
      expect(errors).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(networkErrors).toEqual([]);
      await testInfo.attach("visual-review", { path: `design-review/${name}-${width}.png`, contentType: "image/png" });
    });
  }
}
