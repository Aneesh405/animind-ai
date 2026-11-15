"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { calculate, DEFAULT_PARAMETERS } from "../../lib/physics";
import ProjectileScene from "../ProjectileScene";

const ignoreStage = () => {};

export default function HeroExperiment() {
  const [angle, setAngle] = useState(45);
  const parameters = { ...DEFAULT_PARAMETERS, angle };
  const metrics = calculate(parameters);
  return (
    <section className="hero-experiment" aria-label="Interactive projectile experiment">
      <div className="experiment-heading"><span className="eyebrow">LIVE EXHIBIT 01 / THE PERFECT LAUNCH</span><span><ArrowUpRight size={13} />Go on. Touch the physics.</span></div>
      <ProjectileScene mode="trajectories" parameters={parameters} focusIndex={null} stepCount={3} onStageChange={ignoreStage} initialComparison={false} />
      <div className="hero-variable"><label htmlFor="hero-angle"><span>Change the angle <span className="variable-symbol">θ</span></span><output>{angle}°</output></label><input id="hero-angle" aria-label="Explore launch angle" type="range" min="0" max="90" step="1" value={angle} onChange={(e) => setAngle(Number(e.target.value))} /><div className="hero-angle-options">{[30, 45, 60].map((value) => <button key={value} aria-pressed={angle === value} onClick={() => setAngle(value)}>{value}°</button>)}<span>Same speed. A different possibility.</span></div></div>
      <div className="hero-results" aria-live="polite"><div><span>Horizontal range</span><strong data-testid="hero-range">{metrics.range.toFixed(2)} <small>m</small></strong></div><div><span>Time in the air</span><strong>{metrics.flight_time.toFixed(2)} <small>s</small></strong></div><p><span>THE SMALL DISCOVERY</span>{angle === 45 ? "The sweet spot is a balance, not the most airtime." : angle === 30 || angle === 60 ? "30° and 60° travel equally far. Can you see why?" : "More height and more distance are different things."}</p></div>
      <p className="experiment-assumptions">Ideal motion · no air resistance · equal launch & landing heights</p>
    </section>
  );
}
