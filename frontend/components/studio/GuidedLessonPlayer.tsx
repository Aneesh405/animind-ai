"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Captions, ChevronLeft, ChevronRight, Compass, Pause, Play, RotateCcw, Settings2, Square, Volume2, VolumeX } from "lucide-react";
import { buildGuidedLesson } from "../../lib/guidedLessons";
import type { Lesson, Parameters } from "../../lib/types";
import { useSpeechSynthesis, type SpeechRate } from "../../lib/useSpeechSynthesis";
import ProjectileScene from "../ProjectileScene";

type GuidedPlayerState = "idle" | "playing" | "paused" | "completed" | "error";
type LearningMode = "guided" | "explore";

interface GuidedLessonPlayerProps {
  lesson: Lesson;
  parameters: Parameters;
  focusIndex: number | null;
  focusVersion: number;
  onStageChange: (stage: number) => void;
  onExplore: () => void;
}

const RATE_OPTIONS: Array<{ value: SpeechRate; label: string }> = [
  { value: "slower", label: "Slower" },
  { value: "normal", label: "Normal" },
  { value: "faster", label: "Faster" },
];

export default function GuidedLessonPlayer({ lesson, parameters, focusIndex, focusVersion, onStageChange, onExplore }: GuidedLessonPlayerProps) {
  const definition = useMemo(() => buildGuidedLesson(lesson, parameters), [lesson, parameters]);
  const scenes = definition?.scenes ?? [];
  const [mode, setMode] = useState<LearningMode>("explore");
  const [playerState, setPlayerState] = useState<GuidedPlayerState>("idle");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneRun, setSceneRun] = useState(0);
  const [speechRequest, setSpeechRequest] = useState(0);
  const [captions, setCaptions] = useState(true);
  const [narration, setNarration] = useState(true);
  const sceneIndexRef = useRef(0);
  const narrationRef = useRef(true);
  const previousParameters = useRef(JSON.stringify(parameters));
  const activeScene = scenes[Math.min(sceneIndex, Math.max(0, scenes.length - 1))];
  sceneIndexRef.current = sceneIndex;
  narrationRef.current = narration;

  const finishOrAdvance = useCallback(() => {
    const current = sceneIndexRef.current;
    if (current >= scenes.length - 1) {
      setPlayerState("completed");
      return;
    }
    setSceneIndex(current + 1);
    setSceneRun((value) => value + 1);
    setPlayerState("playing");
    if (narrationRef.current) setSpeechRequest((value) => value + 1);
  }, [scenes.length]);

  const speech = useSpeechSynthesis(
    activeScene?.narration ?? "",
    `${lesson.id}:${lesson.revision}:${activeScene?.id ?? "none"}`,
    {
      onEnd: finishOrAdvance,
      onError: () => setPlayerState("error"),
    },
  );
  const replaySpeechRef = useRef(speech.replay);
  replaySpeechRef.current = speech.replay;

  useEffect(() => {
    if (!speechRequest || playerState !== "playing" || !narration || !speech.supported) return;
    replaySpeechRef.current();
  }, [speechRequest, speech.supported]);

  useEffect(() => {
    const serialized = JSON.stringify(parameters);
    if (previousParameters.current === serialized) return;
    previousParameters.current = serialized;
    speech.stop();
    setMode("explore");
    setPlayerState("idle");
    onExplore();
  }, [parameters, onExplore, speech.stop]);

  function requestScene(index: number) {
    speech.stop();
    const next = Math.max(0, Math.min(scenes.length - 1, index));
    setMode("guided");
    setSceneIndex(next);
    setSceneRun((value) => value + 1);
    setPlayerState("playing");
    if (narration) setSpeechRequest((value) => value + 1);
  }

  function start() {
    requestScene(playerState === "completed" ? 0 : sceneIndex);
  }

  function pause() {
    if (speech.state === "speaking") speech.pause();
    setPlayerState("paused");
  }

  function resume() {
    setPlayerState("playing");
    if (!narration) return;
    if (speech.state === "paused") speech.resume();
    else setSpeechRequest((value) => value + 1);
  }

  function stop() {
    speech.stop();
    setPlayerState("idle");
  }

  function enterExploreMode() {
    stop();
    setMode("explore");
    onExplore();
  }

  function toggleNarration() {
    const next = !narration;
    setNarration(next);
    narrationRef.current = next;
    if (!next) speech.stop();
    else if (playerState === "playing") setSpeechRequest((value) => value + 1);
  }

  if (!definition || !activeScene) {
    return <div className="guided-fallback" role="status">This topic has a written lesson, but no synchronized visual guide yet.</div>;
  }

  const status = playerState === "completed"
    ? "Guided lesson complete. Try the understanding check next."
    : playerState === "error"
      ? "Narration stopped unexpectedly. The captions and visual remain available."
      : !speech.supported
        ? "Narration is unavailable in this browser. Use Next scene with the written captions."
        : !narration
          ? "Narration is off. Use Next scene when you are ready."
          : playerState === "playing"
            ? `Teaching scene ${sceneIndex + 1}: ${activeScene.title}.`
            : playerState === "paused"
              ? `Paused on scene ${sceneIndex + 1}: ${activeScene.title}.`
              : "Ready for one synchronized visual lesson.";

  const controls = (
    <section className="guided-controls" aria-label="Guided audiovisual lesson controls" data-testid="guided-player">
      <div className="guided-heading">
        <div><span className={playerState === "playing" ? "guided-speaking" : ""}><Compass size={15} aria-hidden="true" /></span><span><small>GUIDED LESSON</small><strong>{activeScene.title}</strong></span></div>
        <span>{sceneIndex + 1} / {scenes.length}</span>
      </div>
      {captions && <p className="guided-caption" data-testid="guided-caption">{activeScene.caption}</p>}
      <div className="guided-actions">
        {playerState === "playing" ? (
          <button type="button" className="guided-primary" onClick={pause}><Pause size={14} fill="currentColor" />Pause</button>
        ) : playerState === "paused" ? (
          <button type="button" className="guided-primary" onClick={resume}><Play size={14} fill="currentColor" />Resume</button>
        ) : (
          <button type="button" className="guided-primary" onClick={start}><Play size={14} fill="currentColor" />{playerState === "completed" ? "Teach again" : "Teach me"}</button>
        )}
        <button type="button" onClick={() => requestScene(sceneIndex - 1)} disabled={sceneIndex === 0}><ChevronLeft size={15} />Previous</button>
        <button type="button" onClick={() => requestScene(sceneIndex + 1)} disabled={sceneIndex === scenes.length - 1}>Next<ChevronRight size={15} /></button>
        <button type="button" onClick={() => requestScene(sceneIndex)}><RotateCcw size={14} />Replay scene</button>
        <button type="button" onClick={stop} disabled={playerState === "idle" || playerState === "completed"}><Square size={11} fill="currentColor" />Stop</button>
      </div>
      <div className="guided-secondary-actions">
        <button type="button" aria-pressed={captions} onClick={() => setCaptions((value) => !value)}><Captions size={14} />Captions {captions ? "on" : "off"}</button>
        <button type="button" aria-pressed={narration} onClick={toggleNarration} disabled={!speech.supported}>{narration ? <Volume2 size={14} /> : <VolumeX size={14} />}Narration {narration ? "on" : "off"}</button>
        <button type="button" className={mode === "explore" ? "active" : ""} onClick={enterExploreMode}>Explore freely</button>
      </div>
      <p className={`guided-status ${playerState === "error" ? "error" : ""}`} role="status" aria-live="polite">{status}</p>
      {speech.supported && <details className="guided-settings"><summary><Settings2 size={13} />Voice settings</summary><div>
        <label>Speaking speed<select value={speech.rate} onChange={(event) => { speech.setRate(event.target.value as SpeechRate); if (playerState === "playing") setPlayerState("paused"); }}>{RATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Browser voice<select value={speech.selectedVoice?.voiceURI || ""} onChange={(event) => { speech.setVoiceURI(event.target.value); if (playerState === "playing") setPlayerState("paused"); }} disabled={speech.voices.length === 0}>{speech.voices.length === 0 ? <option value="">Browser default</option> : speech.voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang}){voice.default ? " - default" : ""}</option>)}</select></label>
      </div></details>}
    </section>
  );

  return <ProjectileScene
    mode={lesson.scene}
    parameters={parameters}
    focusIndex={mode === "explore" ? focusIndex : null}
    focusVersion={focusVersion}
    steps={lesson.steps}
    stepCount={lesson.steps.length}
    onStageChange={onStageChange}
    onInteract={enterExploreMode}
    autoplay={mode === "explore"}
    guided={mode === "guided" ? { scene: activeScene, playing: playerState === "playing", run: sceneRun } : undefined}
    guidedControls={controls}
  />;
}
