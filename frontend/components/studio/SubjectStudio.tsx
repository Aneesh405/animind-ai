"use client";
import "./subject-studio.css";
import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { Concept, Subject, registry, subjects } from "../../lib/visualizations";
import { Mode } from "../../lib/types";
import LearningStudio from "./LearningStudio";
import { visualizerComponents } from "../visualizations/registry";
const {
  water_molecule: LifeDiagrams,
  bubble_sort: BubbleSort,
  simple_pendulum: PhysicsModels,
  linear_function: FunctionGraph,
} = visualizerComponents;
import VoiceTutorControls from "./VoiceTutorControls";
interface Plan {
  planning_source?: "demo" | "gemini" | "gemini_cache" | "reference";
  title: string;
  explanation: string;
  steps: string[];
  comprehension_question: string;
  concept: Concept | null;
  parameters: Record<string, number | number[]>;
}
export default function SubjectStudio() {
  const [subject, setSubject] = useState<Subject>("Physics");
  const [projectileRequest, setProjectileRequest] = useState<{
    question: string;
    mode: Mode;
  }>();
  const [projectile, setProjectile] = useState(true);
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<Mode>("demo");
  const [lessonMode, setLessonMode] = useState<Mode>("demo");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const session = useRef("");
  function change(next: Subject) {
    version.current++;
    setBusy(false);
    window.speechSynthesis?.cancel();
    setSubject(next);
    setProjectile(false);
    setPlan(null);
    setQuestion("");
    setError("");
  }
  async function generate(text: string, concept?: Concept) {
    if (concept === "projectile_motion") {
      version.current++;
      setBusy(false);
      setPlan(null);
      window.speechSynthesis?.cancel();
      setProjectileRequest({ question: text, mode });
      setProjectile(true);
      return;
    }
    setProjectile(false);
    window.speechSynthesis?.cancel();
    setBusy(true);
    setError("");
    setPlan(null);
    const current = ++version.current;
    if (!session.current) session.current = crypto.randomUUID();
    try {
      const next = await api<Plan>("/api/visual-lesson", {
        session_id: session.current,
        subject,
        question: text,
        concept,
        mode,
      });
      if (current !== version.current) return;
      if (next.concept === "projectile_motion") {
        setProjectileRequest({ question: text, mode });
        setProjectile(true);
        return;
      }
      setPlan(next);
      setLessonMode(mode);
      setStep(0);
      setValues(
        Object.fromEntries(
          Object.entries(next.parameters).filter(
            (entry): entry is [string, number] => typeof entry[1] === "number",
          ),
        ),
      );
    } catch (e) {
      if (current === version.current)
        setError(e instanceof Error ? e.message : "Could not load lesson.");
    } finally {
      if (current === version.current) setBusy(false);
    }
  }
  return (
    <>
      <nav aria-label="Subjects" className="subject-tabs">
        {subjects.map((s) => (
          <button
            key={s}
            className="text-button"
            aria-pressed={subject === s}
            onClick={() => change(s)}
          >
            {s}
          </button>
        ))}
      </nav>
      {projectile ? (
        <LearningStudio initial={projectileRequest} />
      ) : (
        <main className="workspace subject-workspace" id="subject-content">
          <header className="lesson-heading">
            <span className="eyebrow">{subject}</span>
            <h1>
              Don&apos;t just learn it. <em>See it.</em>
            </h1>
            <p>
              Select an interactive lesson or ask a custom question. Other
              topics open as written explanations.
            </p>
          </header>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            {(Object.keys(registry) as Concept[])
              .filter((id) => registry[id].subject === subject)
              .map((id) => (
                <button
                  className="primary-button"
                  key={id}
                  onClick={() => {
                    setQuestion(registry[id].question);
                    void generate(registry[id].question, id);
                  }}
                >
                  {registry[id].title} · Interactive
                </button>
              ))}
          </div>
          <p className="subject-hint">
            Example question:{" "}
            {
              {
                Mathematics: "How does integration measure accumulated change?",
                Physics: "How does an electric field affect a charge?",
                Chemistry: "Why does sodium chloride form an ionic lattice?",
                Biology: "How does photosynthesis work?",
                "Computer Science": "How does binary search work?",
              }[subject]
            }{" "}
            <span>· Explanation only</span>
          </p>
          <form
            className="subject-question"
            onSubmit={(e) => {
              e.preventDefault();
              void generate(question);
            }}
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <label>
              Question{" "}
              <input
                value={question}
                minLength={3}
                maxLength={1500}
                required
                onChange={(e) => {
                  window.speechSynthesis?.cancel();
                  setQuestion(e.target.value);
                }}
                placeholder={`Ask about ${subject.toLowerCase()}`}
                style={{ padding: 12, minWidth: 250 }}
              />
            </label>
            <label>
              Mode{" "}
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
              >
                <option value="demo">Demo</option>
                <option value="gemini">Gemini</option>
              </select>
            </label>
            <button className="primary-button" disabled={busy}>
              Open lesson
            </button>
          </form>
          {busy && <p role="status">Preparing a validated lesson…</p>}
          {error && <p role="alert">{error}</p>}
          {plan && (
            <section
              className="subject-lesson"
              aria-label="Lesson"
              aria-busy={busy}
            >
              <span className="eyebrow">
                {plan.concept ? "Interactive lesson" : "Explanation only"} ·{" "}
                {lessonMode}
              </span>
              {plan.planning_source === "reference" && (
                <p role="status">
                  The generated visualization was rejected. Showing a written
                  reference.
                </p>
              )}
              {plan.planning_source === "gemini_cache" && (
                <p>Saved Gemini plan reused within this session.</p>
              )}
              <h2>{plan.title}</h2>
              <p>{plan.explanation}</p>
              {plan.concept === "linear_function" ||
              plan.concept === "quadratic_function" ? (
                <FunctionGraph
                  kind={plan.concept}
                  values={values}
                  onChange={setValues}
                />
              ) : null}
              {(plan.concept === "simple_pendulum" ||
                plan.concept === "newtons_second_law") && (
                <PhysicsModels
                  kind={plan.concept}
                  values={values}
                  onChange={setValues}
                />
              )}
              {(plan.concept === "water_molecule" ||
                plan.concept === "animal_cell") && (
                <LifeDiagrams key={plan.concept} kind={plan.concept} />
              )}
              {plan.concept === "bubble_sort" && (
                <BubbleSort
                  key={version.current}
                  initial={
                    Array.isArray(plan.parameters.values)
                      ? plan.parameters.values
                      : [5, 1, 4, 2, 8]
                  }
                />
              )}
              <div style={{ padding: 20 }}>
                <h3>
                  Step {step + 1} of {plan.steps.length}
                </h3>
                <p>{plan.steps[step]}</p>
                <button disabled={step === 0} onClick={() => setStep(step - 1)}>
                  Previous step
                </button>{" "}
                <button
                  disabled={step === plan.steps.length - 1}
                  onClick={() => setStep(step + 1)}
                >
                  Next step
                </button>
              </div>
              <VoiceTutorControls
                text={plan.steps[step]}
                contentKey={`${subject}-${version.current}-${step}-${question}`}
                stepLabel={`step ${step + 1}`}
              />
              <p>
                <strong>Check your understanding:</strong>{" "}
                {plan.comprehension_question}
              </p>
            </section>
          )}
        </main>
      )}
    </>
  );
}
