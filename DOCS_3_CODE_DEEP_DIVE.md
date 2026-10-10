# SentinelX — Part 3: Code Deep Dive

> This file answers: **How does the actual code work? What does each important file do?**
> Explained like you're learning for the first time — with analogies and step-by-step walkthroughs.

---

## How to Read This File

Each section covers one key file. We explain:
1. What the file does overall (the job of the file)
2. The most important functions inside it
3. How those functions work, step by step
4. How they connect to other files

---

## File 1: `src/lib/scoring.ts` — The Danger Calculator

**Job:** Looks at a fake account and calculates a "danger score" from 0 to 100. This is the mathematical brain of SentinelX.

**Think of it as:** A detective that checks 4 things about a suspect and gives each a score, then combines them into a final verdict.

---

### Function: `normalize(handle)`

**What it does:** Cleans up a handle by converting look-alike characters to their real equivalents.

```typescript
const HOMOGLYPHS: Record<string, string> = {
  "0": "o", "1": "l", "3": "e",
  "а": "a",  // This is Cyrillic 'а', looks IDENTICAL to Latin 'a'
  "е": "e",  // Cyrillic 'е'
  "о": "o",  // Cyrillic 'о'
  "rn": "m", // 'rn' side by side looks like 'm'
  "vv": "w",
};
```

**Step by step:**
```
Input:  "n0vapаy_support"
Step 1: Replace char-by-char using HOMOGLYPHS
        n → n, 0 → o, v → v, a → a, p → p, а(Cyrillic) → a, y → y
Step 2: Strip non-alphanumeric characters
        "novapay_support" → "novapaysupport"
Step 3: Lowercase everything
Output: "novapaysupport"
```

Now comparing "novapaysupport" to "novapay" is much more revealing than comparing the original.

---

### Function: `levenshtein(a, b)`

**What it does:** Counts the minimum number of single-character changes (insert, delete, replace) to transform string `a` into string `b`.

**Analogy:** If you had to edit "cat" to become "car", you'd replace the `t` with `r` — that's 1 edit. Levenshtein distance is 1.

```typescript
function levenshtein(a: string, b: string): number {
  // Uses a 2D matrix (grid) of size [a.length+1] × [b.length+1]
  const m = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = a[i - 1] === b[j - 1]
        ? m[i - 1][j - 1]           // Characters match — no edit needed
        : 1 + Math.min(m[i - 1][j], m[i][j - 1], m[i - 1][j - 1]);  // Best of insert/delete/replace
    }
  }
  return m[a.length][b.length];
}
```

**How similarity is calculated:**
```
distance = levenshtein("novapaysupport", "novapay") = 7
maxLen = max(14, 7) = 14
similarity = 1 - (7/14) = 0.5 = 50%
```

---

### Function: `handleScore(handle, references)`

**What it does:** Computes the handle's danger score (0–100) by comparing it against all official handles and keywords.

**Step by step:**
```typescript
// 1. Normalize the fake handle
const nh = normalize(handle);     // "novapaysupport"

// 2. Compare against every official handle and keyword
let bestSimilarity = 0;
for (const rn of references) {  // references = ["novapay", "novapay upi", ...]
  const nr = normalize(rn);     // "novapay"
  
  // If the official name is CONTAINED in the fake handle → very suspicious
  if (nh.includes(nr)) {
    bestSimilarity = Math.max(bestSimilarity, 0.95);
  } else {
    // Regular edit-distance similarity
    const d = levenshtein(nh, nr);
    bestSimilarity = Math.max(bestSimilarity, 1 - d / Math.max(nh.length, nr.length));
  }
}

// 3. Check for suspicious keyword suffixes
const keywordFlags = SUSPICIOUS_KEYWORDS.filter(k => nh.includes(k));
// ["support"] found → +6 points

// 4. Detect homoglyph characters
const homoglyphIndices = [...handle].flatMap((ch, i) =>
  HOMOGLYPHS[ch] ? [i] : []
);  // [3, 6] ← indices where homoglyphs were found

// 5. Combine into final score
const base = Math.round(bestSimilarity * 85);  // 0.95 × 85 = 80
const bonus = keywordFlags.length * 6 + homoglyphIndices.length * 10;
return { score: Math.min(100, base + bonus), ... };
// = min(100, 80 + 6 + 10) = 96
```

