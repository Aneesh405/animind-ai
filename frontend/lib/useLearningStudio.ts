"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { calculate, DEFAULT_PARAMETERS, sameParameters } from "./physics";
import type { CheckResult, Health, Lesson, LessonSummary, Mode, Parameters, PDFDocument, Topic } from "./types";

export const INITIAL_QUESTION = "Why does a projectile travel farthest at 45 degrees?";

export function useLearningStudio() {
  const [sessionId, setSessionId] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [question, setQuestion] = useState(INITIAL_QUESTION);
  const [mode, setMode] = useState<Mode>("demo");
  const [parameters, setParameters] = useState<Parameters>(DEFAULT_PARAMETERS);
  const [recent, setRecent] = useState<LessonSummary[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState("Connecting to your learning engine");
  const [error, setError] = useState("");
  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);
  function selectStep(id: string) { setSelectedStepId(id); setFocusVersion(value => value + 1); }
  const [activeStage, setActiveStage] = useState(0);
  const [confusion, setConfusion] = useState("");
  const [whatIf, setWhatIf] = useState("");
  const [whatIfResult, setWhatIfResult] = useState("");
  const [answer, setAnswer] = useState("");
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const confusionInput = useRef<HTMLTextAreaElement>(null);
  const lessonRef = useRef<Lesson | null>(null);
  const parametersRef = useRef(DEFAULT_PARAMETERS);
  const busyRef = useRef(true);
  const attemptedParameters = useRef("");

  function acceptLesson(next: Lesson, syncParameters = true) {
    lessonRef.current = next;
    setLesson(next);
    if (syncParameters) {
      parametersRef.current = next.parameters;
      setParameters(next.parameters);
    }
    setCheckResult(null);
    setAnswer("");
    setRecent((previous) =>
      [
        {
          id: next.id,
          title: next.title,
          topic: next.topic,
          mode: next.mode,
          created_at: next.created_at,
        },
        ...previous.filter((item) => item.id !== next.id),
      ].slice(0, 15),
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        let id: string;
        try {
          id = localStorage.getItem("animind-session") || crypto.randomUUID();
          localStorage.setItem("animind-session", id);
        } catch {
          id = crypto.randomUUID();
        }
        setSessionId(id);
        const [status, supported, history] = await Promise.all([
          api<Health>("/health"),
          api<Topic[]>("/api/supported-topics"),
          api<LessonSummary[]>(`/api/lessons?session_id=${id}`),
        ]);
        if (cancelled) return;
        setHealth(status);
        setTopics(supported);
        setRecent(history);
        const requested = new URLSearchParams(window.location.search).get("question")?.trim().slice(0, 1500);
        if (requested) setQuestion(requested);
        const initial = requested
          ? await api<Lesson>("/api/lesson", { session_id: id, question: requested, mode: "demo" })
          : history.length
          ? await api<Lesson>(`/api/lessons/${history[0].id}?session_id=${id}`)
          : await api<Lesson>("/api/lesson", {
              session_id: id,
              question: INITIAL_QUESTION,
              mode: "demo",
            });
        if (cancelled) return;
        acceptLesson(initial);
        setQuestion(initial.student_question);
        setMode(initial.mode);
      } catch (failure) {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : "The learning engine couldn't start.",
          );
      } finally {
        if (!cancelled) {
          busyRef.current = false;
          setBusy("");
        }
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  async function perform(label: string, operation: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(label);
    setError("");
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }

  async function saveParameters(): Promise<Lesson | null> {
    const current = lessonRef.current;
    const draft = parametersRef.current;
    if (!current || sameParameters(current.parameters, draft)) return current;
    attemptedParameters.current = JSON.stringify(draft);
    const response = await api<{ lesson: Lesson; explanation: string }>(
      "/api/what-if",
      {
        session_id: current.session_id,
        lesson_id: current.id,
        revision: current.revision,
        changes: draft,
      },
    );
    acceptLesson(response.lesson, sameParameters(parametersRef.current, draft));
    setWhatIfResult(response.explanation);
    return response.lesson;
  }

  useEffect(() => {
    if (
      !lesson ||
      busy ||
      sameParameters(parameters, lesson.parameters) ||
      attemptedParameters.current === JSON.stringify(parameters)
    )
      return;
    const timer = window.setTimeout(() => {
      void perform("Updating the simulation", async () => {
        await saveParameters();
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [parameters, lesson, busy]);

  function resetInteraction() {
    setSelectedStepId(null);
    setConfusion("");
    setWhatIf("");
    setWhatIfResult("");
    setAnswer("");
    setCheckResult(null);
    attemptedParameters.current = "";
  }

  async function generate(text = question, topic?: Topic, useDocument = true) {
    if (text.trim().length < 3 || !sessionId) return;
    setQuestion(text);
    await perform(
      mode === "gemini"
        ? "Gemini is planning your visual lesson"
        : "Building your demo lesson",
      async () => {
        const next = await api<Lesson>("/api/lesson", {
          session_id: sessionId,
          question: text,
          mode,
          ...(document && useDocument
            ? { document_id: document.id, topic: topic?.id }
            : {}),
        });
        acceptLesson(next);
        resetInteraction();
        // Optional status refresh must not hold the completed lesson behind a request.
        void api<Health>("/health").then(setHealth).catch(() => {});
      },
    );
  }

  async function adapt(feedback = confusion) {
    if (!lesson || feedback.trim().length < 3) return;
    const stepId = selectedStepId || lesson.steps[0].id;
    await perform(
      lesson.mode === "gemini"
        ? "Gemini is finding another teaching strategy"
        : "Switching to another visual strategy",
      async () => {
        const current = await saveParameters();
        if (!current) return;
        const next = await api<Lesson>("/api/adapt", {
          session_id: sessionId,
          lesson_id: current.id,
          revision: current.revision,
          step_id: stepId,
          confusion: feedback,
        });
        acceptLesson(next);
        setSelectedStepId(null);
        setConfusion(feedback);
        setWhatIfResult("");
        window.requestAnimationFrame(() => {
          const visual = window.document.getElementById("lesson-visual");
          if (visual && (visual.getBoundingClientRect().top < 0 || visual.getBoundingClientRect().top > window.innerHeight / 2)) {
            visual.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
          }
        });
      },
    );
  }

  async function explore(text = whatIf) {
    if (!lesson || text.trim().length < 3) return;
    setWhatIf(text);
    await perform("Calculating the what-if change", async () => {
      const current = await saveParameters();
      if (!current) return;
      const response = await api<{ lesson: Lesson; explanation: string }>(
        "/api/what-if",
        {
          session_id: sessionId,
          lesson_id: current.id,
          revision: current.revision,
          question: text,
        },
      );
      acceptLesson(response.lesson);
      setWhatIfResult(response.explanation);
    });
  }

  async function checkUnderstanding() {
    if (
      !lesson ||
      !answer ||
      !sameParameters(parametersRef.current, lesson.parameters)
    )
      return;
    await perform("Checking your answer", async () => {
      const current = await saveParameters();
      if (!current) return;
      const result = await api<CheckResult>("/api/check-understanding", {
        session_id: sessionId,
        lesson_id: current.id,
        revision: current.revision,
        check_id: current.understanding_check.id,
        answer,
      });
      setCheckResult(result);
    });
  }

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a text-based PDF smaller than 10 MB.");
      return;
    }
    await perform("Reading your lecture notes", async () => {
      const form = new FormData();
      form.append("session_id", sessionId);
      form.append("file", file);
      const result = await api<PDFDocument>("/api/upload-pdf", form);
      setDocument(result);
    });
  }

  async function openLesson(id: string) {
    await perform("Opening your lesson", async () => {
      const next = await api<Lesson>(
        `/api/lessons/${id}?session_id=${sessionId}`,
      );
      acceptLesson(next);
      setQuestion(next.student_question);
      setMode(next.mode);
      setDocument(null);
      resetInteraction();
    });
  }

  function newLesson() {
    if (busyRef.current) return;
    setLesson(null);
    lessonRef.current = null;
    setQuestion("");
    setDocument(null);
    setError("");
    resetInteraction();
    questionInput.current?.focus();
  }

  function updateParameter(name: keyof Parameters, value: number) {
    const next = { ...parametersRef.current, [name]: value };
    parametersRef.current = next;
    attemptedParameters.current = "";
    setParameters(next);
    setCheckResult(null);
  }

  const selectedIndex =
    lesson?.steps.findIndex((step) => step.id === selectedStepId) ?? -1;
  const selectedStep = lesson?.steps[selectedIndex];
  const metrics = calculate(parameters);
  const isPreview = Boolean(
    lesson && !sameParameters(parameters, lesson.parameters),
  );

  function resetParameters() {
    parametersRef.current = DEFAULT_PARAMETERS;
    attemptedParameters.current = "";
    setParameters(DEFAULT_PARAMETERS);
    setCheckResult(null);
  }

  return {
    sessionId, lesson, question, setQuestion, mode, setMode, parameters, recent,
    topics, health, busy, error, setError, document, setDocument, selectedStepId,
    setSelectedStepId, selectStep, focusVersion, activeStage, setActiveStage, confusion, setConfusion,
    whatIf, setWhatIf, whatIfResult, answer, setAnswer, checkResult, setCheckResult,
    fileInput, questionInput, confusionInput,
    selectedIndex, selectedStep, metrics, isPreview,
    generate, adapt, explore, checkUnderstanding, upload, openLesson, newLesson,
    updateParameter, resetParameters, perform, saveParameters,
  };
}

export type StudioState = ReturnType<typeof useLearningStudio>;
