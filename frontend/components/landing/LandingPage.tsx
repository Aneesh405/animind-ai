import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Check, MoveUpRight, Play } from "lucide-react";
import Brand, { BrandMark } from "../Brand";
import Equation from "../Equation";
import HeroExperiment from "./HeroExperiment";
import PerspectivePreview from "./PerspectivePreview";

const explorations = [
  { number: "01", title: "The perfect launch", detail: "Projectile motion & the balance behind 45°", question: "Why does a projectile travel farthest at 45 degrees?", className: "launch" },
  { number: "02", title: "A change of gravity", detail: "Same launch. A different world.", question: "How does gravity change a projectile's range?", className: "gravity" },
  { number: "03", title: "One velocity, two directions", detail: "The sideways and the upward, made visible.", question: "How do horizontal and vertical velocity components affect a projectile?", className: "vectors" },
];

function ConceptSketch({ kind }: { kind: string }) {
  return <svg viewBox="0 0 84 58" fill="none" aria-hidden="true">
    <path d="M8 48H77" stroke="#c8d2c8" />
    {kind === "vectors" ? <><path d="M18 45L65 12M18 45H65M18 45V12" stroke="#287d70" strokeWidth="1.5" /><path d="M59 13L65 12L64 19M60 41L65 45L60 49M14 17L18 12L22 17" stroke="#287d70" strokeWidth="1.5" /><circle cx="18" cy="45" r="3" fill="#f28b72" /></> : <><path d={kind === "gravity" ? "M9 47Q38 -15 75 47" : "M9 47Q43 -7 75 47"} stroke="#4776e6" strokeWidth="1.7" /><path d="M9 47Q28 13 47 47" stroke="#9a6e24" strokeDasharray="3 3" /><circle cx={kind === "gravity" ? 48 : 58} cy={kind === "gravity" ? 19 : 26} r="3" fill="#f28b72" /></>}
  </svg>;
}

export default function LandingPage() {
  return <div className="landing-page">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="landing-nav"><Brand /><nav aria-label="Main navigation"><a href="#how-it-works">How It Works</a><a href="#explore">Explore</a><Link href="/studio" className="nav-start">Start Learning<ArrowUpRight size={15} /></Link></nav></header>
    <main id="main-content">
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="hero-copy"><span className="eyebrow hero-kicker"><span />DON&apos;T JUST LEARN IT. SEE IT.</span><h1 id="hero-heading">Some things make more sense when you <em>see them.</em></h1><p>Meet Animind — the visual AI tutor that turns questions into interactive lessons and finds a new way to explain when you&apos;re stuck.</p><div className="hero-actions"><Link href="/studio" className="primary-button">Start Exploring<ArrowRight size={17} /></Link><a href="#in-action" className="action-link"><span><Play size={11} fill="currentColor" /></span>See Animind in Action</a></div><div className="hero-footnote"><BookOpen size={15} /><span>A little curiosity. A whole new perspective.<small>Starting with the beautiful physics of projectile motion.</small></span></div></div>
        <HeroExperiment />
      </section>

      <div className="landing-rule"><span>A QUESTION. AN EXPLORATION. AN UNDERSTANDING.</span><span>THE LEARNING ATELIER <BrandMark /></span></div>

      <section className="story-section story-ask" id="how-it-works" aria-labelledby="ask-heading">
        <div className="story-copy"><span className="section-number">01 <span>/ A LITTLE CURIOSITY</span></span><h2 id="ask-heading">Ask a <em>question.</em></h2><p>Start with the thing you&apos;ve always wanted to understand.</p><p className="story-detail">A question from class. A confusing step in your notes. That one “why” that won&apos;t leave you alone. Give it a place to begin.</p><span className="quiet-note"><Check size={14} />Ask directly or bring a text-based PDF.</span></div>
        <div className="question-note"><div className="note-top"><span className="small-label">A PAGE FROM YOUR CURIOSITY</span><span>001</span></div><span className="note-rule" /><p>Why does a projectile travel farthest at <em>45°?</em></p><div className="note-equation"><Equation equationKey="range" /><span>Let&apos;s look at it together.</span></div><Link href={`/studio?question=${encodeURIComponent(explorations[0].question)}`}>Explore this question<ArrowRight size={16} /></Link></div>
      </section>

      <section className="story-section story-explore" id="explore" aria-labelledby="explore-heading">
        <div className="story-copy"><span className="section-number">02 <span>/ MAKE IT TANGIBLE</span></span><h2 id="explore-heading">Watch it<br /><em>come alive.</em></h2><p>See the explanation unfold through movement, mathematics, and interaction.</p><p className="story-detail">Change an angle. Lower gravity. Follow a moving point. When you can play with an idea, you can begin to make it your own.</p><span className="quiet-note"><MoveUpRight size={14} />Real equations. Room to experiment.</span></div>
        <div className="exploration-list"><div className="explore-list-heading"><span className="small-label">OPEN AN EXPLORATION</span><span>Physics / Vol. 01</span></div>{explorations.map((item) => <Link href={`/studio?question=${encodeURIComponent(item.question)}`} className="exploration-row" key={item.number}><ConceptSketch kind={item.className} /><div><span className="small-label">EXPLORATION {item.number}</span><h3>{item.title}</h3><p>{item.detail}</p></div><ArrowUpRight size={20} /></Link>)}<p className="scope-note">Ideal projectile motion. Equal heights. No air resistance.<br />A carefully defined world, with plenty to discover.</p></div>
      </section>

      <section className="perspective-section" id="in-action" aria-labelledby="different-heading">
        <div className="perspective-title"><div><span className="section-number">03 <span>/ THE MOMENT IT CLICKS</span></span><h2 id="different-heading">Find <em>another way.</em></h2></div><p>Still confused? Animind changes the visual explanation, not just the words. Select a lesson step, tell us where you&apos;re stuck, and see the concept from a new angle.</p></div>
        <PerspectivePreview />
      </section>

      <section className="closing-section"><span className="eyebrow">THERE&apos;S AN AHA MOMENT WAITING FOR YOU.</span><h2>Understanding is a<br /><em>beautiful feeling.</em></h2><Link href="/studio" className="primary-button">Start Learning<ArrowRight size={17} /></Link><p>Your curiosity sets the direction.</p></section>
    </main>
    <footer className="landing-footer"><Brand /><p>Don&apos;t Just Learn It. See It.</p><span>Built with curiosity, for curious minds.</span><Link href="/studio">Enter the studio<ArrowUpRight size={13} /></Link></footer>
  </div>;
}