---

### Function: `finalScore({ handle, logo, ai, account })`

**What it does:** Combines the four signals into one final score.

```typescript
const WEIGHTS = { handle: 0.30, logo: 0.25, ai: 0.30, account: 0.15 };

export function finalScore(s: Signals): number {
  return Math.round(
    s.handle * WEIGHTS.handle +
    s.logo   * WEIGHTS.logo   +
    s.ai     * WEIGHTS.ai     +
    s.account * WEIGHTS.account
  );
}

// Example:
finalScore({ handle: 96, logo: 94, ai: 72, account: 85 })
= round(96×0.30 + 94×0.25 + 72×0.30 + 85×0.15)
= round(28.8   + 23.5   + 21.6   + 12.75)
= round(86.65) = 87 → severity: "critical"
```

---

### Function: `heuristicScam(text)`

**What it does:** Analyzes a bio text for scam patterns without making any API call. Used for demo data and when AI is unavailable.

```typescript
const SCAM_PATTERNS = [
  { re: /dm (us |me )?for (a )?refund/gi, label: "Refund lure",     weight: 0.9 },
  { re: /whats?app[^.\n]*?\+?\d[\d\s-]{8,}/gi, label: "WhatsApp",  weight: 0.9 },
  { re: /\+91[-\s]?\d{10}/g, label: "Indian phone number",          weight: 0.6 },
  { re: /kyc/gi, label: "KYC pretext",                              weight: 0.7 },
  { re: /(urgent|blocked|suspended)[^.]*(\d+\s*hours?|24|48)/gi, label: "Urgency", weight: 0.8 },
  { re: /(bit\.ly|tinyurl|t\.me)\/\S+/gi, label: "Shortened link", weight: 0.6 },
  { re: /upi\s*id|gpay|paytm|pay\s*(?:now|here)/gi, label: "Payment", weight: 0.7 },
  { re: /cash\s*back|cashback/gi, label: "Cashback lure",           weight: 0.5 },
];

function heuristicScam(text: string) {
  const found = SCAM_PATTERNS.filter(p => p.re.test(text));
  const scam_probability = Math.min(0.98, 0.15 + found.length * 0.16);
  // 0 matches → 0.15 (always some background probability)
  // 4 matches → 0.15 + 0.64 = 0.79
  // 6 matches → 0.15 + 0.96 = 1.11 → capped at 0.98
  
  const explanation = found.length > 0
    ? `Analysis detected ${found.length} scam indicator(s): ${found.map(p => p.label).join(", ")}...`
    : `No strong scam indicators detected...`;

  return { scam_probability, indicators: found.map(p => p.label), explanation, source: "heuristic" };
}
```

---

## File 2: `src/lib/data.ts` — The Data Layer

**Job:** Every component that needs data from the database goes through this file. It provides custom React hooks that fetch and cache data using TanStack Query.

**Think of it as:** A library card system. Instead of going to the database stacks yourself, you ask the librarian (this file). The librarian remembers what you borrowed recently (cache) and only goes back to the stacks when necessary.

---

### What is a React Hook?

A hook is a function that starts with `use` and can remember state between renders. When you call `useThreats(brandId)`, it:
1. Checks if there's a cached result for this `brandId`
2. If yes → returns cached data immediately (fast!)
3. If no → fires a database query, returns `{ isLoading: true }` until done
4. When query finishes → updates the cache and re-renders the component

---

### The pattern every hook follows:

```typescript
export function useThreats(brandId?: string) {
  return useQuery({
    enabled: !!brandId,                    // Don't run if brandId is undefined
    queryKey: ["threats", brandId],        // Cache key — same key = same cached result
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threats")
        .select("*")
        .eq("brand_id", brandId!)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data as Threat[];
    },
  });
}
```

