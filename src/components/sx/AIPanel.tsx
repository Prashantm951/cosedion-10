import { useEffect, useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { scamPhrases } from "@/lib/scoring";
import { Button } from "@/components/ui/button";

type AI = { scam_probability?: number; indicators?: string[]; scam_phrases?: string[]; explanation?: string; source?: string } | null;

const CHIP = ["bg-critical/15 text-critical border-critical/30", "bg-high/15 text-high border-high/30", "bg-violet/15 text-violet border-violet/30", "bg-medium/15 text-medium border-medium/30"];

export function highlight(text: string, extra: string[] = []) {
  const phrases = [...new Set([...scamPhrases(text).map((p) => p.phrase), ...extra])].filter((p) => p && text.includes(p));
  if (!phrases.length) return text;
  const re = new RegExp(`(${phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text.split(re).map((part, i) => phrases.includes(part) ? <mark key={i} className="rounded bg-critical/20 px-1 text-critical">{part}</mark> : part);
}

export function AIPanel({ ai, bio, onRerun, running }: { ai: AI; bio: string; onRerun?: () => void; running?: boolean }) {
  const reduce = useReducedMotion();
  const full = ai?.explanation ?? "";
  const [n, setN] = useState(reduce ? full.length : 0);
  useEffect(() => {
    if (reduce) { setN(full.length); return; }
    setN(0);
    const id = setInterval(() => setN((x) => { if (x >= full.length) { clearInterval(id); return x; } return x + 2; }), 16);
    return () => clearInterval(id);
  }, [full, reduce]);
  const phrases = [...new Set([...(ai?.scam_phrases ?? []), ...scamPhrases(bio).map((p) => p.phrase)])];

  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet/20 blur-3xl" />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-violet" /><span className="label-caps">AI analysis</span>{ai?.source === "ai" && <span className="rounded border border-violet/30 px-1.5 font-mono text-[10px] text-violet">LIVE MODEL</span>}</div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm">scam p = <span className="font-bold text-critical">{Math.round((ai?.scam_probability ?? 0) * 100)}%</span></span>
          {onRerun && <Button size="sm" variant="outline" onClick={onRerun} disabled={running}><RefreshCw className={running ? "animate-spin" : ""} />{running ? "Analyzing…" : "Re-analyze"}</Button>}
        </div>
      </div>
      <p className="min-h-[4.5rem] text-[15px] leading-relaxed">{full.slice(0, n)}{n < full.length && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-violet animate-blink" />}</p>
      {!!phrases.length && <>
        <div className="label-caps mb-2 mt-5">Flagged phrases</div>
        <div className="flex flex-wrap gap-2">{phrases.map((p, i) => <span key={p} className={`rounded-full border px-2.5 py-1 font-mono text-xs ${CHIP[i % CHIP.length]}`}>{p}</span>)}</div>
      </>}
      {!!ai?.indicators?.length && <div className="mt-4 flex flex-wrap gap-1.5">{ai.indicators.map((x) => <span key={x} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{x}</span>)}</div>}
    </div>
  );
}
