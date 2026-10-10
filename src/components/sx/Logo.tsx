import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group" aria-label="ThreatLens home">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#143f36] shadow-[2px_2px_5px_rgba(5,18,15,0.8),-1px_-1px_4px_rgba(42,107,92,0.35)] border border-[#2A6B5C]/60 group-hover:border-[#C49A45]/60 transition-colors">
        <svg
          width="20"
          height="20"
          viewBox="0 0 32 32"
          aria-hidden
          className="transition-transform group-hover:scale-105"
        >
          <defs>
            <linearGradient id="lg-tl" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C49A45" />
              <stop offset="100%" stopColor="#2A6B5C" />
            </linearGradient>
          </defs>
          {/* Outer tactile lens perimeter */}
          <circle cx="16" cy="16" r="13" fill="none" stroke="url(#lg-tl)" strokeWidth="2.2" />
          {/* Target reticle ticks */}
          <line
            x1="16"
            y1="3"
            x2="16"
            y2="7"
            stroke="#C49A45"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="25"
            x2="16"
            y2="29"
            stroke="#C49A45"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="3"
            y1="16"
            x2="7"
            y2="16"
            stroke="#C49A45"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="25"
            y1="16"
            x2="29"
            y2="16"
            stroke="#C49A45"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Tactical aperture center */}
          <circle cx="16" cy="16" r="5" fill="#C49A45" opacity="0.25" />
          <circle cx="16" cy="16" r="3" fill="#C49A45" />
        </svg>
      </div>
      <span className="text-[15px] font-bold tracking-tight text-[#E8DCC4]">
        Threat<span className="text-[#C49A45]">Lens</span>
      </span>
    </Link>
  );
}
