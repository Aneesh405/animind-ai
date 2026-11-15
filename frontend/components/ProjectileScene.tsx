"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, RotateCcw } from "lucide-react";
import { SCENE_NAMES } from "../lib/physics";
import type { Parameters, SceneType } from "../lib/types";
import { COLORS, SELECTED_COLOR, Components, RangeComparison, Trajectories } from "./physics/SceneDiagrams";

interface SceneProps {
  mode: SceneType;
  parameters: Parameters;
  focusIndex: number | null;
  stepCount: number;
  onStageChange: (stage: number) => void;
  initialComparison?: boolean;
  autoplay?: boolean;
}

export default function ProjectileScene({
  mode,
  parameters,
  focusIndex,
  stepCount,
  onStageChange,
  initialComparison = true,
  autoplay = true,
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
  const stage = Math.min(stepCount - 1, Math.floor(progress * stepCount));

  useLayoutEffect(() => {
    setProgress(0);
    setPlaying(autoplay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [mode, autoplay]);

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
      setProgress(focusIndex / stepCount);
      setPlaying(false);
    }
  }, [focusIndex, stepCount]);

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
        const delta = (now - previousTime) / 9500;
        setProgress((value) => (value + delta) % 1);
      }
      previousTime = now;
      frame = window.requestAnimationFrame(animate);
    }
    const resetClock = () => { previousTime = 0; };
    document.addEventListener("visibilitychange", resetClock);
    frame = window.requestAnimationFrame(animate);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", resetClock); };
  }, [playing]);

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
    >
      <div className="scene-topline">
        <span className="scene-name">
          <span className="live-dot" />
          {SCENE_NAMES[mode]}
        </span>
        <div className="scene-options">
        {mode === "trajectories" && <label className="comparison-toggle"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />Compare angles</label>}
        <span className="scene-unit">
          v₀ {parameters.speed} m/s <span>·</span> g {parameters.gravity} m/s²
        </span>
        </div>
      </div>
      <div className="scene-canvas">
        {mode === "trajectories" && (
          <Trajectories
            parameters={parameters}
            progress={progress}
            stage={stage}
            compact={compact}
            compare={compare}
            markerId={`${markerId}-velocity`}
          />
        )}
        {mode === "components" && (
          <Components
            parameters={parameters}
            markerId={markerId}
            compact={compact}
            progress={progress}
          />
        )}
        {mode === "range_comparison" && (
          <RangeComparison parameters={parameters} progress={progress} compact={compact} />
        )}
      </div>
      <div className="scene-legend">
        {mode === "components" ? (
          <>
            <span>
              <i style={{ background: "#e17b64" }} />
              Launch velocity
            </span>
            <span>
              <i style={{ background: "#287d70" }} />
              Horizontal
            </span>
            <span>
              <i style={{ background: "#365fc6" }} />
              Initial vertical
            </span>
          </>
        ) : (
          <>
            {(mode === "trajectories" && !compare ? [parameters.angle] : [30, 45, 60]).map((angle) => (
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
      <div className="playback">
        <button
          className="play-button"
          aria-label={playing ? "Pause animation" : "Play animation"}
          onClick={() => setPlaying((value) => !value)}
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
            setProgress(0);
            setPlaying(true);
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
            onChange={(event) => {
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
      </div>
    </div>
  );
}