**All the data hooks in this file:**

| Hook | What It Fetches | Used In |
|---|---|---|
| `useThreats(brandId)` | All threats for a brand | Dashboard, Threats page, Graph, Detail |
| `useThreat(id)` | Single threat by ID | Threat detail page |
| `useApps(brandId)` | All suspicious apps | Apps page, Dashboard |
| `useApp(id)` | Single app by ID | App detail |
| `useReports(brandId)` | All takedown reports | Reports list |
| `useReport(id)` | Single report | Report detail page |
| `useNotes(threatId)` | All analyst notes for a threat | Threat detail page |
| `useBrands()` | All brands for current user | Brand switcher dropdown |
| `useBrand()` | The currently active brand | Everywhere via `useShell()` |
| `useScans(brandId)` | Scan history | Dashboard |

**The `useInvalidate` hook — refreshing data:**

```typescript
export function useInvalidate() {
  const qc = useQueryClient();
  return (key: string) => qc.invalidateQueries({ queryKey: [key] });
}

// Usage in a component:
const invalidate = useInvalidate();
await supabase.from("threats").update({ status: "Confirmed" }).eq("id", id);
invalidate("threats");  // Tells TanStack Query: "your cached threats are stale, re-fetch"
```

---

## File 3: `src/components/sx/AppShell.tsx` — The Master Layout

**Job:** Wraps every authenticated page with the sidebar, top bar, brand switcher, search, and notifications. Also provides the `useShell()` context.

**Think of it as:** The outer skeleton of the app — the permanent frame that stays visible while pages change inside it.

---

### React Context — How `useShell()` works

**What is Context?** Imagine a building intercom system. Any room can "tune in" to the intercom without being directly connected by wire. React Context works the same way: the `AppShell` broadcasts information (current brand, `runScan` function), and any page inside it can "tune in" using `useShell()`.

```typescript
// Creating the intercom (broadcasting):
type ShellCtx = { brand: Brand | null; brands: Brand[]; runScan: () => void };
const Ctx = createContext<ShellCtx>(null!);
export function useShell() { return useContext(Ctx); }

// Inside AppShell:
return (
  <Ctx.Provider value={{ brand, brands: brands ?? [], runScan: () => setScan(true) }}>
    <Sidebar>...</Sidebar>
    <main>{children}</main>
    <ScanOverlay open={scan} brand={brand} onClose={() => setScan(false)} />
  </Ctx.Provider>
);

// In any page (e.g., Dashboard):
const { brand, runScan } = useShell();  // "tune in" to the intercom
```

---

### The "Run Scan" Flow

```
User clicks "Run Scan" button (in sidebar)
→ runScan() is called
→ setScan(true) in AppShell state
→ <ScanOverlay open={true} brand={brand} /> renders
→ ScanOverlay starts its useEffect
→ Animation runs, demo threats are inserted into DB
→ onDone() is called
→ invalidate("threats") — dashboard data refreshes
→ User clicks "Review threats"
→ onClose() called → setScan(false) → overlay disappears
```

---

## File 4: `src/components/sx/ScanOverlay.tsx` — The Scan Simulator

**Job:** Shows the animated radar screen while "scanning". Inserts demo threats into the database.

**Key insight:** The threats to "discover" are computed BEFORE the animation loop starts.
The animation just reveals them one by one with time delays.

