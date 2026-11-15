"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Pause, Play, RotateCcw } from "lucide-react";
import { calculate, SCENE_NAMES } from "../lib/physics";
import type { Parameters, SceneType, Step } from "../lib/types";
import { CHAPTERS, CHAPTER_STARTS, flightProgress, focusProgress, stepForChapter, visualChapter, WALKTHROUGH_MS, walkthrough } from "../lib/walkthrough";
import Equation from "./Equation";
import { COLORS, SELECTED_COLOR, Components, RangeComparison, Trajectories } from "./physics/SceneDiagrams";
import type { GuidedScene } from "../lib/guidedLessons";

interface SceneProps {
  mode: SceneType;
  parameters: Parameters;
  focusIndex: number | null;
  stepCount: number;
  onStageChange: (stage: number) => void;
  initialComparison?: boolean;
  autoplay?: boolean;
  steps?: Step[];
  focusVersion?: number;
  onInteract?: () => void;
  comparisonAngles?: number[];
  guided?: { scene: GuidedScene; playing: boolean; run: number };
  guidedControls?: ReactNode;
}

export default function ProjectileScene({
  mode,
  parameters,
  focusIndex,
  stepCount,
  onStageChange,
  initialComparison = true,
  autoplay = true,
  steps,
  focusVersion = 0,
  onInteract,
  comparisonAngles,
  guided,
  guidedControls,
}: SceneProps) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [compact, setCompact] = useState(false);
  const [compare, setCompare] = useState(initialComparison);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);
  const stageCallback = useRef(onStageChange);
  const markerId = useId().replace(/:/g, "");
  stageCallback.current = onStageChange;
  const chapter = visualChapter(progress);
  const goal = steps?.[focusIndex ?? steps.length - 1]?.equation_key || "range";
  // A height step needs an actual apex, even inside a range-comparison lesson.
  const diagramMode = guided?.scene.visualizationId ?? (steps && goal === "height" && chapter === 3 ? "components" : mode);
  const stage = steps ? stepForChapter(steps, chapter, goal) : Math.min(stepCount - 1, Math.floor(progress * stepCount));
  const motion = guided ? progress : steps ? flightProgress(progress) : progress;
  const teaching = walkthrough(parameters, chapter, goal, diagramMode);

  useLayoutEffect(() => {
    if (guided) return;
    setProgress(0);
    setPlaying(autoplay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [mode, autoplay, Boolean(guided)]);

  useLayoutEffect(() => {
    if (!guided) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setProgress(reduced ? guided.scene.progressEnd : guided.scene.progressStart);
    setPlaying(!reduced && guided.playing && guided.scene.progressEnd > guided.scene.progressStart);
  }, [guided?.scene.id, guided?.run]);

  useEffect(() => {
    if (guided) setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches && guided.playing && progress < guided.scene.progressEnd);
  }, [guided?.playing]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const respectMotion = () => { if (media.matches) setPlaying(false); };
    media.addEventListener("change", respectMotion);
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 520));
    const visibility = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; }, { rootMargin: "80px" });
    if (containerRef.current) observer.observe(containerRef.current);
    if (containerRef.current) visibility.observe(containerRef.current);
    return () => { observer.disconnect(); visibility.disconnect(); media.removeEventListener("change", respectMotion); };
  }, []);

  useLayoutEffect(() => {
    if (focusIndex !== null) {
      setProgress(steps ? focusProgress(steps[focusIndex].equation_key) : focusIndex / stepCount);
      setPlaying(false);
    }
  }, [focusIndex, stepCount, focusVersion]);

  useEffect(() => {
    stageCallback.current(stage);
  }, [stage]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previousTime = 0;
    function animate(now: number) {
      if (!visibleRef.current || document.hidden) {
        previousTime = 0;
        frame = window.requestAnimationFrame(animate);
        return;
      }
      if (previousTime) {
        const duration = guided?.scene.visualDurationMs || (steps ? WALKTHROUGH_MS : 9500);
        const delta = Math.min(now - previousTime, 100) / Math.max(duration, 1);
        // Leave the conclusion visible until the student explicitly replays.
        setProgress((value) => guided ? Math.min(guided.scene.progressEnd, value + delta * (guided.scene.progressEnd - guided.scene.progressStart)) : steps ? Math.min(1, value + delta) : (value + delta) % 1);
      }
      previousTime = now;
      frame = window.requestAnimationFrame(animate);
    }
    const resetClock = () => { previousTime = 0; };
    document.addEventListener("visibilitychange", resetClock);
    frame = window.requestAnimationFrame(animate);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", resetClock); };
  }, [playing, Boolean(steps), guided?.scene.id, guided?.scene.progressStart, guided?.scene.progressEnd, guided?.scene.visualDurationMs]);

  useEffect(() => { if ((guided && progress >= guided.scene.progressEnd) || (!guided && steps && progress >= 1)) setPlaying(false); }, [progress, steps, guided?.scene.progressEnd]);

  useEffect(() => {
    const onFullscreen = () => setExpanded(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch {
      setExpanded((value) => !value);
    }
  }

  return (
    <div
      className={`scene ${expanded ? "scene-expanded" : ""}`}
      ref={containerRef}
      data-testid="lesson-scene"
      data-scene={mode}
      data-chapter={steps ? chapter : undefined}
      data-guided-cue={guided?.scene.visualCue}
      data-guided-targets={guided?.scene.highlightTargets.join(" ")}
    >
      <div className="scene-topline">
        <span className="scene-name">
          <span className="live-dot" />
          {SCENE_NAMES[diagramMode]}
          {!guided && diagramMode !== mode && <small> · apex focus</small>}
        </span>
        <div className="scene-options">
        {diagramMode === "trajectories" && <label className="comparison-toggle"><input type="checkbox" checked={compare} onChange={(e) => { onInteract?.(); setCompare(e.target.checked); }} />Compare angles</label>}
        <span className="scene-unit">
          v₀ {parameters.speed} m/s <span>·</span> g {parameters.gravity} m/s²
        </span>
        </div>
      </div>
      {steps && !guided && <nav className="visual-chapters" aria-label="Visual walkthrough chapters">{CHAPTERS.map((name, index) => <button key={name} aria-label={`Visual chapter ${index + 1}: ${name}`} aria-current={chapter === index ? "step" : undefined} onClick={() => { onInteract?.(); setProgress(CHAPTER_STARTS[index]); setPlaying(false); }}><span>{index + 1}</span>{name}</button>)}</nav>}
      <div className="scene-canvas">
        {diagramMode === "trajectories" && (
          <Trajectories
            parameters={parameters}
            progress={motion}
            stage={steps ? chapter : stage}
            compact={compact}
            compare={compare}
            comparisonAngles={comparisonAngles}
            markerId={`${markerId}-velocity`}
          />
        )}
        {diagramMode === "components" && (
          <Components
            parameters={parameters}
            markerId={markerId}
            compact={compact}
            progress={motion}
          />
        )}
        {diagramMode === "range_comparison" && (
          <RangeComparison parameters={parameters} progress={motion} compact={compact} />
        )}
      </div>
      <div className="scene-legend">
        {diagramMode === "components" ? (
          <>
            <span>
              <i style={{ background: "#e17b64" }} />
              Projectile
            </span>
            <span>
              <i style={{ background: "#287d70" }} />
              Horizontal
            </span>
            <span>
              <i style={{ background: "#365fc6" }} />
              Vertical · changing
            </span>
          </>
        ) : (
          <>
            {(mode === "trajectories" && !compare ? [parameters.angle] : comparisonAngles || [30, 45, 60]).map((angle) => (
              <span key={angle}>
                <i style={{ background: (COLORS[angle] || SELECTED_COLOR) }} />
                {angle}° {angle === 45 && <small>max range</small>}
              </span>
            ))}
            {(compare || mode !== "trajectories") && ![30, 45, 60].includes(parameters.angle) && (
              <span>
                <i style={{ background: SELECTED_COLOR }} />
                {parameters.angle}° selected
              </span>
            )}
          </>
        )}
      </div>
      {steps && !guided && <>
        <div className="visual-reasoning" data-testid="visual-reasoning">
          <span className="small-label">VISUAL STEP {chapter + 1} / 6</span><h3>{teaching.title}</h3><p>{teaching.text}</p><p className="visual-evidence"><strong>Look for:</strong> {teaching.evidence}</p>
          <Equation equationKey={teaching.key} />
        </div>
        {mode === "trajectories" && compare && <div className="angle-evidence" aria-label="Equal-speed angle comparison">{[30, 45, 60].map(angle => { const m = calculate(parameters, angle); return <div key={angle} data-testid={`angle-evidence-${angle}`}><strong style={{ color: COLORS[angle] }}>{angle}° {angle === 45 && <small>maximum range</small>}</strong><span>vₓ {m.horizontal_velocity.toFixed(2)} m/s</span><span>Flight {m.flight_time.toFixed(2)} s</span><b>Range {m.range.toFixed(2)} m</b></div>; })}</div>}
      </>}
      {guidedControls}
      {!guided && <div className="playback">
        <button
          className="play-button"
          aria-label={playing ? "Pause animation" : "Play animation"}
          onClick={() => { onInteract?.(); if (!playing && progress >= 1) setProgress(0); setPlaying((value) => !value); }}
        >
          {playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
        </button>
        <button
          className="scene-icon-button"
          aria-label="Replay animation"
          onClick={() => {
            onInteract?.();
            setProgress(0);
            setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
          }}
        >
          <RotateCcw size={16} />
        </button>
        <label className="timeline">
          <span className="sr-only">Animation timeline</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            aria-valuetext={steps ? `Visual step ${chapter + 1}: ${CHAPTERS[chapter]}, ${Math.round(progress * 100)} percent` : undefined}
            onChange={(event) => {
              onInteract?.();
              setProgress(Number(event.target.value));
              setPlaying(false);
            }}
          />
        </label>
        <span className="timecode">{Math.round(progress * 100)}%</span>
        <button
          className="scene-icon-button"
          aria-label={expanded ? "Exit expanded animation" : "Expand animation"}
          onClick={toggleFullscreen}
        >
          <Maximize2 size={16} />
        </button>
      </div>}
    </div>
  );
}
