import { chromium, expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ baseURL: "http://127.0.0.1:3000" });

test("QA playback changes projectile positions and scrubbing reaches physical endpoints", async ({
  page,
}) => {
  await page.goto("/studio");
  const scene = page.getByTestId("lesson-scene");
  await expect(scene).toHaveAttribute("data-scene", "trajectories");
  const timeline = page.getByLabel("Animation timeline");
  const ball = scene.locator('circle[r="5.5"]');

  const paths = await scene
    .locator(".scene-canvas polyline")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const points = element
          .getAttribute("points")!
          .split(" ")
          .map((point) => point.split(",").map(Number));
        const angle = Number(
          element.parentElement
            ?.querySelector("text")
            ?.textContent?.replace("°", ""),
        );
        return {
          angle,
          start: points[0],
          end: points[points.length - 1],
          highestY: Math.min(...points.map((point) => point[1])),
        };
      }),
    );
  expect(paths.map((path) => path.angle)).toEqual([30, 45, 60]);
  const [thirty, fortyFive, sixty] = paths;
  expect(thirty.end[0]).toBeCloseTo(sixty.end[0], 7);
  expect(fortyFive.end[0]).toBeGreaterThan(thirty.end[0]);
  expect(sixty.highestY).toBeLessThan(fortyFive.highestY);
  for (const path of paths) {
    expect(path.start).toEqual([65, 298]);
    expect(path.end[1]).toBeCloseTo(298, 6);
  }

  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect
    .poll(async () => Number(await timeline.inputValue()))
    .toBeGreaterThan(0.06);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const pausedTime = await timeline.inputValue();
  const pausedX = await ball.getAttribute("cx");
  const pausedY = await ball.getAttribute("cy");
  await page.waitForTimeout(350);
  expect(await timeline.inputValue()).toBe(pausedTime);
  expect(await ball.getAttribute("cx")).toBe(pausedX);
  expect(await ball.getAttribute("cy")).toBe(pausedY);

  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await expect
    .poll(async () => Number(await timeline.inputValue()))
    .toBeGreaterThan(Number(pausedTime) + 0.02);
  await timeline.focus();
  await timeline.press("End");
  await expect(timeline).toHaveValue("1");
  await expect(
    page.getByRole("button", { name: "Play animation", exact: true }),
  ).toBeVisible();
  expect(Number(await ball.getAttribute("cx"))).toBeCloseTo(
    fortyFive.end[0],
    6,
  );
  expect(Number(await ball.getAttribute("cy"))).toBeCloseTo(298, 6);
  await timeline.press("Home");
  await expect(timeline).toHaveValue("0");
  expect(Number(await ball.getAttribute("cx"))).toBe(65);
  expect(Number(await ball.getAttribute("cy"))).toBe(298);
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect
    .poll(async () => Number(await timeline.inputValue()))
    .toBeGreaterThan(0.02);
});

test("QA angle, speed, and gravity sliders save correct boundary values", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  const range = page.getByTestId("metric-range");

  async function moveSlider(
    label: string,
    key: string,
    field: string,
    expectedValue: number,
    expectedRange: string,
  ) {
    const control = page.getByLabel(label, { exact: true });
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/what-if") &&
        response.status() === 200,
    );
    await control.focus();
    await control.press(key);
    await expect(control).toHaveValue(String(expectedValue));
    await expect(range).toContainText(expectedRange);
    const body = await (await saved).json();
    expect(body.lesson.parameters[field]).toBeCloseTo(expectedValue, 7);
    expect(body.lesson.metrics.range.toFixed(2)).toBe(expectedRange);
    await expect(control).toBeEnabled();
  }

  await moveSlider("Launch angle", "Home", "angle", 0, "0.00");
  await moveSlider("Launch angle", "End", "angle", 90, "0.00");
  const angleSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/what-if") && response.status() === 200,
  );
  await page.getByRole("button", { name: "45°", exact: true }).click();
  await angleSaved;
  await expect(page.getByLabel("Initial speed", { exact: true })).toBeEnabled();
  await moveSlider("Initial speed", "End", "speed", 100, "1019.37");
  await moveSlider("Initial speed", "Home", "speed", 1, "0.10");

  const resetSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/what-if") && response.status() === 200,
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await resetSaved;
  await expect(page.getByLabel("Gravity", { exact: true })).toBeEnabled();
  await moveSlider("Gravity", "End", "gravity", 50, "8.00");
  await moveSlider("Gravity", "Home", "gravity", 0.1, "4000.00");
  await page.reload();
  await expect(page.getByLabel("Gravity", { exact: true })).toHaveValue("0.1");
  await expect(range).toContainText("4000.00");
});

