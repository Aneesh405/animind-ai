"use client";
import { useEffect, useMemo, useState } from "react";
import { bubbleSteps } from "../../lib/visualizations";
export default function BubbleSort({ initial }: { initial: number[] }) {
  const [input, setInput] = useState(initial.join(", ")),
    [array, setArray] = useState(initial),
    [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const steps = useMemo(() => bubbleSteps(array), [array]);
  const step = steps[index];
  // Stable IDs preserve item identity so swaps animate between actual positions.
  const ids = useMemo(() => {
    let order = array.map((_, i) => i);
    return steps.map((s, i) => {
      if (s.kind === "swap" && i > 0) {
        const [a, b] = s.pair;
        order = [...order];
        [order[a], order[b]] = [order[b], order[a]];
      }
      return [...order];
    });
  }, [array, steps]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setIndex((i) => Math.min(i + 1, steps.length - 1)),
      800,
    );
    return () => clearInterval(timer);
  }, [playing, steps.length]);
  useEffect(() => {
    if (index === steps.length - 1) setPlaying(false);
  }, [index, steps.length]);
  function reset() {
    setIndex(0);
    setPlaying(false);
  }
  function apply() {
    const parts = input.split(",").map((x) => x.trim());
    const parsed = parts.map(Number);
    if (
      parts.some((x) => !x) ||
      parsed.length < 2 ||
      parsed.length > 12 ||
      parsed.some((v) => !Number.isInteger(v) || Math.abs(v) > 99)
    ) {
      setError("Enter 2–12 comma-separated integers from −99 to 99.");
      return;
    }
    setError("");
    setArray(parsed);
    reset();
  }
  return (
    <div>
      <label>
        Array{" "}
        <input
          aria-label="Array"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </label>{" "}
      <button onClick={apply}>Use array</button>
      {error && <p role="alert">{error}</p>}
      <div
        role="img"
        aria-label={`Array: ${step.values.join(", ")}. ${step.kind}`}
        style={{ position: "relative", height: 220, marginTop: 20 }}
      >
        {array.map((value, id) => {
          const position = ids[index].indexOf(id);
          return (
            <div
              key={id}
              style={{
                position: "absolute",
                left: `${(position * 100) / array.length}%`,
                width: `${85 / array.length}%`,
                bottom: 0,
                height: 50 + Math.abs(value) * 1.2,
                background: step.pair.includes(position)
                  ? step.kind === "swap"
                    ? "#b7773b"
                    : "#785c9c"
                  : "#24866b",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "left 450ms ease, background 200ms",
                borderRadius: 6,
              }}
            >
              {value}
            </div>
          );
        })}
      </div>
      <p aria-live="polite">
        Step {index + 1}/{steps.length}: {step.text}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          disabled={index === 0}
          onClick={() => {
            setPlaying(false);
            setIndex(index - 1);
          }}
        >
          Previous
        </button>
        <button
          disabled={index === steps.length - 1}
          onClick={() => {
            setPlaying(false);
            setIndex(index + 1);
          }}
        >
          Next
        </button>
        <button
          disabled={index === steps.length - 1}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button onClick={reset}>Reset</button>
      </div>
      <p>
        {step.kind === "done"
          ? "Sorting complete"
          : "Highlighted bars are the adjacent pair being compared or swapped."}
      </p>
    </div>
  );
}
