import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, CornerDownLeft, MoveUpRight, Play } from "lucide-react";
import Brand, { BrandMark } from "../Brand";
import Equation from "../Equation";
import HeroExperiment from "./HeroExperiment";
import PerspectivePreview from "./PerspectivePreview";
import SubjectDiscovery from "./SubjectDiscovery";

const explorations = [
  { number: "01", title: "The perfect launch", detail: "Projectile motion & the balance behind 45°", question: "Why does a projectile travel farthest at 45 degrees?", className: "launch" },
  { number: "02", title: "A change of gravity", detail: "Same launch. A different world.", question: "How does gravity change a projectile's range?", className: "gravity" },
  { number: "03", title: "One velocity, two directions", detail: "The sideways and the upward, made visible.", question: "How do horizontal and vertical velocity components affect a projectile?", className: "vectors" },
];

function ConceptSketch({ kind }: { kind: string }) {
  return <svg viewBox="0 0 84 58" fill="none" aria-hidden="true"><path d="M8 48H77" className="sketch-grid" />{kind === "vectors" ? <><path d="M18 45L65 12M18 45H65M18 45V12" className="sketch-primary" /><path d="M59 13L65 12L64 19M60 41L65 45L60 49M14 17L18 12L22 17" className="sketch-primary" /><circle cx="18" cy="45" r="3" className="sketch-dot" /></> : <><path d={kind === "gravity" ? "M9 47Q38 -15 75 47" : "M9 47Q43 -7 75 47"} className="sketch-primary" /><path d="M9 47Q28 13 47 47" className="sketch-secondary" /><circle cx={kind === "gravity" ? 48 : 58} cy={kind === "gravity" ? 19 : 26} r="3" className="sketch-dot" /></>}</svg>;
}

export default function LandingPage() {
  return <div className="landing-page">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="landing-nav"><Brand /><span className="nav-lab-note"><i />CURIOSITY LAB · PHYSICS OPEN</span><nav aria-label="Main navigation"><a href="#how-it-works">How It Works</a><a href="#subjects">Subjects</a><Link href="/studio" className="nav-start">Start Learning<ArrowUpRight size={15} /></Link></nav></header>
    <main id="main-content">
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <span className="eyebrow hero-kicker"><span />DON&apos;T JUST LEARN IT. SEE IT.</span>
          <h1 id="hero-heading">Big ideas.<br /><em>Made visible.</em></h1>
          <p>Ask the question. Play with the concept. Watch understanding click.</p>
          <form className="hero-question" action="/studio"><label htmlFor="hero-question">What have you always wanted to understand?</label><div><input id="hero-question" name="question" defaultValue="Why does a projectile travel farthest at 45 degrees?" /><button type="submit">Make it visible<ArrowRight size={17} /></button></div><small><CornerDownLeft size={12} />Press Enter to open a real visual lesson</small></form>
          <div className="hero-prompts" aria-label="Example questions"><span>TRY ONE</span>{explorations.slice(0, 2).map((item) => <Link key={item.number} href={`/studio?question=${encodeURIComponent(item.question)}`}>{item.title}<ArrowUpRight size={12} /></Link>)}</div>
          <div className="hero-actions"><Link href="/studio" className="primary-button">Start Exploring<ArrowRight size={17} /></Link><a href="#in-action" className="action-link"><span><Play size={11} fill="currentColor" /></span>See AniMind in Action</a></div>
        </div>
        <HeroExperiment />
      </section>

      <div className="landing-rule"><span>ASK → TOUCH → NOTICE → UNDERSTAND</span><span>THE CURIOSITY LAB <BrandMark /></span></div>

      <section className="story-section story-ask" id="how-it-works" aria-labelledby="ask-heading">
        <div className="story-copy"><span className="section-number">01 <span>/ A LITTLE CURIOSITY</span></span><h2 id="ask-heading">Ask a <em>question.</em></h2><p>Start with the thing you&apos;ve always wanted to understand.</p><p className="story-detail">A question from class. A confusing step in your notes. That one “why” that won&apos;t leave you alone. Give it a place to begin.</p><span className="quiet-note"><Check size={14} />Ask directly or bring a text-based PDF.</span></div>
        <div className="question-note"><div className="note-top"><span className="small-label">A PAGE FROM YOUR CURIOSITY</span><span>001</span></div><span className="note-rule" /><p>Why does a projectile travel farthest at <em>45°?</em></p><div className="note-equation"><Equation equationKey="range" /><span>Let&apos;s look at it together.</span></div><Link href={`/studio?question=${encodeURIComponent(explorations[0].question)}`}>Explore this question<ArrowRight size={16} /></Link></div>
      </section>

      <SubjectDiscovery />

      <section className="story-section story-explore" id="explore" aria-labelledby="explore-heading">
        <div className="story-copy"><span className="section-number">03 <span>/ MAKE IT TANGIBLE</span></span><h2 id="explore-heading">Move the slider.<br /><em>See the difference.</em></h2><p>Explanations become experiments when every control has meaning.</p><p className="story-detail">Change an angle. Lower gravity. Follow the moving point. The equations stay honest while the idea becomes yours.</p><span className="quiet-note"><MoveUpRight size={14} />Real equations. Room to experiment.</span></div>
        <div className="exploration-list"><div className="explore-list-heading"><span className="small-label">OPEN AN EXPLORATION</span><span>Physics / Vol. 01</span></div>{explorations.map((item) => <Link href={`/studio?question=${encodeURIComponent(item.question)}`} className="exploration-row" key={item.number}><ConceptSketch kind={item.className} /><div><span className="small-label">EXPLORATION {item.number}</span><h3>{item.title}</h3><p>{item.detail}</p></div><ArrowUpRight size={20} /></Link>)}<p className="scope-note">Ideal projectile motion. Equal heights. No air resistance.<br />A carefully defined world, with plenty to discover.</p></div>
      </section>

      <section className="perspective-section" id="in-action" aria-labelledby="different-heading">
        <div className="perspective-title"><div><span className="section-number">04 <span>/ THE MOMENT IT CLICKS</span></span><h2 id="different-heading">Find <em>another way.</em></h2></div><p>Still confused? AniMind changes the visual explanation, not just the words. Select a lesson step, tell us where you&apos;re stuck, and see the concept from a new angle.</p></div>
        <PerspectivePreview />
      </section>

      <section className="closing-section"><span className="eyebrow">THERE&apos;S AN AHA MOMENT WAITING FOR YOU.</span><h2>Understanding is a<br /><em>beautiful feeling.</em></h2><Link href="/studio" className="primary-button">Start Learning<ArrowRight size={17} /></Link><p>Your curiosity sets the direction.</p></section>
    </main>
    <footer className="landing-footer"><Brand /><p>Don&apos;t Just Learn It. See It.</p><span>Built with curiosity, for curious minds.</span><Link href="/studio">Enter the lab<ArrowUpRight size={13} /></Link></footer>
  </div>;
}
