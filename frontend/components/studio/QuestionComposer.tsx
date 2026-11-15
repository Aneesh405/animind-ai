"use client";

import { useState } from "react";
import { ArrowRight, CornerDownLeft, FileText, Paperclip, X } from "lucide-react";
import type { StudioState } from "../../lib/useLearningStudio";

export default function QuestionComposer({ studio: s }: { studio: StudioState }) {
  const [dragging, setDragging] = useState(false);
  return (
    <section className="composer-section" aria-label="Create a visual lesson">
      <form className={`question-composer ${dragging ? "dragging" : ""}`} onSubmit={(e) => { e.preventDefault(); void s.generate(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file && !s.busy && s.sessionId) void s.upload(file); }}>
        <label htmlFor="question" className="question-label">What would you like to understand?</label>
        <div className="question-input-row">
          <textarea ref={s.questionInput} id="question" rows={1} maxLength={1500} value={s.question} placeholder="Ask a question you'd love to understand…" onChange={(e) => s.setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!s.busy) void s.generate(); } }} />
          <button className="upload-button" type="button" title="Upload a text-based PDF, up to 10 MB" aria-label="Upload lecture notes" onClick={() => s.fileInput.current?.click()} disabled={Boolean(s.busy) || !s.sessionId}><Paperclip size={18} /><span>Add notes</span></button>
          <button className="primary-button generate-button" type="submit" disabled={Boolean(s.busy) || s.question.trim().length < 3 || !s.sessionId}>Visualize<ArrowRight size={16} /></button>
        </div>
        <div className="composer-bottom"><span><i className={s.mode === "gemini" ? "mode-dot gemini" : "mode-dot"} />{s.mode === "demo" ? "Demo · predefined teaching, live physics" : "Gemini · live AI teaching planner"}</span><span className="keyboard-hint"><CornerDownLeft size={11} />Enter to explore · Shift + Enter for a new line</span></div>
        {dragging && <span className="drop-message">Drop your text-based PDF here</span>}
      </form>
      {!s.lesson && <div className="prompt-suggestions" aria-label="Example questions">
        {[
          "Why does 45° give the greatest range?",
          "How does gravity change a projectile's range?",
          "Why do a projectile's horizontal and vertical velocities behave differently?",
        ].map((question) => <button key={question} disabled={Boolean(s.busy)} onClick={() => { s.setQuestion(question); void s.generate(question); }}>{question}<ArrowRight size={13} /></button>)}
      </div>}
      {s.document && <section className="document-panel" aria-label="Uploaded lecture notes">
        <div className="document-heading"><FileText size={20} /><div><strong>{s.document.title}</strong><span>{s.document.page_count} {s.document.page_count === 1 ? "page" : "pages"} · {s.document.filename}</span></div><button className="icon-button" aria-label="Remove PDF from question" disabled={Boolean(s.busy)} onClick={() => s.setDocument(null)}><X size={16} /></button></div>
        {s.document.topics.length ? <><p>Choose a concept from your notes to build a lesson.</p><div className="topic-chips">{s.document.topics.map((topic) => <button key={topic.id} disabled={Boolean(s.busy)} onClick={() => void s.generate(topic.example, topic)}>{topic.name}<ArrowRight size={13} /></button>)}</div></> : <p>No supported projectile-motion concepts were found. Upload notes about projectile motion, launch angles, or velocity components.</p>}
        <details><summary>Document handling and source excerpts</summary><p>{s.document.notice}</p>{s.document.references.map((source, index) => <blockquote key={`${source.page}-${index}`}><strong>Page {source.page}</strong>{source.excerpt}</blockquote>)}</details>
      </section>}
    </section>
  );
}
