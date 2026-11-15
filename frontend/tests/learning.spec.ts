import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const QUESTION = "Why does a projectile travel farthest at 45 degrees?";

function lecturePDF(): Buffer {
  const text =
    "Projectile motion: launch angles, horizontal and vertical velocity components.";
  const stream = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test("complete adaptive student journey with verified what-if results", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/studio");
  const scene = page.getByTestId("lesson-scene");
  await expect(scene).toHaveAttribute("data-scene", "trajectories");
  await expect(page.getByTestId("lesson-mode")).toHaveText("Demo lesson");
  await expect(page.getByTestId("metric-range")).toContainText("40.77");
  await page.getByLabel("What would you like to understand?").fill(QUESTION);
  await page.getByRole("button", { name: "Visualize", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Visualize", exact: true }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "Pause animation" }).click();
  await expect(
    page.getByRole("button", { name: "Play animation", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation" }),
  ).toBeVisible();

  await page.getByTestId("lesson-step-2").click();
  await expect(page.getByTestId("lesson-step-2")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByLabel("What feels unclear about step 2?")
    .fill("I don't understand why 60 degrees doesn't travel farther.");
  await page.getByRole("button", { name: "Explain it differently" }).click();
  await expect(scene).toHaveAttribute("data-scene", "components");
  await expect(page.getByTestId("adaptation-banner")).toContainText(
    "Velocity decomposition",
  );
  await expect(page.getByText("Predefined demo hypothesis")).toBeVisible();
  await expect(
    scene.getByRole("img", { name: /Initial velocity decomposition/ }),
  ).toBeVisible();

  const update = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/what-if") && response.status() === 200,
  );
  await page.getByRole("button", { name: "60°", exact: true }).click();
  await update;
  await expect(page.getByTestId("metric-range")).toContainText("35.31");
  await expect(page.getByLabel("Launch angle", { exact: true })).toHaveValue(
    "60",
  );
  await page
    .getByLabel("Ask a what-if question")
    .fill("What happens if gravity doubles?");
  await page.getByRole("button", { name: "Explore what-if question" }).click();
  await expect(page.getByTestId("metric-range")).toContainText("17.66");
  await expect(page.getByLabel("Gravity", { exact: true })).toHaveValue(
    "19.62",
  );

  await page.getByLabel("It halves.", { exact: true }).check();
  await page.getByRole("button", { name: "Check my understanding" }).click();
  await expect(
    page.getByText("You've connected the right ideas."),
  ).toBeVisible();
  await page.getByLabel("It doubles.", { exact: true }).check();
  await page.getByRole("button", { name: "Check my understanding" }).click();
  await expect(
    page.getByRole("button", { name: "Try another visual" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try another visual" }).click();
  await expect(scene).toHaveAttribute("data-scene", "range_comparison");
  await expect(page.getByTestId("metric-range")).toContainText("17.66");

  await page.reload();
  await expect(scene).toHaveAttribute("data-scene", "range_comparison");
  await expect(page.getByLabel("Gravity", { exact: true })).toHaveValue(
    "19.62",
  );
  expect(errors).toEqual([]);
});

test("unsupported questions preserve input and keep the current lesson", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  const input = page.getByLabel("What would you like to understand?");
  await input.fill("Explain photosynthesis");
  await page.getByRole("button", { name: "Visualize", exact: true }).click();
  await expect(page.locator(".error-banner")).toContainText("supports ideal");
  await expect(input).toHaveValue("Explain photosynthesis");
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute(
    "data-scene",
    "trajectories",
  );
});

test("Gemini errors offer explicit demo mode and preserve the question", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await page.getByLabel("Lesson generation mode").selectOption("gemini");
  await page.route("**/api/lesson", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        detail: {
          message: "Gemini isn't configured. Choose Demo mode.",
          demo_available: true,
        },
      }),
    }),
  );
  await page.getByRole("button", { name: "Visualize", exact: true }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "Gemini isn't configured",
  );
  await expect(
    page.getByLabel("What would you like to understand?"),
  ).toHaveValue(QUESTION);
  await expect(page.getByTestId("lesson-mode")).toHaveText("Demo lesson");
  await page
    .getByRole("button", { name: "Use Demo mode for the next lesson" })
    .click();
  await expect(page.getByLabel("Lesson generation mode")).toHaveValue("demo");
});

test("PDF upload identifies topics and preserves page references", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await page.getByLabel("Upload PDF file").setInputFiles({
    name: "physics-lecture.pdf",
    mimeType: "application/pdf",
    buffer: lecturePDF(),
  });
  const document = page.getByRole("region", { name: "Uploaded lecture notes" });
  await expect(document).toContainText("physics-lecture.pdf");
  await expect(
    document.getByRole("button", { name: "Projectile motion", exact: true }),
  ).toBeVisible();
  await document
    .getByRole("button", { name: "Projectile motion", exact: true })
    .click();
  await page.getByText("Sources from your notes", { exact: true }).click();
  await expect(
    page.getByText("physics-lecture.pdf · page 1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("These excerpts are extracted from your PDF.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("loading and network errors provide usable feedback", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await page.route("**/api/lesson", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Visualize", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Building your demo lesson" }),
  ).toBeVisible();
  await expect(page.locator(".error-banner")).toContainText(
    "Couldn't reach the learning engine",
  );
  await expect(
    page.getByLabel("What would you like to understand?"),
  ).toHaveValue(QUESTION);
  await expect(
    page.getByRole("button", { name: "Visualize", exact: true }),
  ).toBeEnabled();
});

test("mobile layout and keyboard-controlled launch angle", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const angle = page.getByLabel("Launch angle", { exact: true });
  const zeroSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/what-if") && response.status() === 200,
  );
  await angle.focus();
  await angle.press("Home");
  await expect(angle).toHaveValue("0");
  await expect(page.getByTestId("metric-range")).toContainText("0.00");
  expect((await (await zeroSaved).json()).lesson.parameters.angle).toBe(0);
  await expect(
    page.getByRole("button", { name: "30°", exact: true }),
  ).toBeEnabled();
  const thirtySaved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/what-if") && response.status() === 200,
  );
  await page.getByRole("button", { name: "30°", exact: true }).click();
  await expect(angle).toHaveValue("30");
  await expect(page.getByTestId("metric-range")).toContainText("35.31");
  expect((await (await thirtySaved).json()).lesson.parameters.angle).toBe(30);
  await page.getByTestId("lesson-step-2").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("What feels unclear about step 2?"),
  ).toBeVisible();
});

