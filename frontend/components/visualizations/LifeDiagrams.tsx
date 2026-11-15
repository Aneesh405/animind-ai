"use client";
import { useState } from "react";
import { organelles, waterParts } from "../../lib/visualizations";
export default function LifeDiagrams({
  kind,
}: {
  kind: "water_molecule" | "animal_cell";
}) {
  const [selected, setSelected] = useState("");
  const water = kind === "water_molecule";
  const parts: Record<string, string> = water ? waterParts : organelles;
  const select = (name: string) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-label": name,
    onClick: () => setSelected(name),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelected(name);
      }
    },
    style: { cursor: "pointer" },
  });
  // Hydrogen vectors are ±52.25° from the downward bisector: H–O–H = 104.5°.
  const dx = 130 * Math.sin((52.25 * Math.PI) / 180),
    dy = 130 * Math.cos((52.25 * Math.PI) / 180);
  return (
    <div>
      <svg
        viewBox="0 0 500 340"
        role="group"
        aria-label={
          water
            ? "H₂O: one oxygen and two hydrogen atoms"
            : "Simplified animal cell"
        }
        style={{ width: "100%", maxHeight: 380 }}
      >
        {water ? (
          <>
            {[
              [-1, "Bond 1"],
              [1, "Bond 2"],
            ].map(([sign, name]) => (
              <g key={name} {...select(String(name))}>
                <title>{name}</title>
                <line
                  x1="250"
                  y1="110"
                  x2={250 + Number(sign) * dx}
                  y2={110 + dy}
                  stroke="#71867a"
                  strokeWidth="18"
                />
              </g>
            ))}
            <g {...select("Oxygen")}>
              <circle cx="250" cy="110" r="38" fill="#b85f50" />
              <text x="250" y="115" textAnchor="middle" fill="white">
                O
              </text>
              <text x="250" y="55" textAnchor="middle">
                Oxygen
              </text>
            </g>
            {[-1, 1].map((sign, i) => (
              <g key={sign} {...select(`Hydrogen ${i + 1}`)}>
                <circle
                  cx={250 + sign * dx}
                  cy={110 + dy}
                  r="25"
                  fill="#dfe8ee"
                  stroke="#526f85"
                />
                <text x={250 + sign * dx} y={115 + dy} textAnchor="middle">
                  H
                </text>
                <text x={250 + sign * dx} y={160 + dy} textAnchor="middle">
                  Hydrogen {i + 1}
                </text>
              </g>
            ))}
            <text x="250" y="280" textAnchor="middle">
              H₂O · H–O–H ≈ 104.5°
            </text>
          </>
        ) : (
          <>
            <ellipse
              {...select("Cell membrane")}
              cx="250"
              cy="165"
              rx="222"
              ry="145"
              fill="#e2eee0"
              stroke="#4b8165"
              strokeWidth="12"
            />
            <ellipse
              {...select("Cytoplasm")}
              cx="250"
              cy="165"
              rx="210"
              ry="133"
              fill="#edf3e4"
            />
            <g {...select("Nucleus")}>
              <ellipse cx="240" cy="150" rx="65" ry="54" fill="#b9a8d2" />
              <text x="240" y="155" textAnchor="middle">
                Nucleus
              </text>
            </g>
            <g {...select("Mitochondria")}>
              <ellipse cx="365" cy="213" rx="44" ry="22" fill="#e9b481" />
              <path
                d="M 335 214 l 10 -12 l 10 23 l 10 -23 l 10 23 l 10 -12"
                fill="none"
                stroke="#975f36"
              />
              <text x="345" y="260" textAnchor="middle">
                Mitochondria
              </text>
            </g>
            <g {...select("Ribosomes")}>
              {[
                [120, 120],
                [140, 135],
                [110, 155],
                [155, 160],
                [330, 110],
                [345, 125],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#42626a" />
              ))}
              <text x="120" y="95" textAnchor="middle">
                Ribosomes
              </text>
            </g>
            <text x="230" y="260" pointerEvents="none">
              Cytoplasm
            </text>
            <text x="250" y="330" textAnchor="middle">
              Cell membrane (outer boundary)
            </text>
          </>
        )}
      </svg>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.keys(parts).map((name) => (
          <button
            key={name}
            aria-pressed={selected === name}
            onClick={() => setSelected(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <p role="status">
        {selected && parts[selected]
          ? `${selected}: ${parts[selected]}`
          : "Select a labeled structure or use the buttons to learn its function."}
      </p>
      <small>
        {water
          ? "Simplified ball-and-stick model; atom sizes and bond lengths are not to scale. Electron clouds and lone pairs are omitted."
          : "Simplified educational animal cell; not drawn to scale. Only selected structures are shown."}
      </small>
    </div>
  );
}
