"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatSpeechText } from "./speechText";

export type SpeechState = "checking" | "unsupported" | "idle" | "speaking" | "paused" | "error";
export type SpeechRate = "slower" | "normal" | "faster";

const RATE_VALUES: Record<SpeechRate, number> = {
  slower: 0.78,
  normal: 0.93,
  faster: 1.12,
};

const RATE_STORAGE_KEY = "animind-voice-rate";
const VOICE_STORAGE_KEY = "animind-voice-uri";

function savedRate(): SpeechRate {
  try {
    const value = window.localStorage.getItem(RATE_STORAGE_KEY);
    if (value === "slower" || value === "faster" || value === "normal") return value;
  } catch {}
  return "normal";
}

export function useSpeechSynthesis(text: string, contentKey: string) {
  const [state, setState] = useState<SpeechState>("checking");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRateState] = useState<SpeechRate>("normal");
  const [voiceURI, setVoiceURIState] = useState("");
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const requestRef = useRef(0);
  const previousKeyRef = useRef(contentKey);

  const stop = useCallback(() => {
    requestRef.current += 1;
    utteranceRef.current = null;
    synthRef.current?.cancel();
    setState((current) => current === "unsupported" || current === "checking" ? current : "idle");
  }, []);

  useEffect(() => {
    const available =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.speechSynthesis?.speak === "function" &&
      typeof window.SpeechSynthesisUtterance === "function";
    if (!available) {
      setState("unsupported");
      return;
    }

    const synth = window.speechSynthesis;
    synthRef.current = synth;
    setRateState(savedRate());
    try {
      setVoiceURIState(window.localStorage.getItem(VOICE_STORAGE_KEY) || "");
    } catch {}

    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    synth.addEventListener?.("voiceschanged", loadVoices);
    setState("idle");

    return () => {
      requestRef.current += 1;
      utteranceRef.current = null;
      synth.cancel();
      synth.removeEventListener?.("voiceschanged", loadVoices);
      synthRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (previousKeyRef.current === contentKey) return;
    previousKeyRef.current = contentKey;
    stop();
  }, [contentKey, stop]);

  const selectedVoice = useMemo(() => {
    return voices.find((voice) => voice.voiceURI === voiceURI)
      || voices.find((voice) => voice.default && voice.lang.toLowerCase().startsWith("en"))
      || voices.find((voice) => voice.lang.toLowerCase().startsWith("en"))
      || voices[0]
      || null;
  }, [voiceURI, voices]);

  const replay = useCallback(() => {
    const synth = synthRef.current;
    const speech = formatSpeechText(text);
    if (!synth || !speech) return;

    const request = requestRef.current + 1;
    requestRef.current = request;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(speech);
    utterance.rate = RATE_VALUES[rate];
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => {
      if (requestRef.current === request) setState("speaking");
    };
    utterance.onpause = () => {
      if (requestRef.current === request) setState("paused");
    };
    utterance.onresume = () => {
      if (requestRef.current === request) setState("speaking");
    };
    utterance.onend = () => {
      if (requestRef.current === request) {
        utteranceRef.current = null;
        setState("idle");
      }
    };
    utterance.onerror = (event) => {
      if (requestRef.current !== request) return;
      utteranceRef.current = null;
      setState(event.error === "canceled" || event.error === "interrupted" ? "idle" : "error");
    };
    utteranceRef.current = utterance;
    setState("speaking");
    synth.speak(utterance);
  }, [rate, selectedVoice, text]);

  const pause = useCallback(() => {
    const synth = synthRef.current;
    if (!synth || state !== "speaking") return;
    synth.pause();
    setState("paused");
  }, [state]);

  const resume = useCallback(() => {
    const synth = synthRef.current;
    if (!synth || state !== "paused") return;
    synth.resume();
    setState("speaking");
  }, [state]);

  const setRate = useCallback((next: SpeechRate) => {
    stop();
    setRateState(next);
    try { window.localStorage.setItem(RATE_STORAGE_KEY, next); } catch {}
  }, [stop]);

  const setVoiceURI = useCallback((next: string) => {
    stop();
    setVoiceURIState(next);
    try { window.localStorage.setItem(VOICE_STORAGE_KEY, next); } catch {}
  }, [stop]);

  return {
    state,
    supported: state !== "checking" && state !== "unsupported",
    voices,
    selectedVoice,
    rate,
    voiceURI,
    replay,
    pause,
    resume,
    stop,
    setRate,
    setVoiceURI,
  };
}
