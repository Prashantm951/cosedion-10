import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Instagram, Facebook, Youtube, Twitter, Send, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const cls = cn("h-3.5 w-3.5", className);
  switch (platform) {
    case "Instagram":
      return <Instagram className={cls} aria-label="Instagram" />;
    case "Facebook":
      return <Facebook className={cls} aria-label="Facebook" />;
    case "YouTube":
      return <Youtube className={cls} aria-label="YouTube" />;
    case "X":
      return <Twitter className={cls} aria-label="X" />;
    case "Telegram":
      return <Send className={cls} aria-label="Telegram" />;
    default:
      return <Smartphone className={cls} aria-label={platform} />;
  }
}

const SEV: Record<string, string> = {
  critical:
    "bg-[#421717] text-[#ff7373] border-[#912d2d] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]",
  high: "bg-[#382b13] text-[#e0b45a] border-[#C49A45]/70 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]",
  medium:
    "bg-[#332b13] text-[#d4af37] border-[#a18835]/60 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]",
  low: "bg-[#133c33] text-[#55cca0] border-[#2A6B5C]/70 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]",
};
const SEV_DOT: Record<string, string> = {
  critical: "bg-[#ff7373]",
  high: "bg-[#C49A45]",
  medium: "bg-[#d4af37]",
  low: "bg-[#55cca0]",
};

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium capitalize",
        SEV[severity] ?? SEV.low,
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {severity === "critical" && (
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping-dot opacity-75",
              SEV_DOT[severity],
            )}
          />
        )}
        <span className={cn("relative h-1.5 w-1.5 rounded-full", SEV_DOT[severity])} />
      </span>
      {severity}
    </span>
  );
}

export const sevColorVar = (s: string) => `var(--${s})`;

const STATUS: Record<string, string> = {
  New: "text-[#C49A45] border-[#C49A45]/40 bg-[#163f35] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]",
  "Under Review":
    "text-[#d4af37] border-[#d4af37]/40 bg-[#163f35] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]",
  Confirmed:
    "text-[#e0b45a] border-[#C49A45]/60 bg-[#163f35] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]",
  "Takedown Requested":
    "text-[#ff8a65] border-[#ff8a65]/40 bg-[#163f35] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]",
  Resolved:
    "text-[#55cca0] border-[#2A6B5C]/60 bg-[#163f35] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]",
  "False Positive": "text-muted-foreground border-[#2A6B5C]/30 bg-[#133c33]",
  Draft: "text-muted-foreground border-[#2A6B5C]/30 bg-[#133c33]",
  Submitted: "text-[#C49A45] border-[#C49A45]/40 bg-[#163f35]",
};
export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-mono font-medium",
        STATUS[status] ?? STATUS.Draft,
      )}
    >
      {status}
    </span>
  );
}

export function CountUp({
  value,
  className,
  duration = 1.2,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (reduce) {
      ref.current.textContent = value.toLocaleString();
      return;
    }
    const c = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
      },
    });
    return () => c.stop();
  }, [value, reduce, duration]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      0
    </span>
  );
}

export function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const initials =
    name
      .replace(/[^a-zA-Z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  return src ? (
    <img
      src={src}
      alt={name}
      className={cn(
        "h-8 w-8 rounded-lg object-cover ring-1 ring-[#2A6B5C]/50 shadow-[2px_2px_5px_rgba(0,0,0,0.5)]",
        className,
      )}
      loading="lazy"
    />
  ) : (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-xs font-bold text-[#123F36] shadow-[2px_2px_5px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      {initials}
    </div>
  );
}

/** Semicircular gauge, gradient arc green→gold→red, glowing end-cap. */
export function RiskGauge({ score, size = 220 }: { score: number; size?: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? score : 0);
  useEffect(() => {
    if (reduce) {
      setV(score);
      return;
    }
    const c = animate(0, score, { duration: 1.4, ease: [0.2, 0.8, 0.2, 1], onUpdate: setV });
    return () => c.stop();
  }, [score, reduce]);
  const r = size / 2 - 16;
  const cx = size / 2,
    cy = size / 2;
  const len = Math.PI * r;
  const angle = Math.PI * (1 - v / 100);
  const ex = cx + r * Math.cos(angle),
    ey = cy - r * Math.sin(angle);
  const sev = v >= 80 ? "critical" : v >= 60 ? "high" : v >= 40 ? "medium" : "low";
  return (
    <svg
      width={size}
      height={size / 2 + 24}
      viewBox={`0 0 ${size} ${size / 2 + 24}`}
      role="img"
      aria-label={`Risk score ${score}`}
    >
      <defs>
        <linearGradient id="gauge-grad" x1="0" x2="1">
          <stop offset="0%" stopColor="#36aa80" />
          <stop offset="45%" stopColor="#d4a94f" />
          <stop offset="70%" stopColor="#C49A45" />
          <stop offset="100%" stopColor="#e25252" />
        </linearGradient>
        <filter id="gauge-glow">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#133c33"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="url(#gauge-grad)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - v / 100)}
      />
      <circle
        cx={ex}
        cy={ey}
        r="10"
        fill={`var(--${sev})`}
        filter="url(#gauge-glow)"
        opacity="0.85"
      />
      <circle cx={ex} cy={ey} r="6" fill="#E8DCC4" stroke={`var(--${sev})`} strokeWidth="2.5" />
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        className="font-mono"
        fontSize={size / 4.4}
        fontWeight="700"
        fill="#E8DCC4"
      >
        {Math.round(v)}
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        fontSize="10"
        letterSpacing="2"
        fill="#b8ab94"
        className="font-mono"
      >
        RISK / 100
      </text>
    </svg>
  );
}

export function Sparkline({
  data,
  color = "#C49A45",
  id,
}: {
  data: number[];
  color?: string;
  id: string;
}) {
  const w = 100,
    h = 32;
  const max = Math.max(...data, 1),
    min = Math.min(...data, 0);
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * w,
    h - ((d - min) / (max - min || 1)) * (h - 4) - 2,
  ]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#sp-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#133c33]", className)} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="neo-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border border-[#2A6B5C]/50 shadow-[2px_2px_6px_rgba(0,0,0,0.6)]" />
        <div className="absolute inset-2.5 rounded-full border border-[#C49A45]/40" />
        <div className="absolute inset-5 rounded-full bg-[#C49A45] shadow-[0_0_10px_#C49A45]" />
      </div>
      <h3 className="text-base font-bold text-[#E8DCC4]">{title}</h3>
      <p className="max-w-sm text-xs text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#E8DCC4] sm:text-2xl">{title}</h1>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
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
