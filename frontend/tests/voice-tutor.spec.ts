import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
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

test("Voice Tutor controls real lifecycle, preferences, synchronization, and cleanup", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await page.getByRole("button", { name: "Pause animation" }).click();
  await page.getByTestId("lesson-step-2").click();

  const tutor = page.getByTestId("voice-tutor");
  await expect(tutor).toContainText("Ready to narrate step 2.");
  expect((await voiceLog(page)).texts).toEqual([]);

  await tutor.getByRole("button", { name: "Listen" }).click();
  await expect(tutor).toContainText("Speaking step 2.");
  let log = await voiceLog(page);
  expect(log.texts).toHaveLength(1);
  expect(log.texts[0]).not.toMatch(/[*_`<>]/);

  await tutor.getByRole("button", { name: "Pause" }).click();
  await expect(tutor).toContainText("Narration paused on step 2.");
  await tutor.getByRole("button", { name: "Resume" }).click();
  await expect(tutor).toContainText("Speaking step 2.");
  log = await voiceLog(page);
  expect(log.pauses).toBe(1);
  expect(log.resumes).toBe(1);

  await tutor.getByRole("button", { name: "Stop" }).click();
  await expect(tutor).toContainText("Ready to narrate step 2.");
  await tutor.getByText("Voice settings").click();
  await tutor.getByLabel("Speaking speed").selectOption("faster");
  await tutor.getByLabel("Browser voice").selectOption("clear-en");
  await tutor.getByRole("button", { name: "Replay" }).click();
  log = await voiceLog(page);
  expect(log.rates.at(-1)).toBe(1.12);
  expect(log.voices.at(-1)).toBe("clear-en");
  expect(await page.evaluate(() => localStorage.getItem("animind-voice-rate"))).toBe("faster");
  expect(await page.evaluate(() => localStorage.getItem("animind-voice-uri"))).toBe("clear-en");

  await page.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause animation" })).toBeVisible();
  await page.getByTestId("lesson-step-3").click();
  await expect(tutor).toContainText("Ready to narrate step 3.");
  const cancellationsAfterStepChange = (await voiceLog(page)).cancels;
  expect(cancellationsAfterStepChange).toBeGreaterThan(0);

  await tutor.getByRole("button", { name: "Listen" }).click();
  await page.getByRole("button", { name: "New lesson" }).click();
  await expect(page.getByTestId("voice-tutor")).toHaveCount(0);
  expect((await voiceLog(page)).cancels).toBeGreaterThan(cancellationsAfterStepChange);
});

test("speech completion returns controls to idle and rapid replay never overlaps", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  await page.getByRole("button", { name: "Pause animation" }).click();
  const tutor = page.getByTestId("voice-tutor");
  await tutor.getByRole("button", { name: "Listen" }).click();
  await tutor.getByRole("button", { name: "Replay" }).click();
  await tutor.getByRole("button", { name: "Replay" }).click();
  const log = await voiceLog(page);
  expect(log.texts).toHaveLength(3);
  expect(log.cancels).toBeGreaterThanOrEqual(3);
  await page.evaluate(() => (window as unknown as { __finishVoice: () => void }).__finishVoice());
  await expect(tutor).toContainText("Ready to narrate step 1.");
  await tutor.getByRole("button", { name: "Listen" }).click();
  await page.evaluate(() => (window as unknown as { __errorVoice: () => void }).__errorVoice());
  await expect(tutor).toContainText("Narration could not continue.");
  await tutor.getByRole("button", { name: "Replay" }).click();
  await expect(tutor).toContainText("Speaking step 1.");
});

test("a delayed browser voice list becomes selectable without remounting", async ({ page }) => {
  await installSpeechMock(page, true);
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  const tutor = page.getByTestId("voice-tutor");
  await tutor.getByText("Voice settings").click();
  await expect(tutor.getByLabel("Browser voice")).toBeDisabled();
  await page.evaluate(() => (window as unknown as { __loadVoices: () => void }).__loadVoices());
  await expect(tutor.getByLabel("Browser voice")).toBeEnabled();
  await expect(tutor.getByLabel("Browser voice").locator("option")).toHaveCount(2);
});

test("unsupported speech degrades gracefully and mobile controls remain accessible", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: undefined });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await expect(page.getByTestId("lesson-scene")).toBeVisible();
  const tutor = page.getByTestId("voice-tutor");
  await expect(tutor).toContainText("Voice Tutor is unavailable in this browser.");
  await expect(tutor.getByRole("button", { name: "Listen" })).toBeDisabled();
  await expect(tutor.getByRole("button", { name: "Replay" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