test("QA exact confusion changes SVG strategy and the happy journey has clean runtime diagnostics", async ({
  page,
}, testInfo) => {
  const consoleErrors: { message: string; url: string }[] = [];
  const pageErrors: string[] = [];
  const failedRequests: { url: string; error: string | undefined }[] = [];
  const httpErrors: { url: string; status: number }[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push({
        message: message.text(),
        url: message.location().url.split("?")[0],
      });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    failedRequests.push({
      url: request.url().split("?")[0],
      error: request.failure()?.errorText,
    }),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      httpErrors.push({
        url: response.url().split("?")[0],
        status: response.status(),
      });
  });

  try {
    await page.goto("/studio");
    const scene = page.getByTestId("lesson-scene");
    await expect(scene).toHaveAttribute("data-scene", "trajectories");
    await expect(page.getByTestId("lesson-mode")).toHaveText("Demo lesson");
    await expect(
      page.getByText("Demo · predefined teaching, live physics", {
        exact: true,
      }),
    ).toBeVisible();

    for (const number of [1, 2, 3]) {
      await page.getByTestId(`lesson-step-${number}`).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId(`lesson-step-${number}`)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(
        page.getByLabel(`What feels unclear about step ${number}?`),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Play animation", exact: true }),
      ).toBeVisible();
      await expect
        .poll(async () =>
          Number(await page.getByLabel("Animation timeline").inputValue()),
        )
        .toBeCloseTo((number - 1) / 3, 2);
    }

    await page.getByTestId("lesson-step-2").click();
    const confusion =
      "Why doesn't 60 degrees travel farther if it stays in the air longer?";
    await page.getByLabel("What feels unclear about step 2?").fill(confusion);
    const adapted = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/adapt") && response.status() === 200,
    );
    await page.getByRole("button", { name: "Explain it differently" }).click();
    const lesson = await (await adapted).json();
    expect(lesson.adaptation.student_confusion).toBe(confusion);
    expect(lesson.adaptation.selected_step_id).toBe("step-2");
    expect(lesson.adaptation.previous_strategy).toBe("trajectories");
    expect(lesson.scene).toBe("components");
    expect(lesson.strategy_history).toEqual(["trajectories", "components"]);
    await expect(scene).toHaveAttribute("data-scene", "components");
    await expect(scene.locator(".scene-canvas polyline")).toHaveCount(0);
    await expect(scene.locator("marker")).toHaveCount(1);
    await expect(
      scene.getByRole("img", { name: /Initial velocity decomposition/ }),
    ).toBeVisible();
    await expect(
      page.getByText("Predefined demo hypothesis", { exact: true }),
    ).toBeVisible();

    await page
      .getByLabel("Its lower horizontal speed outweighs its extra airtime.", {
        exact: true,
      })
      .check();
    await page.getByRole("button", { name: "Check my understanding" }).click();
    await expect(
      page.getByText("You've connected the right ideas."),
    ).toBeVisible();
    await page
      .getByLabel("Gravity is stronger at a higher angle.", { exact: true })
      .check();
    await page.getByRole("button", { name: "Check my understanding" }).click();
    await expect(
      page.getByRole("button", { name: "Try another visual" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Try another visual" }).click();
    await expect(scene).toHaveAttribute("data-scene", "range_comparison");
    await expect(
      scene.getByRole("img", { name: /Range comparison/ }),
    ).toBeVisible();
    expect(await scene.locator("rect").count()).toBeGreaterThanOrEqual(6);
  } finally {
    await testInfo.attach("runtime-diagnostics", {
      body: JSON.stringify(
        { consoleErrors, pageErrors, failedRequests, httpErrors },
        null,
        2,
      ),
      contentType: "application/json",
    });
  }
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(httpErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

for (const width of [320, 768, 1440]) {
  test(`QA responsive layout and basic accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/studio");
    await expect(page.getByTestId("lesson-scene")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const button = page.getByRole("button", { name: "Visualize", exact: true });
    const bounds = await button.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.getByTestId("lesson-step-2").focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByLabel("What feels unclear about step 2?"),
    ).toBeVisible();
    if (width === 320) {
      const results = await new AxeBuilder({ page })
        .exclude("nextjs-portal")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          elements: violation.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    }
  });
}

test("QA a cold browser loads its default icon without console errors", async ({}, testInfo) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    const consoleErrors: { message: string; url: string }[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push({
          message: message.text(),
          url: message.location().url.split("?")[0],
        });
      }
    });
    await page.goto("http://127.0.0.1:3000/studio");
    await expect(page.getByTestId("lesson-scene")).toBeVisible();
    const icon = await page.request.get("http://127.0.0.1:3000/favicon.ico");
    await testInfo.attach("cold-browser-diagnostics", {
      body: JSON.stringify(
        { consoleErrors, favicon: { url: icon.url(), status: icon.status() } },
        null,
        2,
      ),
      contentType: "application/json",
    });
    expect(
      icon.status(),
      "The default icon requested by a fresh browser should be available",
    ).toBe(200);
    expect(consoleErrors).toEqual([]);
  } finally {
    await browser.close();
  }
});
