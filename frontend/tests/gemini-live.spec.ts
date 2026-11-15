import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

// Explicit opt-in: these checks use the backend's configured key and real quota.
test.skip(
  process.env.ANIMIND_LIVE_GEMINI_TEST !== "1",
  "Set ANIMIND_LIVE_GEMINI_TEST=1 to test the configured live Gemini service.",
);

async function expectVisualStrategy(page: Page, strategy: string) {
  const scene = page.getByTestId("lesson-scene");
  await expect(scene).toHaveAttribute("data-scene", strategy);
  const canvas = scene.locator(".scene-canvas");
  if (strategy === "components") {
    await expect(canvas.getByRole("img", { name: /Velocity components during projectile flight/ })).toBeVisible();
    await expect(canvas.locator("marker")).toHaveCount(1);
    await expect(canvas.locator("polyline")).toHaveCount(1);
  } else if (strategy === "range_comparison") {
    await expect(canvas.getByRole("img", { name: /Range comparison/ })).toBeVisible();
    expect(await canvas.locator("rect").count()).toBeGreaterThanOrEqual(6);
  } else {
    expect(strategy).toBe("trajectories");
    await expect(canvas.getByRole("img", { name: /Projectile paths/ })).toBeVisible();
    expect(await canvas.locator("polyline").count()).toBeGreaterThanOrEqual(3);
  }
}

test("live Gemini lesson and adaptive visual explanation through the website", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const httpErrors: { path: string; status: number }[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(new URL(request.url()).pathname));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
  });

  try {
    await page.goto("http://127.0.0.1:3000/studio");
    await expect(page.getByTestId("lesson-scene")).toBeVisible();
    await page.getByRole("button", { name: "New lesson", exact: true }).click();
    await page.getByLabel("Lesson generation mode").selectOption("gemini");
    await page.getByLabel("What would you like to understand?").fill(
      "Why does a projectile travel farthest at 45 degrees?",
    );
    const generated = page.waitForResponse(
      (response) => response.url().endsWith("/api/lesson") && response.request().method() === "POST",
      { timeout: 60000 },
    );
    const started = performance.now();
    await page.getByRole("button", { name: "Visualize", exact: true }).click();
    const generatedResponse = await generated;
    const received = performance.now();
    expect(generatedResponse.status()).toBe(200);
    const lesson = await generatedResponse.json();
    expect(lesson.mode).toBe("gemini");
    expect(lesson.planning_source).toBe("gemini");
    await expect(page.getByTestId("lesson-mode")).toHaveText("Gemini lesson");
    await expectVisualStrategy(page, lesson.scene);
    await expect(page.getByRole("button", { name: "Visualize", exact: true })).toBeEnabled();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const uncached = { endToEndMs: Math.round(performance.now()-started), requestWallMs: Math.round(received-started), responseToPaintMs: Math.round(performance.now()-received), serverTiming: generatedResponse.headers()["server-timing"] };

    // Same session, exact prompt and parameters: reused plan is explicitly identified.
    const repeated = page.waitForResponse(response => response.url().endsWith("/api/lesson") && response.request().method() === "POST");
    const repeatedStart = performance.now();
    await page.getByRole("button", { name: "Visualize", exact: true }).click();
    const repeatedResponse = await repeated;
    expect(repeatedResponse.status()).toBe(200);
    const reused = await repeatedResponse.json();
    expect(reused.planning_source).toBe("gemini_cache");
    expect(reused.id).not.toBe(lesson.id);
    expect(reused.metrics).toEqual(lesson.metrics);
    await expect(page.getByTestId("planning-source")).toContainText("Saved Gemini plan");
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const cached = {endToEndMs:Math.round(performance.now()-repeatedStart),serverTiming:repeatedResponse.headers()["server-timing"]};

    const confusion = "Why doesn't 60 degrees travel farther if it stays in the air longer?";
    await page.getByTestId("lesson-step-2").click();
    await page.getByLabel("What feels unclear about step 2?").fill(confusion);
    const adapted = page.waitForResponse(
      (response) => response.url().endsWith("/api/adapt") && response.request().method() === "POST",
      { timeout: 60000 },
    );
    const adaptationStart = performance.now();
    await page.getByRole("button", { name: "Explain it differently" }).click();
    const adaptedResponse = await adapted;
    expect(adaptedResponse.status()).toBe(200);
    const next = await adaptedResponse.json();
    expect(next.mode).toBe("gemini");
    expect(next.planning_source).toBe("gemini");
    expect(next.scene).not.toBe(lesson.scene);
    expect(next.adaptation.student_confusion).toBe(confusion);
    expect(next.adaptation.selected_step_id).toBe(lesson.steps[1].id);
    expect(next.strategy_history).toEqual([...lesson.strategy_history, next.scene]);
    await expectVisualStrategy(page, next.scene);
    await expect(page.getByTestId("adaptation-banner")).toBeVisible();
    await expect(page.getByText("Gemini hypothesis based on your feedback", { exact: true })).toBeVisible();
    await expect(page.locator(".error-banner")).toHaveCount(0);
    const adaptation = {endToEndMs:Math.round(performance.now()-adaptationStart),serverTiming:adaptedResponse.headers()["server-timing"],initialScene:lesson.scene,adaptedScene:next.scene};
    mkdirSync("design-review", {recursive:true});
    writeFileSync("design-review/pipeline-after.json", JSON.stringify({uncached,cached,adaptation},null,2));

    // The model chooses a check from the existing server-owned answer bank.
    await page.getByLabel(next.understanding_check.options[0].label, { exact: true }).check();
    const checked = page.waitForResponse((response) => response.url().endsWith("/api/check-understanding"));
    await page.getByRole("button", { name: "Check my understanding" }).click();
    expect((await checked).status()).toBe(200);

    await page.reload();
    await expect(page.getByTestId("lesson-mode")).toHaveText("Gemini lesson");
    await expectVisualStrategy(page, next.scene);
    await expect(page.getByText("Gemini hypothesis based on your feedback", { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(httpErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    await testInfo.attach("live-workflow-result", {
      body: JSON.stringify({ modelMode: next.mode, initialStrategy: lesson.scene, adaptedStrategy: next.scene, savedAfterReload: true }),
      contentType: "application/json",
    });
  } finally {
    await testInfo.attach("live-runtime-diagnostics", {
      body: JSON.stringify({ consoleErrors, pageErrors, failedRequests, httpErrors }),
      contentType: "application/json",
    });
  }
});
