import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { supportsGuidedLesson } from "../lib/guidedLessons";
import { formatSpeechText } from "../lib/speechText";

type VoiceLog = {
  texts: string[];
  rates: number[];
  voices: string[];
  cancels: number;
  pauses: number;
  resumes: number;
};

async function installSpeechMock(page: Page, delayedVoices = false) {
  await page.addInitScript((delayVoiceList) => {
    const log: VoiceLog = { texts: [], rates: [], voices: [], cancels: 0, pauses: 0, resumes: 0 };
    let current: {
      text: string;
      rate: number;
      voice: { voiceURI: string } | null;
      onstart: null | (() => void);
      onpause: null | (() => void);
      onresume: null | (() => void);
      onend: null | (() => void);
      onerror: null | ((event: { error: string }) => void);
    } | null = null;
    let speaking = false;
    let paused = false;
    let voicesReady = !delayVoiceList;
    const utterances: MockUtterance[] = [];
    const voiceListeners = new Set<() => void>();
    const voices = [
      { name: "Calm English", lang: "en-US", voiceURI: "calm-en", default: true, localService: true },
      { name: "Clear English", lang: "en-GB", voiceURI: "clear-en", default: false, localService: true },
    ];

    class MockUtterance {
      text: string;
      rate = 1;
      voice: { voiceURI: string } | null = null;
      onstart: null | (() => void) = null;
      onpause: null | (() => void) = null;
      onresume: null | (() => void) = null;
      onend: null | (() => void) = null;
      onerror: null | ((event: { error: string }) => void) = null;
      constructor(text: string) { this.text = text; }
    }

    const synthesis = {
      get speaking() { return speaking; },
      get paused() { return paused; },
      get pending() { return false; },
      getVoices: () => voicesReady ? voices : [],
      speak: (utterance: MockUtterance) => {
        utterances.push(utterance);
        current = utterance;
        speaking = true;
        paused = false;
        log.texts.push(utterance.text);
        log.rates.push(utterance.rate);
        log.voices.push(utterance.voice?.voiceURI || "");
        utterance.onstart?.();
      },
      cancel: () => {
        log.cancels += 1;
        speaking = false;
        paused = false;
        current = null;
      },
      pause: () => {
        if (!speaking || paused) return;
        log.pauses += 1;
        paused = true;
        current?.onpause?.();
      },
      resume: () => {
        if (!speaking || !paused) return;
        log.resumes += 1;
        paused = false;
        current?.onresume?.();
      },
      addEventListener: (name: string, listener: () => void) => { if (name === "voiceschanged") voiceListeners.add(listener); },
      removeEventListener: (name: string, listener: () => void) => { if (name === "voiceschanged") voiceListeners.delete(listener); },
    };

    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: MockUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synthesis });
    Object.defineProperty(window, "__voiceLog", { configurable: true, value: log });
    Object.defineProperty(window, "__finishVoice", {
      configurable: true,
      value: () => {
        speaking = false;
        paused = false;
        current?.onend?.();
        current = null;
      },
    });
    Object.defineProperty(window, "__errorVoice", {
      configurable: true,
      value: () => {
        speaking = false;
        paused = false;
        current?.onerror?.({ error: "synthesis-failed" });
        current = null;
      },
    });
    Object.defineProperty(window, "__finishStaleVoice", {
      configurable: true,
      value: () => utterances[0]?.onend?.(),
    });
    Object.defineProperty(window, "__loadVoices", {
      configurable: true,
      value: () => {
        voicesReady = true;
        voiceListeners.forEach((listener) => listener());
      },
    });
  }, delayedVoices);
}

async function voiceLog(page: Page): Promise<VoiceLog> {
  return page.evaluate(() => (window as unknown as { __voiceLog: VoiceLog }).__voiceLog);
}

test("speech formatter preserves meaning while making scientific notation natural", () => {
  expect(formatSpeechText("At **45°**, v₀ = 20 m/s and g = 9.8 m/s².")).toBe(
    "At 45 degrees, v naught equals 20 meters per second and g equals 9.8 meters per second squared.",
  );
  expect(formatSpeechText("[Range](https://example.test): R = v₀² sin(2θ) / g")).toBe(
    "Range: R equals v naught squared sin(2theta) divided by g",
  );
  expect(formatSpeechText("```math\nx < 5\n``` and <strong>y</strong> ≥ 2")).toBe(
    "x less than 5 and y greater than or equal to 2",
  );
});

test("the guided registry routes only the visualized projectile concepts", () => {
  expect(["projectile_motion", "launch_angles", "velocity_components"].every(supportsGuidedLesson)).toBe(true);
  expect(supportsGuidedLesson("bubble_sort")).toBe(false);
  expect(supportsGuidedLesson("water_molecule")).toBe(false);
});

