"use client";
import { useEffect, useState } from "react";
import { acceleration, pendulumPeriod } from "../../lib/visualizations";
export default function PhysicsModels({
  kind,
  values,
  onChange,
}: {
  kind: "simple_pendulum" | "newtons_second_law";
  values: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPlaying(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setTime(0);
  }, [values]);
  useEffect(() => {
    if (!playing || kind !== "simple_pendulum") return;
    let frame: number;
    let previous: number | undefined;
    function tick(now: number) {
      if (previous !== undefined) {
        const delta = Math.min((now - previous) / 1000, 0.1);
        setTime((t) => t + delta);
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, kind]);
  const pendulum = kind === "simple_pendulum";
  const period = pendulumPeriod(values.length ?? 1, values.gravity ?? 9.81);
  const theta =
    (((values.angle ?? 10) * Math.PI) / 180) *
    Math.cos((2 * Math.PI * time) / period);
  const length = 60 + (values.length ?? 1) * 30;
  const acc = acceleration(values.force ?? 6, values.mass ?? 2);
  const controls = pendulum
    ? [
        ["length", 0.2, 5, 0.1, "m"],
        ["angle", -15, 15, 1, "°"],
        ["gravity", 0.1, 25, 0.01, "m/s²"],
      ]
    : [
        ["mass", 0.1, 20, 0.1, "kg"],
        ["force", -20, 20, 0.5, "N"],
      ];
  return (
    <div>
      <svg
        viewBox="0 0 500 300"
        role="img"
        aria-label={
          pendulum
            ? "Animated simple pendulum"
            : "Net force and acceleration on a block"
        }
        style={{ width: "100%", maxHeight: 350 }}
      >
        {pendulum ? (
          <>
            <line
              x1="250"
              y1="30"
              x2={250 + length * Math.sin(theta)}
              y2={30 + length * Math.cos(theta)}
              stroke="#35463e"
              strokeWidth="4"
            />
            <circle
              cx={250 + length * Math.sin(theta)}
              cy={30 + length * Math.cos(theta)}
              r="18"
              fill="#24866b"
            />
            <circle cx="250" cy="30" r="6" />
          </>
        ) : (
          <>
            <path d="M 20 215 H 480" stroke="#35463e" />
            <rect
              x="210"
              y="140"
              width="80"
              height="75"
              rx="8"
              fill="#24866b"
            />
            <text x="250" y="182" textAnchor="middle" fill="white">
              {values.mass} kg
            </text>
            {values.force !== 0 && (
              <>
                <line
                  x1="250"
                  y1="100"
                  x2={250 + (values.force ?? 0) * 8}
                  y2="100"
                  stroke="#a56c39"
                  strokeWidth="4"
                />
                <path
                  d={`M ${250 + (values.force ?? 0) * 8 - Math.sign(values.force ?? 0) * 12} 92 L ${250 + (values.force ?? 0) * 8} 100 L ${250 + (values.force ?? 0) * 8 - Math.sign(values.force ?? 0) * 12} 108`}
                  fill="none"
                  stroke="#a56c39"
                  strokeWidth="3"
                />
              </>
            )}
            <text x="250" y="70" textAnchor="middle">
              Net force: {values.force} N
            </text>
          </>
        )}
      </svg>
      {controls.map(([key, min, max, step, unit]) => (
        <label key={String(key)} style={{ display: "block", padding: 8 }}>
          {key}: {values[key]} {unit}{" "}
          <input
            aria-label={String(key)}
            type="range"
            min={min}
            max={max}
            step="any"
            value={values[key]}
            onChange={(e) =>
              onChange({ ...values, [key]: Number(e.target.value) })
            }
          />
        </label>
      ))}
      <p aria-live="polite">
        {pendulum
          ? `Period T = ${period.toFixed(3)} s. Small-angle approximation (±15°), no damping.`
          : `a = F/m = ${acc.toFixed(3)} m/s². Acceleration: ${acc === 0 ? "zero" : acc > 0 ? "right" : "left"}. Net force only; friction is not modeled.`}
      </p>
      {pendulum && (
        <>
          <button onClick={() => setPlaying(!playing)}>
            {playing ? "Pause pendulum" : "Play pendulum"}
          </button>{" "}
          <button onClick={() => setTime(0)}>Reset pendulum</button>
        </>
      )}
    </div>
  );
}