```typescript
useEffect(() => {
  if (!open || !brand) return;
  let cancelled = false;
  
  // STEP 1: Compute what will be "discovered" (from demo pool, before animation)
  const disc = scanDiscoveries(brand.id, uid, brand.logo_url, existingHandles, 3);
  
  // STEP 2: Create a scan record in the database
  const { data: scan } = await supabase.from("scans").insert({
    brand_id: brand.id, user_id: uid
  }).select().single();
  
  // STEP 3: Animate through each platform
  for (let i = 0; i < PLATFORMS.length; i++) {
    if (cancelled) return;
    setActive(i);  // Highlight current platform icon
    log(`[INSTAGRAM] Querying look-alike handles...`);
    await sleep(450);
    
    const fakeCount = 600 + Math.floor(Math.random() * 1400);  // Random "profiles analyzed"
    const hits = disc.filter(d => d.platform === PLATFORMS[i]);
    log(`[INSTAGRAM] ${fakeCount} profiles analyzed... ${hits.length} found`);
    
    for (const h of hits) {
      await sleep(250);
      setFound(f => [...f, h]);  // Dot appears on radar
      log(`  ↳ FLAG @${h.handle} · risk ${h.risk_score}`);
    }
  }
  
  // STEP 4: Save everything to the database (this is the real part)
  await supabase.from("threats").insert(disc);
  await supabase.from("scans").update({
    finished_at: new Date().toISOString(),
    profiles_analyzed: total,
    threats_found: disc.length,
  }).eq("id", scan.id);
  
  setDone(true);
  onDone();  // Tell AppShell to refresh data

  // Cleanup: if component unmounts mid-animation, stop everything
  return () => { cancelled = true; };
}, [open, brand?.id]);
```

---

## File 5: `src/lib/ai.functions.ts` — The AI Endpoint

**Job:** A server function (runs on the server, not browser) that sends a threat's details to GPT-6-astra and returns a structured scam analysis.

**Why "server function"?** The AI API key (`LOVABLE_API_KEY`) must stay secret. If this code ran in the browser, any user could open DevTools and steal the key. Running it on the server keeps it hidden.

```typescript
export const analyzeScam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])  // Must be logged in
  .validator(z.object({              // Validate input before processing
    brand: z.string().max(120),
    handle: z.string().max(80),
    bio: z.string().max(2000),
    context: z.string().max(500).optional(),
  }))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured for this workspace.");
    
    // Build the AI request
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",          // Faster + cheaper
        response_format: {                 // Force the model to return valid JSON
          type: "json_schema",
          json_schema: {
            name: "ScamAnalysis",
            schema: {
              type: "object",
              properties: {
                scam_probability: { type: "number" },    // 0.0 to 1.0
                indicators: { type: "array", items: { type: "string" } },
                scam_phrases: { type: "array", items: { type: "string" } },
                explanation: { type: "string" },
              },
              required: ["scam_probability", "indicators", "scam_phrases", "explanation"],
            },
          },
        },
        messages: [
          { role: "system", content: "You are a brand-protection fraud analyst. Assess whether a social account or app impersonates the brand to scam customers..." },
          { role: "user", content: `Brand: ${data.brand}\nAccount/App: ${data.handle}\nText: ${data.bio}\n${data.context ?? ""}` },
        ],
      }),
    });
    
    // Handle errors
    if (response.status === 429) throw new Error("AI is busy right now, try again in a moment.");
    if (response.status === 402) throw new Error("AI credits are used up for this workspace.");
    if (!response.ok) throw new Error("AI analysis failed.");
    
    // Parse and return the JSON result
    const json = await response.json();
    const result = JSON.parse(json.choices[0].message.content);
    return { ...result, source: "ai" };
  });
```

---

## File 6: `src/lib/reports.ts` — The Legal Writer

**Job:** Assembles a formal takedown complaint from all available evidence and saves it to the database.

```typescript
export async function createTakedownReport(brand: Brand, item: ReportItem) {
  const t = item.kind === "threat" ? item.t : null;
  const platform = t ? t.platform : item.a.store;
  
  // Build the formal letter text
  const letter = `To the ${platform} Trust & Safety Team,

I am writing on behalf of ${brand.name} to formally report the account "${t?.handle}",
which we believe impersonates our brand to defraud customers.

${brand.name} is the official operator of:
• Instagram: @${brand.handles?.Instagram ?? "N/A"}
• Domains: ${brand.domains?.join(", ")}

