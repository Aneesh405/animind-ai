"use client";
import { quadratic, linearValue } from "../../lib/visualizations";
export default function FunctionGraph({
  kind,
  values,
  onChange,
}: {
  kind: "linear_function" | "quadratic_function";
  values: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const isQuad = kind === "quadratic_function";
  const { a = 1, b = 0, c = 0, m = 1 } = values;
  const model = quadratic(a, b, c);
  const project = (x: number, y: number) => `${250 + x * 20},${250 - y * 20}`;
  const points = Array.from({ length: 501 }, (_, i) => {
    const x = -12.5 + i / 20;
    return project(x, isQuad ? a * x * x + b * x + c : linearValue(m, b, x));
  }).join(" ");
  return (
    <div>
      <h3>{isQuad ? `y = ${a}x² + ${b}x + ${c}` : `y = ${m}x + ${b}`}</h3>
      <svg
        viewBox="0 0 500 500"
        role="img"
        aria-label={
          isQuad ? "Quadratic coordinate graph" : "Linear coordinate graph"
        }
        style={{ width: "100%", maxHeight: 420, background: "#fff" }}
      >
        <defs>
          <clipPath id="graph-clip">
            <rect width="500" height="500" />
          </clipPath>
        </defs>
        {Array.from({ length: 25 }, (_, i) => i - 12).map((n) => (
          <g key={n} stroke={n === 0 ? "#35463e" : "#e4e8e2"}>
            <path d={`M ${250 + n * 20} 0 V 500 M 0 ${250 + n * 20} H 500`} />
            {n % 4 === 0 && (
              <text
                x={250 + n * 20 + 3}
                y={265}
                fill="#35463e"
                stroke="none"
                fontSize="11"
              >
                {n}
              </text>
            )}
          </g>
        ))}
        <text x="480" y="240">
          x
        </text>
        <text x="260" y="15">
          y
        </text>
        <g clipPath="url(#graph-clip)">
          <polyline
            points={points}
            fill="none"
            stroke="#24866b"
            strokeWidth="3"
          />
          {isQuad && model.vertex && (
            <>
              <path
                d={`M ${250 + model.vertex[0] * 20} 0 V 500`}
                stroke="#a56c39"
                strokeDasharray="5 5"
              />
              <circle
                cx={250 + model.vertex[0] * 20}
                cy={250 - model.vertex[1] * 20}
                r="5"
                fill="#a56c39"
              />
            </>
          )}
          <circle
            cx="250"
            cy={250 - (isQuad ? c : b) * 20}
            r="5"
            fill="#704ab0"
          />
        </g>
      </svg>
      {(isQuad ? ["a", "b", "c"] : ["m", "b"]).map((key) => (
        <label key={key} style={{ display: "block", padding: 8 }}>
          {key}: {values[key]}{" "}
          <input
            aria-label={key}
            type="range"
            min={key === "a" ? -5 : -10}
            max={key === "a" ? 5 : 10}
            step="any"
            value={values[key]}
            onChange={(e) =>
              onChange({ ...values, [key]: Number(e.target.value) })
            }
          />
        </label>
      ))}
      <p aria-live="polite">
        {isQuad
          ? `${model.kind}. Vertex: ${model.vertex?.map((v) => v.toFixed(2)).join(", ") ?? "none"}. Axis of symmetry: ${model.vertex ? `x = ${model.vertex[0].toFixed(2)}` : "none"}. Real x-intercepts: ${model.kind === "All real x are zeros" ? "all real x" : model.roots.map((v) => v.toFixed(2)).join(", ") || "none"}. y-intercept: ${c}.`
          : `Slope: ${m}. y-intercept: (0, ${b}).`}
      </p>
      <small>
        Graph window: −12.5 to 12.5 on both axes. Features outside the window
        are described above.
      </small>
    </div>
  );
}
