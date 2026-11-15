"use client";

import { Pause, Play, RotateCcw, Settings2, Square, Volume2 } from "lucide-react";
import { useSpeechSynthesis, type SpeechRate } from "../../lib/useSpeechSynthesis";

interface VoiceTutorControlsProps {
  text: string;
  contentKey: string;
  stepLabel: string;
}

const RATE_OPTIONS: Array<{ value: SpeechRate; label: string }> = [
  { value: "slower", label: "Slower" },
  { value: "normal", label: "Normal" },
  { value: "faster", label: "Faster" },
];

export default function VoiceTutorControls({ text, contentKey, stepLabel }: VoiceTutorControlsProps) {
  const speech = useSpeechSynthesis(text, contentKey);
  const active = speech.state === "speaking" || speech.state === "paused";
  const status = speech.state === "checking"
    ? "Checking voice support."
    : speech.state === "unsupported"
      ? "Voice Tutor is unavailable in this browser. The written lesson remains available."
      : speech.state === "speaking"
        ? `Speaking ${stepLabel}.`
        : speech.state === "paused"
          ? `Narration paused on ${stepLabel}.`
          : speech.state === "error"
            ? "Narration could not continue. You can try replaying this step."
            : `Ready to narrate ${stepLabel}.`;

  return (
    <section className="voice-tutor" aria-label="Voice Tutor" data-testid="voice-tutor">
      <div className="voice-tutor-heading">
        <span><Volume2 size={15} aria-hidden="true" />Voice Tutor</span>
        <small>No autoplay</small>
      </div>

      <div className="voice-actions">
        {speech.state === "paused" ? (
          <button type="button" className="voice-primary" onClick={speech.resume}>
            <Play size={14} fill="currentColor" aria-hidden="true" />Resume
          </button>
        ) : speech.state === "speaking" ? (
          <button type="button" className="voice-primary" onClick={speech.pause}>
            <Pause size={14} fill="currentColor" aria-hidden="true" />Pause
          </button>
        ) : (
          <button type="button" className="voice-primary" onClick={speech.replay} disabled={!speech.supported || !text.trim()}>
            <Volume2 size={14} aria-hidden="true" />Listen
          </button>
        )}
        <button type="button" className="voice-secondary" onClick={speech.replay} disabled={!speech.supported || !text.trim()}>
          <RotateCcw size={14} aria-hidden="true" />Replay
        </button>
        <button type="button" className="voice-secondary" onClick={speech.stop} disabled={!active}>
          <Square size={12} fill="currentColor" aria-hidden="true" />Stop
        </button>
      </div>

      <p className={`voice-status ${speech.state === "error" ? "error" : ""}`} role="status" aria-live="polite">
        <span aria-hidden="true" className={speech.state === "speaking" ? "voice-pulse" : ""} />
        {status}
      </p>

      {speech.supported && (
        <details className="voice-settings">
          <summary><Settings2 size={13} aria-hidden="true" />Voice settings</summary>
          <div>
            <label>
              Speaking speed
              <select value={speech.rate} onChange={(event) => speech.setRate(event.target.value as SpeechRate)}>
                {RATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              Browser voice
              <select value={speech.selectedVoice?.voiceURI || ""} onChange={(event) => speech.setVoiceURI(event.target.value)} disabled={speech.voices.length === 0}>
                {speech.voices.length === 0
                  ? <option value="">Browser default</option>
                  : speech.voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang}){voice.default ? " - default" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <small>Changing a setting stops the current narration. Available voices depend on this device.</small>
          </div>
        </details>
      )}
    </section>
  );
}