The reported account demonstrates the following impersonation indicators:
• Handle similarity: ${t?.signals?.handle ?? 0}% match
• Risk score: ${t?.risk_score}/100 (${t?.severity})
• AI analysis: ${t?.ai_analysis?.explanation ?? "Not available"}

We request immediate removal of this account and any associated content.

Sincerely,
${brand.name} Brand Protection Team`;

  const content = {
    target: t ? `@${t.handle}` : item.a.title,
    platform,
    letter,
    report_link: PLATFORM_REPORT_LINKS[platform] ?? "",
    brand: { name: brand.name, domains: brand.domains, phones: brand.phones },
    evidence: t ? { handle: t.handle, bio: t.bio, followers: t.followers,
                    risk_score: t.risk_score, signals: t.signals, ai: t.ai_analysis } : null,
  };
  
  // Save to database
  const { data: report } = await supabase
    .from("takedown_reports")
    .insert({ brand_id: brand.id, threat_id: t?.id, title: `Takedown: @${t?.handle}`,
              platform, status: "Draft", content })
    .select().single();
  
  // Update the threat's status
  if (t) {
    await supabase.from("threats").update({ status: "Takedown Requested" }).eq("id", t.id);
  }
  
  return report;
}
```

---

## File 7: `src/routes/_authenticated/route.tsx` — The Security Guard

**Job:** Sits at the entrance of all protected pages. Checks two things: (1) Is the user logged in? (2) Do they have a brand registered?

```typescript
// Two components work together as a pipeline:

function AuthLayout() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });  // Not logged in → go to login page
    }
  }, [loading, session]);
  
  if (loading || !session) return <LoadingScreen />;
  return <BrandGate />;  // Logged in → next check
}

function BrandGate() {
  const { brand, isLoading } = useBrand();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && !brand) {
      navigate({ to: "/onboarding" });  // No brand → setup wizard
    }
  }, [isLoading, brand]);
  
  if (isLoading || !brand) return <LoadingScreen />;
  return <AppShell><Outlet /></AppShell>;  // All good → show the page
}
```

---

## File 8: `src/components/sx/primitives.tsx` — The Building Blocks

**Job:** Reusable UI components used across dozens of pages.

### `RiskGauge` — The Semicircular Danger Meter

```typescript
// Draws a semicircle arc from left (green) to right (red)
// The "needle" position corresponds to the risk score

const r = size / 2 - 16;        // Radius of the arc
const angle = Math.PI * (1 - v / 100);  // Convert 0-100 score to 0-π angle
const ex = cx + r * Math.cos(angle);    // X coordinate of needle tip
const ey = cy - r * Math.sin(angle);    // Y coordinate of needle tip

// The arc is drawn with a gradient (green → yellow → orange → red):
<linearGradient id="gauge-grad">
  <stop offset="0%" stopColor="var(--low)" />     // green
  <stop offset="45%" stopColor="var(--medium)" />  // yellow
  <stop offset="70%" stopColor="var(--high)" />    // orange
  <stop offset="100%" stopColor="var(--critical)" />// red
</linearGradient>

// Score number in the center:
<text x={cx} y={cy - 8}>{Math.round(v)}</text>
<text x={cx} y={cy + 16}>RISK / 100</text>
```

The needle animates from 0 to the actual score using Framer Motion's `animate()` function over 1.4 seconds.

### `CountUp` — Animated Numbers

```typescript
// Animates a number from 0 to the target value
useEffect(() => {
  const ctrl = animate(0, value, {
    duration: 1.2,
    ease: "easeOut",
    onUpdate: (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
    },
  });
  return () => ctrl.stop();
}, [value]);
```

Used in the dashboard KPI cards — when you load the dashboard, the numbers count up from 0.

### `SeverityBadge` — Color-Coded Labels

