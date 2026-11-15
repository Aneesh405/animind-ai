"use client";

import { useRef } from "react";
import { ArrowUpRight, BookOpen, ChevronDown, FileText, Plus, Upload } from "lucide-react";
import Brand from "../Brand";
import type { StudioState } from "../../lib/useLearningStudio";
import type { Mode } from "../../lib/types";

export default function StudioNavigation({ studio: s }: { studio: StudioState }) {
  const notebook = useRef<HTMLDetailsElement>(null);
  const close = () => { if (notebook.current) notebook.current.open = false; };
  return (
    <header className="studio-topbar">
      <Brand />
      <span className="studio-location"><span />The Curiosity Lab <span className="location-divider">/</span> <strong>Physics 01</strong></span>
      <nav className="studio-navigation" aria-label="Learning navigation">
        <span className={`engine-status ${s.health ? "online" : ""}`}><i />{s.health ? "Engine connected" : "Connecting"}</span>
        <label className="mode-selector">
          <span className="sr-only">Lesson generation mode</span>
          <select value={s.mode} onChange={(e) => s.setMode(e.target.value as Mode)} disabled={Boolean(s.busy)}>
            <option value="demo">Demo mode</option>
            <option value="gemini">Gemini mode</option>
          </select>
        </label>
        <details className="notebook-menu" ref={notebook} onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
          <summary aria-label="Notebook"><BookOpen size={16} /><span>Notebook</span><ChevronDown size={13} /></summary>
          <div className="notebook-content">
            <p className="eyebrow">YOUR NOTEBOOK</p>
            <button className="notebook-upload" disabled={Boolean(s.busy) || !s.sessionId} onClick={() => { close(); s.fileInput.current?.click(); }}><Upload size={16} />Upload lecture notes</button>
            <h2>Recent explorations</h2>
            {s.recent.length === 0 && <p>Your lessons will appear here.</p>}
            {s.recent.slice(0, 6).map((item) => (
              <button className={`recent-item ${item.id === s.lesson?.id ? "current" : ""}`} key={item.id} disabled={Boolean(s.busy)} onClick={() => { close(); void s.openLesson(item.id); }}>
                <FileText size={15} /><span>{item.title}<small>{item.mode === "demo" ? "Demo lesson" : "Gemini lesson"}</small></span><ArrowUpRight size={13} />
              </button>
            ))}
            <h2>Explore physics</h2>
            {s.topics.map((topic) => <button className="notebook-topic" key={topic.id} disabled={Boolean(s.busy)} onClick={() => { close(); s.setDocument(null); void s.generate(topic.example, undefined, false); }}>{topic.name}<ArrowUpRight size={13} /></button>)}
          </div>
        </details>
        <button className="new-lesson" disabled={Boolean(s.busy)} onClick={() => { close(); s.newLesson(); }}><Plus size={16} /><span>New lesson</span></button>
      </nav>
      <input ref={s.fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Upload PDF file" onChange={(e) => { const file = e.target.files?.[0]; if (file) void s.upload(file); e.target.value = ""; }} />
    </header>
  );
}
