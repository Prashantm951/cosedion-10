import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="SentinelX home">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <defs><linearGradient id="lg-sx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--primary)" /><stop offset="1" stopColor="var(--violet)" /></linearGradient></defs>
        <path d="M16 2 L28 7 V16 C28 23 22.5 28 16 30 C9.5 28 4 23 4 16 V7 Z" fill="none" stroke="url(#lg-sx)" strokeWidth="2.2" />
        <path d="M11 11 L21 21 M21 11 L11 21" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">Sentinel<span className="text-primary">X</span></span>
    </Link>
  );
}