```typescript
const SEV = {
  critical: "bg-critical/15 text-critical border-critical/30 glow-critical",
  high:     "bg-high/15 text-high border-high/30",
  medium:   "bg-medium/15 text-medium border-medium/30",
  low:      "bg-low/15 text-low border-low/30",
};
// Critical badges have a glowing pulse animation (animate-ping-dot)
```

---

## File 9: `src/styles.css` — The Design System

**Job:** Defines all the colors, fonts, animations, and utility classes used throughout the app.

**The color palette** (defined as CSS custom properties, i.e., CSS variables):

```css
:root {
  --background: oklch(0.13 0.012 265);   /* Near-black dark background */
  --primary: oklch(0.82 0.13 210);       /* Cyan — #22D3EE — main accent color */
  --violet: oklch(0.6 0.22 293);         /* Purple — used for AI features */
  --critical: oklch(0.66 0.23 15);       /* Red — #FF3B5C */
  --high: oklch(0.73 0.18 50);           /* Orange — #FF8A3D */
  --medium: oklch(0.86 0.17 95);         /* Yellow — #FACC15 */
  --low: oklch(0.79 0.15 163);           /* Green — #34D399 */
}
```

**Why OKLCH colors?** OKLCH is a modern CSS color space where the numbers are perceptually uniform — changing the "lightness" value actually looks consistently lighter/darker to the human eye.

**Custom utility classes** (defined with `@utility`):

```css
@utility panel {
  /* Semi-transparent card with a border */
  background: color-mix(in oklab, var(--surface) 88%, transparent);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
}

@utility glass {
  /* Frosted glass effect */
  background: color-mix(in oklab, var(--surface) 70%, transparent);
  backdrop-filter: blur(16px);
}

@utility cyber-bg {
  /* The cyberpunk grid background used on the landing page */
  background-image:
    radial-gradient(ellipse 60% 40% at 50% -10%, ...),  /* Cyan glow at top */
    radial-gradient(ellipse 40% 30% at 90% 10%, ...),    /* Violet glow top-right */
    linear-gradient(to right, oklch(1 0 0 / 3%) 1px, ...),  /* Vertical grid lines */
    linear-gradient(to bottom, oklch(1 0 0 / 3%) 1px, ...); /* Horizontal grid lines */
  animation: glow-drift 18s ease-in-out infinite alternate;  /* Slowly drifts */
}
```

---

## File 10: `src/integrations/supabase/auth-middleware.ts` — The Server Bouncer

**Job:** Runs before any server function. Extracts the JWT from the request header and validates it with Supabase. If invalid → throws "Unauthorized".

```typescript
export const requireSupabaseAuth = createMiddleware({ type: "function" })
  .server(async ({ next }) => {
    
    const request = getRequest();
    const authHeader = request.headers.get("authorization");
    
    // Check 1: Is there an Authorization header?
    if (!authHeader) throw new Error("Unauthorized: No authorization header");
    
    // Check 2: Does it start with "Bearer "?
    if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized: Only Bearer tokens supported");
    
    const token = authHeader.replace("Bearer ", "");
    
    // Check 3: Is it a valid JWT (three parts separated by dots)?
    if (token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");
    
    // Check 4: Validate the token with Supabase (verifies the cryptographic signature)
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) throw new Error("Unauthorized: Invalid token");
    
    // Pass the verified user info to the handler
    return next({ context: { supabase, userId: data.claims.sub } });
  });
```

**How the JWT gets attached to server function calls:**

```typescript
// src/integrations/supabase/auth-attacher.ts
// This runs automatically before every server function call from the browser:
const { data } = await supabase.auth.getSession();
if (data.session?.access_token) {
  // Inject "Authorization: Bearer <jwt>" header into the server function request
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
}
```

---

## Continue Reading

- **[DOCS_4_DATABASE_AUTH_AI.md](DOCS_4_DATABASE_AUTH_AI.md)** — Database schema, full auth flow, AI integration details
- **[DOCS_5_SETUP_AND_REFERENCE.md](DOCS_5_SETUP_AND_REFERENCE.md)** — How to run the project, evaluation Q&A, glossary
