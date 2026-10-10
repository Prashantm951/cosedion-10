import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Instagram, Facebook, Youtube, Twitter, Send, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const cls = cn("h-4 w-4", className);
  switch (platform) {
    case "Instagram": return <Instagram className={cls} aria-label="Instagram" />;
    case "Facebook": return <Facebook className={cls} aria-label="Facebook" />;
    case "YouTube": return <Youtube className={cls} aria-label="YouTube" />;
    case "X": return <Twitter className={cls} aria-label="X" />;
    case "Telegram": return <Send className={cls} aria-label="Telegram" />;
    default: return <Smartphone className={cls} aria-label={platform} />;
  }
}

const SEV: Record<string, string> = {
  critical: "bg-critical/15 text-critical border-critical/30 glow-critical",
  high: "bg-high/15 text-high border-high/30",
  medium: "bg-medium/15 text-medium border-medium/30",
  low: "bg-low/15 text-low border-low/30",
};
const SEV_DOT: Record<string, string> = { critical: "bg-critical", high: "bg-high", medium: "bg-medium", low: "bg-low" };

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", SEV[severity], className)}>
      <span className="relative flex h-1.5 w-1.5">
        {severity === "critical" && <span className={cn("absolute inset-0 rounded-full animate-ping-dot", SEV_DOT[severity])} />}
        <span className={cn("relative h-1.5 w-1.5 rounded-full", SEV_DOT[severity])} />
      </span>
      {severity}
    </span>
  );
}

export const sevColorVar = (s: string) => `var(--${s})`;

const STATUS: Record<string, string> = {
  New: "text-primary border-primary/30 bg-primary/10",
  "Under Review": "text-medium border-medium/30 bg-medium/10",
  Confirmed: "text-high border-high/30 bg-high/10",
  "Takedown Requested": "text-violet border-violet/40 bg-violet/10",
  Resolved: "text-low border-low/30 bg-low/10",
  "False Positive": "text-muted-foreground border-border bg-muted",
  Draft: "text-muted-foreground border-border bg-muted",
  Submitted: "text-violet border-violet/40 bg-violet/10",
};
export function StatusChip({ status }: { status: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", STATUS[status] ?? STATUS.Draft)}>{status}</span>;
}

export function CountUp({ value, className, duration = 1.2 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (reduce) { ref.current.textContent = value.toLocaleString(); return; }
    const c = animate(0, value, { duration, ease: "easeOut", onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString(); } });
    return () => c.stop();
  }, [value, reduce, duration]);
  return <span ref={ref} className={cn("tabular", className)}>0</span>;
}

export function Avatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const initials = name.replace(/[^a-zA-Z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return src ? (
    <img src={src} alt={name} className={cn("h-10 w-10 rounded-full object-cover ring-1 ring-border", className)} loading="lazy" />
  ) : (
    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground", className)}>{initials}</div>
  );
}

/** Semicircular gauge, gradient arc green→red, glowing end-cap. */
export function RiskGauge({ score, size = 220 }: { score: number; size?: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? score : 0);
  useEffect(() => {
    if (reduce) { setV(score); return; }
    const c = animate(0, score, { duration: 1.4, ease: [0.2, 0.8, 0.2, 1], onUpdate: setV });
    return () => c.stop();
  }, [score, reduce]);
  const r = size / 2 - 16;
  const cx = size / 2, cy = size / 2;
  const len = Math.PI * r;
  const angle = Math.PI * (1 - v / 100);
  const ex = cx + r * Math.cos(angle), ey = cy - r * Math.sin(angle);
  const sev = v >= 80 ? "critical" : v >= 60 ? "high" : v >= 40 ? "medium" : "low";
  return (
    <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`} role="img" aria-label={`Risk score ${score}`}>
      <defs>
        <linearGradient id="gauge-grad" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--low)" />
          <stop offset="45%" stopColor="var(--medium)" />
          <stop offset="70%" stopColor="var(--high)" />
          <stop offset="100%" stopColor="var(--critical)" />
        </linearGradient>
        <filter id="gauge-glow"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#gauge-grad)" strokeWidth="14" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - v / 100)} />
      <circle cx={ex} cy={ey} r="12" fill={`var(--${sev})`} filter="url(#gauge-glow)" opacity="0.8" />
      <circle cx={ex} cy={ey} r="7" fill="var(--foreground)" stroke={`var(--${sev})`} strokeWidth="3" />
      <text x={cx} y={cy - 8} textAnchor="middle" className="font-mono" fontSize={size / 4.4} fontWeight="700" fill="var(--foreground)">{Math.round(v)}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" letterSpacing="2" fill="var(--muted-foreground)">RISK / 100</text>
    </svg>
  );
}

export function Sparkline({ data, color = "var(--primary)", id }: { data: number[]; color?: string; id: string }) {
  const w = 100, h = 32;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - ((d - min) / (max - min || 1)) * (h - 4) - 2]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border border-primary/30" />
        <div className="absolute inset-3 rounded-full border border-primary/20" />
        <div className="absolute inset-6 rounded-full bg-primary/60 glow-primary" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35 } }),
};
export const MotionDiv = motion.div;
