import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PLATFORMS } from "@/lib/demo-data";
import { PlatformIcon } from "./primitives";

type Node = { id: string; label: string; platform: string; risk: number; severity: string };

export function ThreatGraph({ nodes, brandName, logo, onSelect, height = 560, interactive = true }: { nodes: Node[]; brandName: string; logo?: string | null; onSelect?: (id: string) => void; height?: number; interactive?: boolean }) {
  const [hover, setHover] = useState<Node | null>(null);
  const W = 1000, H = 700, cx = W / 2, cy = H / 2;
  const clusters = useMemo(() => {
    const cats = [...PLATFORMS, "Play Store"];
    return cats.map((p, i) => {
      const a = (i / cats.length) * Math.PI * 2 - Math.PI / 2;
      return { p, x: cx + Math.cos(a) * 230, y: cy + Math.sin(a) * 210, a };
    });
  }, []);
  const placed = useMemo(() => {
    const byP: Record<string, Node[]> = {};
    nodes.forEach((n) => (byP[n.platform] ??= []).push(n));
    return clusters.flatMap((c) => (byP[c.p] ?? []).map((n, i, arr) => {
      const ring = 60 + (i % 2) * 38;
      const a = c.a + ((i - arr.length / 2) / Math.max(arr.length, 1)) * 2.4;
      return { ...n, x: c.x + Math.cos(a) * ring * 0.9, y: c.y + Math.sin(a) * ring * 0.8, r: 6 + (n.risk / 100) * 14, cx: c.x, cy: c.y };
    }));
  }, [nodes, clusters]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Threat network graph">
        <defs>
          <radialGradient id="tg-core"><stop offset="0" stopColor="var(--primary)" stopOpacity="0.45" /><stop offset="1" stopColor="var(--primary)" stopOpacity="0" /></radialGradient>
          <clipPath id="tg-clip"><circle cx={cx} cy={cy} r="34" /></clipPath>
        </defs>
        {[120, 230, 330].map((r) => <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeDasharray="2 6" />)}
        {clusters.map((c) => <line key={c.p} x1={cx} y1={cy} x2={c.x} y2={c.y} stroke="var(--primary)" strokeOpacity="0.15" />)}
        {placed.map((n) => <line key={"l" + n.id} x1={n.cx} y1={n.cy} x2={n.x} y2={n.y} stroke={`var(--${n.severity})`} strokeOpacity={hover?.id === n.id ? 0.8 : 0.25} />)}
        {clusters.map((c) => (
          <g key={"c" + c.p}>
            <circle cx={c.x} cy={c.y} r="18" fill="var(--surface-2)" stroke="var(--border)" />
            <foreignObject x={c.x - 8} y={c.y - 8} width="16" height="16"><div className="text-muted-foreground"><PlatformIcon platform={c.p} /></div></foreignObject>
          </g>
        ))}
        {placed.map((n, i) => (
          <motion.circle
            key={n.id}
            initial={{ r: 0 }}
            animate={{ r: hover?.id === n.id ? n.r + 4 : n.r }}
            transition={{ delay: interactive ? i * 0.015 : 0, type: "spring", stiffness: 200, damping: 18 }}
            cx={n.x} cy={n.y}
            fill={`var(--${n.severity})`} fillOpacity="0.85"
            stroke="var(--background)" strokeWidth="2"
            style={{ cursor: onSelect ? "pointer" : "default", filter: n.severity === "critical" ? "drop-shadow(0 0 6px var(--critical))" : undefined }}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(n.id)}
            tabIndex={onSelect ? 0 : -1}
            onKeyDown={(e) => e.key === "Enter" && onSelect?.(n.id)}
            aria-label={`${n.label}, risk ${n.risk}`}
          />
        ))}
        <circle cx={cx} cy={cy} r="90" fill="url(#tg-core)" />
        <circle cx={cx} cy={cy} r="36" fill="var(--surface-2)" stroke="var(--primary)" strokeWidth="2" />
        {logo ? <image href={logo} x={cx - 34} y={cy - 34} width="68" height="68" clipPath="url(#tg-clip)" /> : <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--primary)" fontWeight="700">{brandName.slice(0, 2)}</text>}
        <text x={cx} y={cy + 56} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">{brandName}</text>
      </svg>
      {hover && (
        <div className="glass pointer-events-none absolute left-4 top-4 rounded-xl px-3 py-2 text-sm">
          <div className="font-mono">@{hover.label}</div>
          <div className="text-xs text-muted-foreground">{hover.platform} · risk <span className="font-mono" style={{ color: `var(--${hover.severity})` }}>{hover.risk}</span></div>
        </div>
      )}
    </div>
  );
}