test("learning controls pass automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  async function checkAccessibility() {
    const results = await new AxeBuilder({ page })
      .exclude("nextjs-portal")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        elements: violation.nodes.map((node) => ({
          target: node.target,
          issue: node.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await checkAccessibility();
  await page.getByTestId("lesson-step-2").click();
  await checkAccessibility();
  await page
    .getByLabel("What feels unclear about step 2?")
    .fill("I don't understand why 60 degrees doesn't travel farther.");
  await page.getByRole("button", { name: "Explain it differently" }).click();
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute(
    "data-scene",
    "components",
  );
  await page
    .getByLabel("It stays in the air for less time.", { exact: true })
    .check();
  await page.getByRole("button", { name: "Check my understanding" }).click();
  await expect(
    page.getByRole("button", { name: "Try another visual" }),
  ).toBeVisible();
  await checkAccessibility();
});

test("a failed parameter save preserves the draft and can be retried", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  let attempts = 0;
  await page.route("**/api/what-if", async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.getByRole("button", { name: "60°", exact: true }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "Couldn't reach the learning engine",
  );
  await expect(page.getByTestId("metric-range")).toContainText("35.31");
  await expect(page.getByLabel("Launch angle", { exact: true })).toHaveValue(
    "60",
  );
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("button", { name: "Retry saving" })).toHaveCount(
    0,
  );
  await expect(page.locator(".error-banner")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "60°", exact: true }),
  ).toBeEnabled();
  expect(attempts).toBe(2);
  await page.getByLabel("Ask a what-if question").fill("Gravity halves");
  await page.getByRole("button", { name: "Explore what-if question" }).click();
  await expect(page.getByLabel("Gravity", { exact: true })).toHaveValue(
    "4.905",
  );
  await expect(page.getByTestId("metric-range")).toContainText("70.62");
  await page.reload();
  await expect(page.getByLabel("Launch angle", { exact: true })).toHaveValue(
    "60",
  );
  await expect(page.getByLabel("Gravity", { exact: true })).toHaveValue(
    "4.905",
  );
});