test("Guided Lesson controls synchronize speech, visual scenes, preferences, and cleanup", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  const player = page.getByTestId("guided-player");
  await expect(player).toContainText("Ready for one synchronized visual lesson.");
  expect((await voiceLog(page)).texts).toEqual([]);

  await player.getByText("Voice settings").click();
  await player.getByLabel("Speaking speed").selectOption("faster");
  await player.getByLabel("Browser voice").selectOption("clear-en");
  await player.getByRole("button", { name: "Teach me" }).click();
  await expect(player).toContainText("Teaching scene 1: The launch.");
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-guided-cue", "show_initial_state");
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-guided-targets", /initial_velocity/);
  let log = await voiceLog(page);
  expect(log.texts).toHaveLength(1);
  expect(log.texts[0]).not.toMatch(/[*_`<>]/);
  expect(log.rates.at(-1)).toBe(1.12);
  expect(log.voices.at(-1)).toBe("clear-en");

  await player.getByRole("button", { name: "Pause" }).click();
  await expect(player).toContainText("Paused on scene 1: The launch.");
  await player.getByRole("button", { name: "Resume" }).click();
  await expect(player).toContainText("Teaching scene 1: The launch.");
  log = await voiceLog(page);
  expect(log.pauses).toBe(1);
  expect(log.resumes).toBe(1);

  await page.evaluate(() => (window as unknown as { __finishVoice: () => void }).__finishVoice());
  await expect(player).toContainText("Moving upward");
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-guided-cue", "play_ascent");
  await expect.poll(async () => (await voiceLog(page)).texts.length).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem("animind-voice-rate"))).toBe("faster");
  expect(await page.evaluate(() => localStorage.getItem("animind-voice-uri"))).toBe("clear-en");

  await page.getByRole("slider", { name: "Launch angle" }).evaluate((element) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, "60");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  const cancellationsAfterExplore = (await voiceLog(page)).cancels;
  expect(cancellationsAfterExplore).toBeGreaterThan(0);

  await player.getByRole("button", { name: "Teach me" }).click();
  await page.getByRole("button", { name: "New lesson" }).click();
  await expect(page.getByTestId("guided-player")).toHaveCount(0);
  expect((await voiceLog(page)).cancels).toBeGreaterThan(cancellationsAfterExplore);
});

test("speech completion advances scenes and rapid replay never overlaps", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  const player = page.getByTestId("guided-player");
  await player.getByRole("button", { name: "Teach me" }).click();
  await player.getByRole("button", { name: "Replay scene" }).click();
  await player.getByRole("button", { name: "Replay scene" }).click();
  const log = await voiceLog(page);
  expect(log.texts).toHaveLength(3);
  expect(log.cancels).toBeGreaterThanOrEqual(3);
  await page.evaluate(() => (window as unknown as { __finishStaleVoice: () => void }).__finishStaleVoice());
  await expect(player).toContainText("The launch");
  await page.evaluate(() => (window as unknown as { __finishVoice: () => void }).__finishVoice());
  await expect(player).toContainText("Moving upward");
  await page.evaluate(() => (window as unknown as { __errorVoice: () => void }).__errorVoice());
  await expect(player).toContainText("Narration stopped unexpectedly.");
  await player.getByRole("button", { name: "Replay scene" }).click();
  await expect(player).toContainText("Teaching scene 2: Moving upward.");
});

test("all registered projectile cues are reachable and visual motion pauses with narration", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/studio");
  const player = page.getByTestId("guided-player");
  const scene = page.getByTestId("lesson-scene");
  await player.getByRole("button", { name: "Teach me" }).click();
  const cues = ["show_initial_state", "play_ascent", "highlight_gravity", "hold_at_apex", "play_descent", "show_angle_comparison"];
  for (let index = 0; index < cues.length; index += 1) {
    await expect(scene).toHaveAttribute("data-guided-cue", cues[index]);
    if (index < cues.length - 1) await player.getByRole("button", { name: "Next" }).click();
  }

  await player.getByRole("button", { name: "Previous" }).click();
  await expect(scene).toHaveAttribute("data-guided-cue", "play_descent");
  const visual = scene.locator("svg[data-time]");
  await expect.poll(async () => Number(await visual.getAttribute("data-time"))).toBeGreaterThan(0);
  await player.getByRole("button", { name: "Pause" }).click();
  const paused = await visual.getAttribute("data-time");
  await page.waitForTimeout(350);
  expect(await visual.getAttribute("data-time")).toBe(paused);
  await player.getByRole("button", { name: "Resume" }).click();
  await expect.poll(async () => Number(await visual.getAttribute("data-time"))).toBeGreaterThan(Number(paused));
});

test("the last speech event completes the guide and captions remain optional", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/studio");
  const player = page.getByTestId("guided-player");
  await player.getByRole("button", { name: "Teach me" }).click();
  await player.getByRole("button", { name: "Captions on" }).click();
  await expect(page.getByTestId("guided-caption")).toHaveCount(0);
  for (let index = 0; index < 5; index += 1) await player.getByRole("button", { name: "Next" }).click();
  await expect(player).toContainText("Comparing angles");
  await page.evaluate(() => (window as unknown as { __finishVoice: () => void }).__finishVoice());
  await expect(player).toContainText("Guided lesson complete. Try the understanding check next.");
  await expect(player.getByRole("button", { name: "Teach again" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make it click." })).toBeVisible();
});

test("a delayed browser voice list becomes selectable without remounting", async ({ page }) => {
  await installSpeechMock(page, true);
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  const player = page.getByTestId("guided-player");
  await player.getByText("Voice settings").click();
  await expect(player.getByLabel("Browser voice")).toBeDisabled();
  await page.evaluate(() => (window as unknown as { __loadVoices: () => void }).__loadVoices());
  await expect(player.getByLabel("Browser voice")).toBeEnabled();
  await expect(player.getByLabel("Browser voice").locator("option")).toHaveCount(2);
});

test("unsupported speech degrades gracefully and mobile controls remain accessible", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: undefined });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  const player = page.getByTestId("guided-player");
  await expect(player).toContainText("Narration is unavailable in this browser.");
  await expect(player.getByRole("button", { name: "Narration on" })).toBeDisabled();
  await player.getByRole("button", { name: "Teach me" }).click();
  await expect(page.getByTestId("lesson-scene")).toHaveAttribute("data-guided-cue", "show_initial_state");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
