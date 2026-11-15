"use client";

import { ArrowRight, MoveUpRight, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { StudioState } from "../../lib/useLearningStudio";

export function CalculatedResults({ studio: s }: { studio: StudioState }) {
  return <div className="metrics-strip" aria-label="Calculated results" aria-live="polite">
      {[
        ["Horizontal range", s.metrics.range, "m", "metric-range"],
        ["Maximum height", s.metrics.max_height, "m", "metric-height"],
        ["Flight time", s.metrics.flight_time, "s", "metric-time"],
        ["Horizontal speed", s.metrics.horizontal_velocity, "m/s", "metric-speed"],
      ].map(([label, value, unit, id]) => <div key={String(id)}><span>{label}</span><strong data-testid={String(id)}>{Number(value).toFixed(2)}<small>{unit}</small></strong></div>)}
    </div>;
}

export default function VariableControls({ studio: s }: { studio: StudioState }) {
  return <>
    <section className="parameter-panel" aria-labelledby="variables-heading">
      <div className="section-title"><h2 id="variables-heading"><SlidersHorizontal size={15} />Change a little. Notice a lot.</h2>{s.isPreview && s.error ? <button className="text-button" disabled={Boolean(s.busy)} onClick={() => void s.perform("Saving your changes", async () => { await s.saveParameters(); })}>Retry saving<RotateCcw size={12} /></button> : <span className="subtle-status">{s.isPreview ? "Saving changes…" : "Changes save automatically"}</span>}</div>
      <div className="parameter-grid">
        {([
          { key: "angle", label: "Launch angle", symbol: "θ", unit: "°", min: 0, max: 90 },
          { key: "speed", label: "Initial speed", symbol: "v₀", unit: "m/s", min: 1, max: 100 },
          { key: "gravity", label: "Gravity", symbol: "g", unit: "m/s²", min: .1, max: 50 },
        ] as const).map((control) => <label className="parameter" key={control.key}>
          <span className="parameter-label"><span><i>{control.symbol}</i>{control.label}</span><strong><output>{s.parameters[control.key]}</output><small>{control.unit}</small></strong></span>
          <input type="range" aria-label={control.label} min={control.min} max={control.max} step="any" value={s.parameters[control.key]} disabled={Boolean(s.busy)} onChange={(e) => s.updateParameter(control.key, Math.round(Number(e.target.value) * 100) / 100)} />
          <span className="range-bounds"><small>{control.min}{control.unit === "°" ? "°" : ""}</small><small>{control.max}{control.unit === "°" ? "°" : ""}</small></span>
        </label>)}
      </div>
      <div className="angle-presets"><span>Compare launch angles</span>{[30, 45, 60].map((angle) => <button key={angle} className={s.parameters.angle === angle ? "selected" : ""} aria-pressed={s.parameters.angle === angle} disabled={Boolean(s.busy)} onClick={() => s.updateParameter("angle", angle)}>{angle}°</button>)}<button className="reset-parameters" disabled={Boolean(s.busy)} onClick={s.resetParameters}><RotateCcw size={12} />Reset</button></div>
    </section>
    <section className="what-if-panel" aria-labelledby="what-if-heading">
      <div><span className="small-label"><MoveUpRight size={15} />A SMALL EXPERIMENT</span><h2 id="what-if-heading">What if we changed the rules?</h2></div>
      <form onSubmit={(e) => { e.preventDefault(); void s.explore(); }}><label className="sr-only" htmlFor="what-if">Ask a what-if question</label><input id="what-if" value={s.whatIf} maxLength={500} onChange={(e) => s.setWhatIf(e.target.value)} placeholder="What happens if gravity doubles?" /><button className="icon-button" type="submit" disabled={Boolean(s.busy) || s.whatIf.trim().length < 3} aria-label="Explore what-if question"><ArrowRight size={18} /></button></form>
      <div className="suggestion-chips"><button disabled={Boolean(s.busy)} onClick={() => void s.explore("What happens if gravity doubles?")}>Double gravity<ArrowRight size={12} /></button><button disabled={Boolean(s.busy)} onClick={() => void s.explore("What if launch speed doubles?")}>Double launch speed<ArrowRight size={12} /></button></div>
      {s.whatIfResult && <p className="what-if-result" role="status">{s.whatIfResult}</p>}
    </section>
  </>;
}
