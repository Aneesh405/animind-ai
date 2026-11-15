"use client";

import { useState } from "react";
import { ArrowRight, Repeat2 } from "lucide-react";
import Link from "next/link";
import ProjectileScene from "../ProjectileScene";
import { DEFAULT_PARAMETERS } from "../../lib/physics";
import type { SceneType } from "../../lib/types";

const ignoreStage = () => {};

export default function PerspectivePreview() {
  const [scene, setScene] = useState<SceneType>("trajectories");
  return <div className="perspective-preview">
    <div className="preview-quote"><span className="small-label">A FAMILIAR MOMENT OF CONFUSION</span><p>“Why doesn&apos;t 60° travel farther if it stays in the air longer?”</p></div>
    <div className="preview-controls" aria-label="Teaching preview strategy"><button aria-pressed={scene === "trajectories"} onClick={() => setScene("trajectories")}>The path</button><ArrowRight size={13} /><button aria-pressed={scene === "components"} onClick={() => setScene("components")}>The components</button><span>Interactive preview · no AI request</span></div>
    <ProjectileScene mode={scene} parameters={{ ...DEFAULT_PARAMETERS, angle: 60 }} focusIndex={null} stepCount={3} onStageChange={ignoreStage} autoplay={false} />
    <div className="perspective-insight"><Repeat2 size={18} /><p>{scene === "trajectories" ? "The path shows what happens. Another perspective can show you why." : "A steeper launch gives more upward speed, but less sideways speed. Range needs both speed and airtime."}</p><Link href="/studio">Find your perspective<ArrowRight size={14} /></Link></div>
  </div>;
}
