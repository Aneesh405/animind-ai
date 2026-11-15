"use client";

import {
  ArrowRight,
  Check,
  Eye,
  Lightbulb,
  PenLine,
  RotateCcw,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { calculate } from "../../lib/physics";
import {
  challengeParameters,
  RED_PEN_CHALLENGES,
} from "../../lib/redPenChallenges";
import type { Parameters } from "../../lib/types";
import ProjectileScene from "../ProjectileScene";

interface RedPenProps {
  parameters: Parameters;
  disabled?: boolean;
}

export default function RedPenChallenge({ parameters, disabled }: RedPenProps) {
  const [open, setOpen] = useState(false);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [evaluatedIndex, setEvaluatedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showVisual, setShowVisual] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [firstTryResults, setFirstTryResults] = useState<Record<string, boolean>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const challenge = RED_PEN_CHALLENGES[challengeIndex];
  const incorrectIndex = challenge.incorrectStatementIndex;
  const answeredCorrectly = evaluatedIndex === incorrectIndex;
  const correctionRevealed = answeredCorrectly || revealed || showVisual;
  const visualParameters = challengeParameters(challenge, parameters);

  function focusPanel() {
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function openChallenge() {
    setOpen(true);
    focusPanel();
  }

  function checkAnswer() {
    if (selectedIndex === null || evaluatedIndex !== null) return;
    setEvaluatedIndex(selectedIndex);
    setFirstTryResults((previous) =>
      challenge.id in previous
        ? previous
        : { ...previous, [challenge.id]: selectedIndex === incorrectIndex },
    );
  }

  function retryAnswer() {
    setSelectedIndex(null);
    setEvaluatedIndex(null);
    setRevealed(false);
    setShowVisual(false);
  }

  function showWhy() {
    setShowVisual(true);
    setRevealed(true);
    window.requestAnimationFrame(() =>
      visualRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      }),
    );
  }

  function nextChallenge() {
    if (challengeIndex === RED_PEN_CHALLENGES.length - 1) {
      setCompleted(true);
      focusPanel();
      return;
    }
    setChallengeIndex((value) => value + 1);
    setSelectedIndex(null);
    setEvaluatedIndex(null);
    setRevealed(false);
    setShowVisual(false);
    focusPanel();
  }

  function restart() {
    setChallengeIndex(0);
    setSelectedIndex(null);
    setEvaluatedIndex(null);
    setRevealed(false);
    setShowVisual(false);
    setCompleted(false);
    setFirstTryResults({});
    focusPanel();
  }

  if (!open) {
    return (
      <section className="red-pen-entry" aria-labelledby="red-pen-entry-title">
        <div className="red-pen-entry-mark" aria-hidden="true">
          <PenLine size={22} />
        </div>
        <div>
          <span className="eyebrow">OPTIONAL CONCEPT CHALLENGE</span>
          <h2 id="red-pen-entry-title">The AI made a mistake. Can you catch it?</h2>
          <p>Find one deliberate misconception, then prove the correction with the real physics visualizer.</p>
        </div>
        <button className="red-pen-open" disabled={disabled} onClick={openChallenge}>
          Try Red Pen Challenge <ArrowRight size={15} />
        </button>
      </section>
    );
  }

  const firstTryScore = Object.values(firstTryResults).filter(Boolean).length;
  const reviewTitles = RED_PEN_CHALLENGES.filter(
    (item) => firstTryResults[item.id] === false,
  ).map((item) => item.title);

  return (
    <section className="red-pen-panel" aria-labelledby="red-pen-title" data-testid="red-pen-challenge">
      <header className="red-pen-header">
        <div className="red-pen-title-group">
          <span className="red-pen-kicker"><PenLine size={14} /> RED PEN CHALLENGE</span>
          <h2 id="red-pen-title" ref={headingRef} tabIndex={-1}>
            The AI made a mistake. Can you catch it?
          </h2>
          <p>One statement below is deliberately wrong. Regular AniMind lessons remain scientifically verified.</p>
        </div>
        <button className="icon-button" aria-label="Close Red Pen Challenge" onClick={() => setOpen(false)}>
          <X size={18} />
        </button>
      </header>

      {completed ? (
        <div className="red-pen-complete" role="status">
          <div className="red-pen-complete-mark"><Check size={26} /></div>
          <span className="eyebrow">CHALLENGE COMPLETE</span>
          <h3>You checked every claim against the physics.</h3>
          <p>You caught {firstTryScore} of {RED_PEN_CHALLENGES.length} misconceptions on the first try.</p>
          {reviewTitles.length > 0 ? (
            <p className="red-pen-review"><Lightbulb size={15} /> Review next: {reviewTitles.join(" · ")}</p>
          ) : (
            <p className="red-pen-review"><Lightbulb size={15} /> All three concepts connected on the first try.</p>
          )}
          <button className="secondary-button" onClick={restart}><RotateCcw size={15} />Play again</button>
        </div>
      ) : (
        <>
          <div className="red-pen-progress" aria-label={`Challenge ${challengeIndex + 1} of ${RED_PEN_CHALLENGES.length}`}>
            <span>Challenge {challengeIndex + 1} of {RED_PEN_CHALLENGES.length}</span>
            <div aria-hidden="true">{RED_PEN_CHALLENGES.map((item, index) => <i key={item.id} className={index <= challengeIndex ? "reached" : ""} />)}</div>
          </div>

          <div className="red-pen-question">
            <div className="red-pen-prompt">
              <span className="small-label">SPOT THE MISCONCEPTION</span>
              <h3>{challenge.title}</h3>
              <p>Select the one scientifically incorrect statement.</p>
              <details>
                <summary>Assumptions for this challenge</summary>
                <ul>{challenge.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
              </details>
              <p className="red-pen-hint"><Lightbulb size={14} /><span><strong>Hint:</strong> {challenge.hint}</span></p>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); checkAnswer(); }}>
              <fieldset disabled={evaluatedIndex !== null}>
                <legend className="sr-only">Choose the incorrect statement</legend>
                <div className="red-pen-statements">
                  {challenge.statements.map((statement, index) => {
                    const isSelected = selectedIndex === index;
                    const isIncorrect = correctionRevealed && index === incorrectIndex;
                    return (
                      <label
                        className={`red-pen-statement ${isSelected ? "selected" : ""} ${isIncorrect ? "misconception" : ""}`}
                        key={statement.text}
                      >
                        <input
                          type="radio"
                          name={`red-pen-${challenge.id}`}
                          checked={isSelected}
                          onChange={() => setSelectedIndex(index)}
                        />
                        <span className="red-pen-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                        <span>{statement.text}</span>
                        {isIncorrect && <span className="red-pen-mark" aria-label="Incorrect statement">×</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {evaluatedIndex === null && (
                <button className="red-pen-check" type="submit" disabled={selectedIndex === null}>
                  Check Answer <ArrowRight size={15} />
                </button>
              )}
            </form>
          </div>

          {evaluatedIndex !== null && (
            <div className={`red-pen-feedback ${answeredCorrectly ? "correct" : "retry"}`} role="status" aria-live="polite">
              <div>
                {answeredCorrectly ? <Check size={19} /> : <Lightbulb size={19} />}
                <div>
                  <strong>{answeredCorrectly ? "You caught the misconception." : "That statement is scientifically accurate."}</strong>
                  <p>{challenge.statements[evaluatedIndex].rationale}</p>
                </div>
              </div>
              {!answeredCorrectly && !revealed && (
                <div className="red-pen-feedback-actions">
                  <button className="secondary-button" onClick={retryAnswer}>Try again</button>
                  <button className="text-button" onClick={() => setRevealed(true)}>Reveal the misconception</button>
                </div>
              )}
            </div>
          )}

          {correctionRevealed && (
            <div className="red-pen-correction" data-testid="red-pen-correction">
              <span className="small-label">THE CORRECTION</span>
              <p className="red-pen-wrong"><strong>Incorrect:</strong> {challenge.statements[incorrectIndex].text}</p>
              <p>{challenge.misconceptionExplanation}</p>
              <p><strong>Correct physics:</strong> {challenge.correctExplanation}</p>
            </div>
          )}

          {evaluatedIndex !== null && (
            <div className="red-pen-actions">
              <button className="red-pen-show" onClick={showWhy}><Eye size={16} />Show Me Why</button>
              {correctionRevealed && (
                <button className="secondary-button" onClick={nextChallenge}>
                  {challengeIndex === RED_PEN_CHALLENGES.length - 1 ? "Finish Challenge" : "Next Challenge"}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}

          {showVisual && (
            <div className="red-pen-proof" ref={visualRef} data-testid="red-pen-visual">
              <div className="red-pen-proof-heading">
                <div><span className="small-label">VISUAL PROOF</span><h3>{challenge.visualization.caption}</h3></div>
                <p>{challenge.visualization.prompt}</p>
              </div>
              <ProjectileScene
                key={challenge.id}
                mode={challenge.visualization.mode}
                parameters={visualParameters}
                focusIndex={null}
                stepCount={1}
                onStageChange={() => {}}
                initialComparison={challenge.visualization.compare}
                comparisonAngles={challenge.visualization.comparisonAngles}
              />
              <PhysicsEvidence challengeId={challenge.id} parameters={visualParameters} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PhysicsEvidence({ challengeId, parameters }: { challengeId: string; parameters: Parameters }) {
  if (challengeId === "velocity-at-apex") {
    const metrics = calculate(parameters);
    return (
      <div className="red-pen-evidence-grid components" aria-label="Calculated component evidence">
        <div><span>Horizontal velocity</span><strong>{metrics.horizontal_velocity.toFixed(2)} m/s</strong><small>constant before impact</small></div>
        <div><span>Vertical velocity at apex</span><strong>0.00 m/s</strong><small>gravity still points down</small></div>
      </div>
    );
  }
  const angles = challengeId === "complementary-ranges" ? [30, 60] : [30, 45, 60];
  return (
    <div className="red-pen-evidence-grid" aria-label="Calculated trajectory evidence">
      {angles.map((angle) => {
        const metrics = calculate(parameters, angle);
        return (
          <div key={angle} data-testid={`red-pen-evidence-${angle}`}>
            <span>{angle}° launch</span>
            <strong>{metrics.range.toFixed(2)} m range</strong>
            <small>{metrics.flight_time.toFixed(2)} s flight · {metrics.max_height.toFixed(2)} m peak</small>
          </div>
        );
      })}
    </div>
  );
}
