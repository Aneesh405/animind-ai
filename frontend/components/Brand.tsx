import Link from "next/link";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M5 31H35" stroke="currentColor" strokeWidth="1.5" opacity=".35" />
      <path d="M7 30C12 30 13 9 21 9C28 9 30 25 33 28" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="26.6" cy="14.1" r="4" fill="#f28b72" stroke="var(--background, #fafaf7)" strokeWidth="2" />
    </svg>
  );
}

export default function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Animind AI home">
      <BrandMark />
      <span>animind<span className="brand-ai">AI</span></span>
    </Link>
  );
}
