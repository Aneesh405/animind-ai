import Link from "next/link";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="34" height="34" rx="10" fill="currentColor" />
      <path d="M8 29.5H32" stroke="#F7F3E9" strokeWidth="1.25" opacity=".45" />
      <path d="M8.5 28.5C12.5 28.5 14 11 20.5 11C26.5 11 28.5 23.5 31.5 27" stroke="#F7F3E9" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="25.7" cy="15.8" r="3.7" fill="var(--coral, #FF6A4A)" stroke="currentColor" strokeWidth="1.7" />
      <rect x="8" y="8" width="4" height="4" rx="1" fill="var(--citron, #D7F36A)" />
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
