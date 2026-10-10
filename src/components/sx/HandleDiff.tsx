import { homoglyphIndices, SUSPICIOUS_KEYWORDS } from "@/lib/scoring";

/** Renders a handle with homoglyph chars underlined red and scam keywords highlighted amber. */
export function HandleDiff({ handle, className }: { handle: string; className?: string }) {
  const hg = new Set(homoglyphIndices(handle));
  const lower = handle.toLowerCase();
  const kw = new Set<number>();
  for (const k of SUSPICIOUS_KEYWORDS) {
    let i = lower.indexOf(k);
    while (i >= 0) { for (let j = i; j < i + k.length; j++) kw.add(j); i = lower.indexOf(k, i + 1); }
  }
  return (
    <span className={className}>
      {[...handle].map((c, i) =>
        hg.has(i) ? (
          <span key={i} className="rounded-sm bg-critical/20 text-critical underline decoration-critical decoration-2 underline-offset-4" title="Look-alike character">{c}</span>
        ) : kw.has(i) ? (
          <span key={i} className="bg-high/15 text-high">{c}</span>
        ) : (
          <span key={i}>{c}</span>
        ),
      )}
    </span>
  );
}
