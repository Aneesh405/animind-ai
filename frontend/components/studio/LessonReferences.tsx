import { ChevronRight, FileText, ShieldCheck } from "lucide-react";
import type { Lesson } from "../../lib/types";

export default function LessonReferences({ lesson }: { lesson: Lesson }) {
  return <div className="lesson-references">
    <details className="assumptions"><summary><ShieldCheck size={15} /><span>Verified equations. Clearly defined physics.</span><ChevronRight size={14} /></summary><div><p>{lesson.verification.method} {lesson.verification.scope}</p><ul>{lesson.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul><p>Angles: 0–90°. Initial speed: 1–100 m/s. Gravity: 0.1–50 m/s². A horizontal launch at ground level lands immediately in this model.</p></div></details>
    {lesson.sources.length > 0 && <details className="sources"><summary><FileText size={15} />Sources from your notes<ChevronRight size={14} /></summary><p>These excerpts are extracted from your PDF. The tutor explanation and simulation add ideal-physics teaching to the selected material.</p>{lesson.sources.map((source, index) => <blockquote key={`${source.filename}-${source.page}-${index}`}><strong>{source.filename} · page {source.page}</strong>{source.excerpt}</blockquote>)}</details>}
  </div>;
}
