"use client";

import { ArrowRight, CircleHelp, Compass, Repeat2, X } from "lucide-react";
import { INITIAL_QUESTION, useLearningStudio } from "../../lib/useLearningStudio";
import { SCENE_NAMES } from "../../lib/physics";
import GuidedLessonPlayer from "./GuidedLessonPlayer";
import StudioNavigation from "./StudioNavigation";
import QuestionComposer from "./QuestionComposer";
import VariableControls, { CalculatedResults } from "./VariableControls";
import LessonCompanion from "./LessonCompanion";
import LessonReferences from "./LessonReferences";
import RedPenChallenge from "./RedPenChallenge";

export default function LearningStudio({initial}: {initial?: {question: string; mode: "demo" | "gemini"}} = {}) {
  const studio = useLearningStudio(initial);
  const { lesson, busy, error } = studio;
  return (
    <div className="studio-shell">
      <a className="skip-link" href="#learning-content">Skip to lesson</a>
      <StudioNavigation studio={studio} />
      <main id="learning-content" className="workspace">
        <header className="lesson-heading">
          <div className="lesson-eyebrow"><span className="eyebrow">CURIOSITY LAB 01 <span>/</span> PROJECTILE MOTION</span>{lesson && <span className={`lesson-source ${lesson.mode}`} data-testid="lesson-mode"><i />{lesson.mode === "demo" ? "Demo lesson" : "Gemini lesson"}</span>}</div>
          <h1>{lesson ? lesson.student_question : <>What are you <em>curious</em> about today?</>}</h1>
          <p>{lesson ? lesson.objective : "Every great understanding starts with a question."}</p>
        </header>
        <QuestionComposer studio={studio} />
        {lesson?.planning_source === "gemini_cache" && <p className="cache-notice" data-testid="planning-source">Saved Gemini plan · reused within this session. Physics recalculated for this lesson.</p>}

        {error && <div className="error-banner" role="alert"><CircleHelp size={19} /><div><strong>Let&apos;s get that working</strong><p>{error}</p>{studio.mode === "gemini" && <button className="text-button" onClick={() => studio.setMode("demo")}>Use Demo mode for the next lesson<ArrowRight size={13} /></button>}</div><button className="icon-button" aria-label="Dismiss error" onClick={() => studio.setError("")}><X size={17} /></button></div>}
        {busy && <div className="loading-status" role="status"><span className="loading-bars" aria-hidden="true"><i /><i /><i /></span><span>{busy}…</span><span className="loading-detail">{busy.includes("Gemini") ? "Request sent → waiting for a validated plan → open lesson" : "Preparing the supported lesson and its calculated visuals."}</span></div>}

        {lesson ? <>
          {lesson.adaptation && <div className="adaptation-banner" data-testid="adaptation-banner" role="status"><Repeat2 size={20} /><div><strong>A different way to see it</strong><p>{SCENE_NAMES[lesson.adaptation.previous_strategy]}<ArrowRight size={13} />{SCENE_NAMES[lesson.adaptation.new_strategy]}</p></div><span>{lesson.strategy_history.length - 1} {lesson.strategy_history.length === 2 ? "new perspective" : "new perspectives"}</span></div>}
          <div className="lesson-layout" aria-busy={Boolean(busy)}>
            <section className="visual-column" id="lesson-visual" aria-label="Interactive visual lesson">
              <div className="visual-caption"><span><span className="caption-index">LIVE EXHIBIT 01</span>{lesson.title}</span><span>TOUCH THE PHYSICS</span></div>
              <GuidedLessonPlayer key={`${lesson.id}:${lesson.revision}`} lesson={lesson} parameters={studio.parameters} focusIndex={studio.selectedIndex >= 0 ? studio.selectedIndex : null} focusVersion={studio.focusVersion} onStageChange={studio.setActiveStage} onExplore={() => studio.setSelectedStepId(null)} />
              <CalculatedResults studio={studio} />
            </section>
            <LessonCompanion studio={studio} />
            <section className="exploration-column" aria-label="Physics variables and experiments">
              <VariableControls studio={studio} />
              <LessonReferences lesson={lesson} />
            </section>
          </div>
          <RedPenChallenge parameters={studio.parameters} disabled={Boolean(busy)} />
          <section className="followups" aria-label="Suggested questions"><span className="eyebrow">CURIOSITY DOESN&apos;T STOP HERE</span>{lesson.suggested_questions.map((suggestion) => <button key={suggestion} disabled={Boolean(busy)} onClick={() => void studio.generate(suggestion)}>{suggestion}<ArrowRight size={14} /></button>)}</section>
        </> : busy ? <section className="lesson-pending" aria-label="Lesson workspace preparing"><div className="pending-canvas"><Compass size={36} strokeWidth={1} /><h2>Preparing your visual lesson</h2><p>The animation will open after the topic and teaching plan are validated.</p></div><div className="pending-notes"><span className="eyebrow">YOUR LEARNING COMPANION</span><p>Knowns → components → equations → motion → calculation → meaning</p><small>For ideal, equal-height projectile motion.</small></div></section> : <section className="empty-state"><Compass size={42} strokeWidth={1} /><h2>A question can change<br />the way you <em>see.</em></h2><p>Start with projectile motion. Discover the connection between direction, time, and distance.</p><button className="primary-button" disabled={!studio.sessionId} onClick={() => void studio.generate(INITIAL_QUESTION)}>Explore why 45° goes farthest<ArrowRight size={16} /></button><small>Ideal projectile motion · velocity components · launch angles</small></section>}
        <footer className="workspace-footer"><span>Animind AI <span>·</span> Don&apos;t Just Learn It. See It.</span><span>The Curiosity Lab · Physics 01</span></footer>
      </main>
    </div>
  );
}
