"use client";

import { ArrowDown, ArrowRight, Check, ChevronRight, Lightbulb, Repeat2, Volume2 } from "lucide-react";
import Equation from "../Equation";
import type { StudioState } from "../../lib/useLearningStudio";
import { visualEvidence } from "../../lib/walkthrough";

export default function LessonCompanion({ studio: s }: { studio: StudioState }) {
  const lesson = s.lesson;
  if (!lesson) return null;
  const visibleStep = s.selectedStep || lesson.steps[Math.min(s.activeStage, lesson.steps.length - 1)];
  return (
    <aside className="teaching-column" aria-label="Step-by-step tutor">
      <div className="tutor-header"><div><span className="eyebrow">YOUR LEARNING COMPANION</span><h2>One idea at a time.</h2></div></div>
      <p className="step-instruction">Follow the steps. Stop wherever you need to.</p>
      <div className="lesson-progress" role="progressbar" aria-label="Current visual stage" aria-valuemin={1} aria-valuemax={lesson.steps.length} aria-valuenow={(s.selectedIndex >= 0 ? s.selectedIndex : s.activeStage) + 1}>{lesson.steps.map((step, index) => <span key={step.id} className={index <= (s.selectedIndex >= 0 ? s.selectedIndex : s.activeStage) ? "reached" : ""} />)}<small>{(s.selectedIndex >= 0 ? s.selectedIndex : s.activeStage) + 1} / {lesson.steps.length}</small></div>
      <nav className="lesson-steps" aria-label="Lesson steps">
        {lesson.steps.map((step, index) => <button key={step.id} data-testid={`lesson-step-${index + 1}`} className={`lesson-step ${s.selectedStepId === step.id ? "selected" : ""} ${s.activeStage === index ? "visual-active" : ""}`} aria-pressed={s.selectedStepId === step.id} disabled={Boolean(s.busy)} onClick={() => s.selectStep(step.id)}><span className="step-number">{String(index + 1).padStart(2, "0")}</span><span className="step-copy"><strong>{step.title}</strong><span>{step.text}</span><small className="step-evidence">Look for: {visualEvidence(step.equation_key, lesson.scene)}</small></span><ChevronRight size={14} /></button>)}
      </nav>
      <div className="selected-explanation" key={s.selectedStep?.id || lesson.scene}>
        <span className="small-label">{s.selectedStep ? `A CLOSER LOOK · STEP ${s.selectedIndex + 1}` : "THE IDEA TO NOTICE"}</span>
        <p>{visibleStep.text}</p>
        <p className="guided-location-note"><Volume2 size={14} aria-hidden="true" />Narration now follows the active visual inside the Guided Lesson player.</p>
        <Equation equationKey={visibleStep.equation_key} />
      </div>

      <section className="confusion-panel" aria-labelledby="different-heading">
        <div className="confusion-heading"><Repeat2 size={18} /><h2 id="different-heading">A different way to see it.</h2></div>
        <p>Tell AniMind what&apos;s confusing. We&apos;ll find another way to show it.</p>
        {s.selectedStep ? <form onSubmit={(e) => { e.preventDefault(); void s.adapt(); }}>
          <label htmlFor="confusion">What feels unclear about step {s.selectedIndex + 1}?</label>
          <textarea ref={s.confusionInput} id="confusion" rows={3} value={s.confusion} maxLength={1500} placeholder="Why doesn't 60° travel farther if it stays in the air longer?" onChange={(e) => s.setConfusion(e.target.value)} />
          <button className="adapt-button" type="submit" disabled={Boolean(s.busy) || s.confusion.trim().length < 3}><Repeat2 size={15} />Explain it differently<ArrowRight size={15} /></button>
        </form> : <button className="choose-step-button" disabled={Boolean(s.busy)} onClick={() => { s.selectStep(lesson.steps[Math.min(1, lesson.steps.length - 1)].id); window.setTimeout(() => s.confusionInput.current?.focus(), 50); }}>Choose a confusing step<ArrowDown size={14} /></button>}
        {lesson.adaptation && <div className="hypothesis"><span>A possible source of confusion</span><p>{lesson.adaptation.misconception_hypothesis}</p><small>{lesson.mode === "demo" ? "Predefined demo hypothesis" : "Gemini hypothesis based on your feedback"}</small></div>}
      </section>

      <section className="understanding-check" aria-labelledby="check-heading">
        <div className="section-title"><h2 id="check-heading"><Lightbulb size={16} />Make it click.</h2><span className="small-label">A QUICK CHECK</span></div>
        <form onSubmit={(e) => { e.preventDefault(); void s.checkUnderstanding(); }}>
          <fieldset disabled={Boolean(s.busy)}><legend>{lesson.understanding_check.question}</legend>
            {lesson.understanding_check.options.map((option) => <label className={`check-option ${s.answer === option.id ? "chosen" : ""}`} key={option.id}><input type="radio" name="understanding" value={option.id} checked={s.answer === option.id} onChange={() => { s.setAnswer(option.id); s.setCheckResult(null); }} /><span>{option.label}</span></label>)}
          </fieldset>
          <button className="check-button" type="submit" disabled={Boolean(s.busy) || !s.answer || s.isPreview}>Check my understanding<ArrowRight size={14} /></button>
        </form>
        {s.checkResult && <div className={`check-feedback ${s.checkResult.correct ? "correct" : "revisit"}`} role="status"><strong>{s.checkResult.correct ? <Check size={17} /> : <Lightbulb size={17} />}{s.checkResult.feedback}</strong><p>{s.checkResult.answer_explanation}</p>{s.checkResult.suggested_confusion && <button className="text-button" disabled={Boolean(s.busy)} onClick={() => { s.setSelectedStepId(null); void s.adapt(s.checkResult?.suggested_confusion || ""); }}>Try another visual<ArrowRight size={13} /></button>}</div>}
      </section>
    </aside>
  );
}
