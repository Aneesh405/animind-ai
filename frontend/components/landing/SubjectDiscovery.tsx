import Link from "next/link";
import { ArrowUpRight, LockKeyhole } from "lucide-react";

const subjects = [
  { key: "physics", number: "01", name: "Physics", line: "Motion you can touch.", detail: "Launch, pause, compare, and change the rules.", available: true, question: "Why does a projectile travel farthest at 45 degrees?" },
  { key: "mathematics", number: "02", name: "Mathematics", line: "Patterns with a pulse.", detail: "Explanation preview · visual lab coming later.", available: false },
  { key: "biology", number: "03", name: "Biology", line: "Life, layer by layer.", detail: "Explanation preview · visual lab coming later.", available: false },
  { key: "chemistry", number: "04", name: "Chemistry", line: "Small bonds. Big changes.", detail: "Explanation preview · visual lab coming later.", available: false },
  { key: "computing", number: "05", name: "Computer Science", line: "Ideas in motion.", detail: "Explanation preview · visual lab coming later.", available: false },
] as const;

function SubjectMotif({ kind }: { kind: string }) {
  return <svg viewBox="0 0 220 130" role="img" aria-label={`${kind} concept sketch`}>
    <path className="motif-grid" d="M10 105H210M28 118V12" />
    {kind === "physics" && <><path className="motif-primary" d="M28 104C65 15 150 9 199 104" /><path className="motif-secondary" d="M112 31V83M112 31L105 43M112 31L119 43" /><circle className="motif-dot" cx="112" cy="31" r="7" /></>}
    {kind === "mathematics" && <><path className="motif-primary" d="M28 86C63 86 68 26 105 26S151 101 204 49" /><circle className="motif-dot" cx="105" cy="26" r="6" /><path className="motif-secondary" d="M70 94V42M54 61H91" /></>}
    {kind === "biology" && <><path className="motif-primary" d="M65 31C95 4 158 16 175 54C194 98 137 119 87 101C42 85 35 54 65 31Z" /><path className="motif-secondary" d="M91 49C110 33 143 43 148 65C152 84 125 94 105 84C84 74 77 60 91 49Z" /><circle className="motif-dot" cx="122" cy="64" r="7" /></>}
    {kind === "chemistry" && <><path className="motif-primary" d="M63 70L101 42L143 64L181 38M101 42L106 91L143 64L171 98" />{[63,101,143,181,106,171].map((x, index) => <circle key={x} className={index === 2 ? "motif-dot" : "motif-node"} cx={x} cy={[70,42,64,38,91,98][index]} r={index === 2 ? 7 : 5} />)}</>}
    {kind === "computing" && <>{[42,72,102,132,162].map((x, index) => <rect key={x} className={index === 3 ? "motif-dot" : "motif-bar"} x={x} y={[72,48,84,28,61][index]} width="18" height={[33,57,21,77,44][index]} rx="3" />)}<path className="motif-secondary" d="M48 37L73 22L98 37" /></>}
  </svg>;
}

export default function SubjectDiscovery() {
  return <section className="subject-section" id="subjects" aria-labelledby="subjects-heading">
    <header className="subject-heading"><div><span className="section-number">02 <span>/ CHOOSE YOUR CURIOSITY</span></span><h2 id="subjects-heading">Five doors.<br /><em>One open lab.</em></h2></div><p>Physics is interactive today. The other rooms show where Animind can grow—without pretending those visualizers are already built.</p></header>
    <div className="subject-grid">{subjects.map((subject) => {
      const content = <><div className="subject-card-top"><span>{subject.number}</span>{subject.available ? <span className="subject-status live"><i />LIVE LAB</span> : <span className="subject-status"><LockKeyhole size={11} />PREVIEW</span>}</div><SubjectMotif kind={subject.key} /><div className="subject-card-copy"><h3>{subject.name}</h3><strong>{subject.line}</strong><p>{subject.detail}</p></div>{subject.available && <span className="subject-action">Enter the lab<ArrowUpRight size={16} /></span>}</>;
      return subject.available
        ? <Link className={`subject-card ${subject.key}`} key={subject.key} href={`/studio?question=${encodeURIComponent(subject.question)}`}>{content}</Link>
        : <article className={`subject-card ${subject.key}`} key={subject.key}>{content}</article>;
    })}</div>
  </section>;
}
