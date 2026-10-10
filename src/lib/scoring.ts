// Risk scoring: handle similarity w/ homoglyph normalization, keyword flags, weighted final score.

const HOMOGLYPHS: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "|": "l",
  "!": "i",
  // Cyrillic → Latin
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
  ј: "j",
  ѕ: "s",
  ԁ: "d",
  ν: "v",
  ο: "o",
};

export const SUSPICIOUS_KEYWORDS = [
  "support",
  "care",
  "help",
  "official",
  "refund",
  "desk",
  "team",
  "india",
  "verify",
  "kyc",
  "helpline",
  "service",
];

export function normalize(s: string): string {
  let out = s.toLowerCase().replace(/rn/g, "m").replace(/vv/g, "w");
  out = [...out].map((c) => HOMOGLYPHS[c] ?? c).join("");
  return out.replace(/[^a-z0-9]/g, "");
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[a.length][b.length];
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

/** Indices of characters in `handle` that are homoglyph/look-alike substitutions. */
export function homoglyphIndices(handle: string): number[] {
  const idx: number[] = [];
  [...handle].forEach((c, i) => {
    if (HOMOGLYPHS[c.toLowerCase()] && /[^a-z]/i.test(c)) idx.push(i);
    else if (/[\u0400-\u04FF\u0370-\u03FF]/.test(c)) idx.push(i);
  });
  return idx;
}

export function keywordFlags(text: string): string[] {
  const n = text.toLowerCase();
  return SUSPICIOUS_KEYWORDS.filter((k) => n.includes(k));
}

export function handleScore(handle: string, references: string[]) {
  const n = normalize(handle);
  const flags = keywordFlags(handle);
  let stripped = n;
  flags.forEach((f) => (stripped = stripped.replace(f, "")));
  let best = 0;
  for (const r of references) {
    const rn = normalize(r);
    if (!rn) continue;
    const s = Math.max(
      similarity(stripped, rn),
      similarity(n, rn),
      stripped.includes(rn) ? 0.95 : 0,
    );
    best = Math.max(best, s);
  }
  const homoglyphs = homoglyphIndices(handle);
  const score = Math.min(
    100,
    Math.round(best * 85 + flags.length * 6 + (homoglyphs.length ? 10 : 0)),
  );
  return { score, similarity: Math.round(best * 100), flags, homoglyphs };
}

export function accountSignalScore(opts: {
  ageDays: number;
  followers: number;
  verified: boolean;
}) {
  let s = 0;
  if (opts.ageDays < 30) s += 45;
  else if (opts.ageDays < 180) s += 25;
  else if (opts.ageDays < 365) s += 10;
  if (opts.followers < 500) s += 30;
  else if (opts.followers < 5000) s += 15;
  if (!opts.verified) s += 25;
  return Math.min(100, s);
}

export const WEIGHTS = { handle: 0.3, logo: 0.25, ai: 0.3, account: 0.15 };

export function finalScore(p: { handle: number; logo: number; ai: number; account: number }) {
  return Math.round(
    p.handle * WEIGHTS.handle +
      p.logo * WEIGHTS.logo +
      p.ai * WEIGHTS.ai +
      p.account * WEIGHTS.account,
  );
}

export type Severity = "critical" | "high" | "medium" | "low";
export function severityOf(score: number): Severity {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

const SCAM_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /dm (us |me )?for (a )?refund/gi, label: "Refund lure" },
  { re: /refund/gi, label: "Refund lure" },
  { re: /whats ?app[^.\n]*?\+?\d[\d\s-]{8,}/gi, label: "WhatsApp number" },
  { re: /\+?91[\s-]?\d{5}[\s-]?\d{5}/g, label: "Phone number" },
  { re: /kyc/gi, label: "KYC pretext" },
  { re: /(urgent|immediately|within 24 ?h(ours|rs)?|blocked|suspended)/gi, label: "Urgency" },
  { re: /(bit\.ly|tinyurl|t\.me)\/\S+/gi, label: "Shortened link" },
  { re: /(upi|pay ?now|payment link|processing fee|otp)/gi, label: "Payment request" },
];

export function scamPhrases(text: string): { phrase: string; label: string }[] {
  const out: { phrase: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const p of SCAM_PATTERNS) {
    for (const m of text.matchAll(p.re)) {
      const k = m[0].toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ phrase: m[0], label: p.label });
      }
    }
  }
  return out;
}

export function heuristicScam(text: string) {
  const phrases = scamPhrases(text);
  const p = Math.min(0.98, 0.15 + phrases.length * 0.16);
  return {
    scam_probability: Number(p.toFixed(2)),
    indicators: [...new Set(phrases.map((x) => x.label))],
    explanation: phrases.length
      ? `This account uses ${[...new Set(phrases.map((x) => x.label.toLowerCase()))].join(", ")} — classic patterns used to divert customers off-platform and collect payments or credentials.`
      : "No strong scam language detected in the bio or posts.",
  };
}

export const RISKY_PERMISSIONS = [
  "READ_SMS",
  "RECEIVE_SMS",
  "SEND_SMS",
  "BIND_ACCESSIBILITY_SERVICE",
  "SYSTEM_ALERT_WINDOW",
  "READ_CONTACTS",
  "READ_CALL_LOG",
  "REQUEST_INSTALL_PACKAGES",
];
