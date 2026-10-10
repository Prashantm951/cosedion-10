# SentinelX — Part 2: Complete Feature Inventory

> This file answers: **What does every feature do, and how is it actually built?**
> Each feature is labeled: ✅ Fully Implemented | ⚠️ Partially Implemented | ❌ Not Implemented

---

## Feature 1: User Authentication ✅ Fully Implemented

### What It Does
Lets users create an account and sign in with email + password.

### Why It Exists
Every brand's data is private. Users should only ever see their own threats and reports.

### How to Access It
Go to `/auth`. Enter email and password. Click "Create account" or "Sign in".

### How It Is Built (Step by Step)

**File:** `src/routes/auth.tsx`

```
User fills form → clicks submit
→ submit() function runs
→ if mode === "signup":
    supabase.auth.signUp({ email, password, options: { emailRedirectTo: ... } })
    if no session returned → show "Check your inbox" toast
→ if mode === "signin":
    supabase.auth.signInWithPassword({ email, password })
→ on success → navigate({ to: "/dashboard" })
→ on error → toast.error(err.message)
```

**Key implementation choices:**
- `mode` (signin vs signup) is read from the URL search param: `/auth?mode=signup`
- Zod validates search params: `z.object({ mode: z.enum(["signin", "signup"]).optional() })`
- `busy` state disables the button while the request is in flight (prevents double-submit)
- Password minimum length: 6 characters (enforced by `minLength={6}` on the input)

**What is stored:** Supabase manages the session internally. A JWT (JSON Web Token — a signed
string that proves your identity) is saved in `localStorage` and auto-refreshes before expiry.

### Limitations
- No "Forgot password" / password reset flow in the UI
- No Google / GitHub / social login
- No email verification enforcement (code only checks if a session came back)

---

## Feature 2: Protected Route Guard ✅ Fully Implemented

### What It Does
Prevents unauthenticated users from seeing any dashboard page. Also redirects new users
(with no brand registered) to the onboarding wizard.

### File: `src/routes/_authenticated/route.tsx`

This is the most important invisible feature. **Every URL under `/_authenticated/`** goes
through this component first.

```
User navigates to /dashboard
→ AuthLayout runs
  → useSession() checks if Supabase has an active session
  → if no session → navigate({ to: "/auth" })
  → if session exists → BrandGate runs
    → useBrand() checks if user has any registered brand
    → if no brand → navigate({ to: "/onboarding" })
    → if brand exists → render <AppShell> with the actual page inside
```

**Why two separate components?**
`AuthLayout` checks login. `BrandGate` checks brand registration. Separating them makes each
condition clear and allows different loading skeletons.

---

## Feature 3: Brand Onboarding Wizard ✅ Fully Implemented

### What It Does
A 5-step form that registers your brand with SentinelX. This is the "ground truth" —
everything SentinelX compares fake accounts against.

### File: `src/routes/onboarding.tsx`

**5 Steps:**

| Step | What You Enter | Stored As |
|---|---|---|
| 0 — Identity | Brand name + keywords/aliases | `name`, `keywords[]` |
| 1 — Logo | Upload a PNG/JPG logo | `logo_url` (base64 data URL) |
| 2 — Social handles | @handle per platform | `handles` (JSON: `{"Instagram": "novapay"}`) |
| 3 — Apps | Play Store / App Store package IDs | `app_ids[]` |
| 4 — Domains & phones | Official domain + support phone | `domains[]`, `phones[]` |

**Logo upload implementation:**
```typescript
async function resizeToDataUrl(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  ctx.drawImage(img, ...);
  return canvas.toDataURL("image/png");  // Returns base64 string
}
```
The logo is resized to 256×256 pixels in the browser and stored as a base64 text string
directly in the `brands.logo_url` column. ⚠️ This is a limitation — large logos bloat the DB.

**"Use NovaPay Demo" button:**
```typescript
async function seedDemo() {
  const { data: brand } = await supabase.from("brands").insert({ ...NOVAPAY_BRAND, ... });
  await supabase.from("threats").insert(demoThreats(brand.id, uid, logo));
  await supabase.from("suspicious_apps").insert(demoApps(brand.id, uid, logo));
  navigate({ to: "/dashboard" });
}
```
This inserts 30 pre-built threats + 6 fake apps from `src/lib/demo-data.ts` so evaluators
can see a populated dashboard immediately without running a real scan.

---

## Feature 4: Threat Detection — "Run Scan" ⚠️ Partially Implemented (Simulation)

### What It Does
Opens an animated radar overlay that "scans" 5 social platforms and "discovers" impostor
accounts. Results are saved to the database.

### File: `src/components/sx/ScanOverlay.tsx`

### ⚠️ CRITICAL: This Is a Demo Simulation

The scan does **NOT** make real HTTP requests to Instagram, Facebook, X, Telegram, YouTube,
or the Play Store. There is no web scraping. There is no platform API integration.

### How It Actually Works

```typescript
// ScanOverlay.tsx — the actual implementation
const disc = scanDiscoveries(brand.id, uid, brand.logo_url, existingHandles, 3);
// disc = 3-5 pre-built fake threats from SCAN_POOL in demo-data.ts

for (let i = 0; i < PLATFORMS.length; i++) {
  log(`[INSTAGRAM] Querying look-alike handles...`);
  await sleep(450);  // Wait 450ms for animation realism
  const n = 600 + Math.floor(Math.random() * 1400);  // Random number (fake)
  log(`[INSTAGRAM] ${n} profiles analyzed... 2 impostors found`);
  // Show the pre-built "discoveries" for this platform
  for (const h of disc.filter(d => d.platform === platform)) {
    await sleep(250);
    setFound(f => [...f, h]);  // Show threat card appearing on radar
  }
}
// After the animation loop:
await supabase.from("threats").insert(disc);  // This part IS real — saves to DB
await supabase.from("scans").update({ finished_at: ..., profiles_analyzed: total, ... });
```

**What is real:**
- The animated radar UI
- The log output on the right side
- The threat cards appearing
- Saving the discovered threats to the database
- The scan record in the `scans` table

**What is simulated:**
- The "1,240 profiles analyzed" number (random integer)
- The discovered accounts themselves (from `SCAN_POOL` — 6 hardcoded records)

### Where Does `SCAN_POOL` Come From?

In `src/lib/demo-data.ts`:
```typescript
const SCAN_POOL = [
  { platform: "Instagram", handle: "novapay_rnoney_back", bio: "Money back guarantee! DM for refund...", ... },
  { platform: "X", handle: "NovaPay_Care_Desk", bio: "Official care desk. Verify KYC at bit.ly/...", ... },
  // 4 more entries
];
```
Each entry is scored using the real scoring algorithm (not fake numbers).

---

## Feature 5: Threat Scoring Algorithm ✅ Fully Implemented

### What It Does
Calculates a risk score (0–100) for every threat. This is the mathematical core of SentinelX.

### File: `src/lib/scoring.ts`

### The Four Signals

```
Final Score = (Handle × 30%) + (Logo × 25%) + (AI × 30%) + (Account × 15%)
```

**Signal 1: Handle Similarity (30% weight)**

Detects fake handles using three techniques:

1. **Homoglyph normalization** — Converts look-alike characters to their real equivalents:
   ```typescript
   const HOMOGLYPHS = {
     "0": "o",  "1": "l",  "3": "e",  "а": "a",  // Cyrillic а → Latin a
     "е": "e",  "о": "o",  "р": "p",  "с": "c",  // More Cyrillic
   };
   function normalize("n0vapаy_support") {
     // → "novapaysupport"  (0→o, Cyrillic а→a, strip non-alphanumeric)
   }
   ```

2. **Levenshtein edit distance** — Counts how many character changes turn one string into another:
   ```
   "novapaysupport" vs "novapay"
   → 6 extra characters → similarity = 1 - 6/14 = 57%
   But "novapay" IS contained in "novapaysupport" → score boosted to 95%
   ```

3. **Keyword flags** — Suspicious suffixes add bonus points:
   ```typescript
   const SUSPICIOUS_KEYWORDS = ["support", "care", "help", "official", "refund",
                                  "desk", "team", "india", "verify", "kyc", "helpline"];
   // "support" found in handle → +6 points
   ```

**Signal 2: Logo Similarity (25% weight)**

In demo data, this is a hardcoded number (e.g., `logo: 94`).
In a real production system, this would require image hashing/comparison (e.g., perceptual hashing).
**This signal is hardcoded in the demo — not computed from real image analysis.**

**Signal 3: AI Scam Content (30% weight)**

Two modes:
- **Demo/heuristic:** `heuristicScam(bio)` uses regex to detect scam phrases locally (no API call)
- **Live:** `analyzeScam()` server function calls GPT-6-astra (requires `LOVABLE_API_KEY`)

```typescript
// heuristicScam — the local fallback
const SCAM_PATTERNS = [
  { re: /dm (us |me )?for (a )?refund/gi, label: "Refund lure" },
  { re: /whats?app[^.\n]*?\+?\d[\d\s-]{8,}/gi, label: "WhatsApp number" },
  { re: /kyc/gi, label: "KYC pretext" },
  { re: /(urgent|blocked|suspended)/gi, label: "Urgency" },
  { re: /(bit\.ly|tinyurl|t\.me)\/\S+/gi, label: "Shortened link" },
  // 3 more patterns
];
// scam_probability = 0.15 + (matched_patterns × 0.16), capped at 0.98
```

**Signal 4: Account Signals (15% weight)**

```typescript
function accountSignalScore({ ageDays, followers, verified }) {
  let score = 0;
  if (ageDays < 30)  score += 45;   // New account = very suspicious
  if (ageDays < 180) score += 25;   // Young account = suspicious
  if (followers < 500)  score += 30; // Low followers = suspicious
  if (!verified) score += 25;       // Unverified = suspicious
  return Math.min(100, score);
}
```

**Severity Levels:**
| Score | Severity | Action |
|---|---|---|
| 80–100 | 🔴 Critical | Immediate takedown |
| 60–79 | 🟠 High | Urgent review |
| 40–59 | 🟡 Medium | Monitor |
| 0–39 | 🟢 Low | Low priority |

---

## Feature 6: Dashboard ✅ Fully Implemented

### File: `src/routes/_authenticated/dashboard.tsx`

**What is on the dashboard:**

1. **Live Ticker** — A scrolling marquee of recent threats (repeats first 12 threats):
   ```jsx
   <div className="animate-ticker">
     {[...t.slice(0, 12), ...t.slice(0, 12)].map(x => (
       <span>@{x.handle} {x.risk_score}</span>
     ))}
   </div>
   ```

2. **KPI Cards** (5 cards with sparklines and count-up animations):
   - Total threats
   - Critical threats
   - Impersonating accounts
   - Suspicious apps
   - Takedowns filed

3. **Charts** (using Recharts library):
   - Area chart: threats over last 14 days (computed from `detected_at` dates)
   - Donut chart: severity breakdown (critical/high/medium/low counts)
   - Horizontal bar chart: threats per platform

4. **Mini Threat Graph** — Links to `/graph` for the full view

5. **Latest Critical Threats Table** — Top 6 critical threats, clickable rows

**How chart data is calculated:**
```typescript
const stats = useMemo(() => {
  const day = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  const series = Array.from({ length: 14 }, (_, i) => {
    const d = 13 - i;
    return {
      day: new Date(Date.now() - d * 86400000).toLocaleDateString(),
      count: t.filter(x => day(x.detected_at) === d).length,
      critical: t.filter(x => day(x.detected_at) === d && x.severity === "critical").length,
    };
  });
  return { series, byPlatform: PLATFORMS.map(p => ({ name: p, value: t.filter(x => x.platform === p).length })), ... };
}, [t]);  // Recomputed whenever threats array changes
```

---

## Feature 7: Threats List with Filters ✅ Fully Implemented

### File: `src/routes/_authenticated/threats.index.tsx`

**Filtering (all done in the browser, not the database):**
```typescript
const rows = useMemo(() => {
  return (q.data ?? [])
    .filter(t => platform === "all" || t.platform === platform)
    .filter(t => type === "all" || t.type === type)
    .filter(t => status === "all" || t.status === status)
    .filter(t => sev === "all" || t.severity === sev)
    .filter(t => !search || t.handle.includes(search) || t.bio?.includes(search))
    .sort((a, b) => (a[sort.k] > b[sort.k] ? 1 : -1) * sort.d);
}, [q.data, search, platform, type, status, sev, sort]);
```

All threats are loaded once from the DB (`useThreats(brandId)`), then filtered/sorted in
memory. This is fast for hundreds of threats but would need server-side pagination for thousands.

**Bulk Status Update:**
```typescript
async function bulk(newStatus: string) {
  const ids = [...sel];  // Set of selected threat IDs
  await supabase.from("threats").update({ status: newStatus }).in("id", ids);
  invalidate("threats");  // Tell TanStack Query to re-fetch
}
```

**Threat statuses flow:**
```
New → Under Review → Confirmed → Takedown Requested → Resolved
                                                     → False Positive
```

---

## Feature 8: Threat Detail Page ✅ Fully Implemented

### File: `src/routes/_authenticated/threats.$id.tsx`

This is the richest page. It has:

**1. Side-by-side Profile Comparison:**
```
Left card (red border): Fake account
  - Handle with homoglyph characters highlighted in red
  - "Suspicious" label
  - Low followers, new account, unverified — flagged in red

Right card (green border): Official brand account
  - Official handle from brand settings
  - "Official" label  
  - Verified, high follower count
```

**2. Risk Gauge (SVG semicircle):**
```typescript
// In primitives.tsx — RiskGauge component
// Draws a semicircular arc from green → yellow → orange → red
// The needle position = (score / 100) × 180 degrees
// Animates from 0 to score using Framer Motion's animate()
```

**3. Signal Breakdown (4 progress bars):**
```
Handle similarity  ×0.30  [████████░░] 80   "85% match · homoglyphs"
Logo similarity    ×0.25  [█████████░] 94   "94% visual match"
AI scam-content    ×0.30  [███████░░░] 72   "p=0.72"
Account signals    ×0.15  [████████░░] 85   "12d old · 2140 followers · unverified"
```

**4. AI Analysis Panel** (`src/components/sx/AIPanel.tsx`):
- Shows `scam_probability` as a percentage
- Streams the `explanation` text with a typewriter animation
- Highlights scam phrases found in the bio
- "Re-analyze" button triggers the real AI call

**5. Status Management:**
```typescript
async function setStatus(st: string) {
  await supabase.from("threats").update({ status: st }).eq("id", id);
  refresh();
}
```

**6. Analyst Notes:**
```typescript
async function addNote() {
  await supabase.from("analyst_notes").insert({
    threat_id: id,
    body: note.trim(),
    user_id: currentUser.id,
  });
}
```

---

## Feature 9: AI Re-Analysis ✅ Implemented (Requires API Key)

### File: `src/lib/ai.functions.ts`

When you click "Re-analyze" on a threat:

```typescript
// threats.$id.tsx
const analyze = useServerFn(analyzeScam);

async function rerun() {
  const ai = await analyze({
    data: {
      brand: brand.name,
      handle: threat.handle,
      bio: threat.bio,
      context: `Display name: ${threat.display_name}. Platform: ${threat.platform}.`,
    }
  });
  const aiScore = Math.round(ai.scam_probability * 100);
  const newScore = finalScore({ handle: s.handle, logo: s.logo, ai: aiScore, account: s.account });
  await supabase.from("threats").update({
    ai_analysis: ai,
    risk_score: newScore,
    severity: severityOf(newScore),
    signals: { ...s, ai: aiScore },
  }).eq("id", id);
}
```

**The server function sends this to GPT-6-astra:**
```
System: "You are a brand-protection fraud analyst..."
User:   "Brand: NovaPay
         Account/App: novapay_support
         Text: Failed transaction? DM for refund. WhatsApp +91 98765 43210 for urgent KYC.
         Display name: NovaPay Support. Platform: Instagram. Followers: 2140."
```

**The AI responds with structured JSON:**
```json
{
  "scam_probability": 0.94,
  "indicators": ["Refund lure", "WhatsApp number", "KYC pretext", "Urgency"],
  "scam_phrases": ["DM for refund", "WhatsApp +91 98765 43210", "urgent KYC"],
  "explanation": "This account uses refund lures and posts a WhatsApp number..."
}
```

---

## Feature 10: Takedown Report Generation ✅ Fully Implemented

### File: `src/lib/reports.ts`

When you click "Generate Takedown Report":

```typescript
export async function createTakedownReport(brand, item) {
  const platform = item.kind === "threat" ? item.t.platform : item.a.store;
  const ai = item.t.ai_analysis;

  const letter = `To the ${platform} Trust & Safety Team,

I am writing on behalf of ${brand.name} to formally report the account @${item.t.handle},
which impersonates our brand...

Summary of evidence: ${ai?.explanation ?? "See attached signals."}

We request that you remove this account immediately...

Sincerely,
Brand Protection Team, ${brand.name}`;

  const content = {
    target: `@${item.t.handle}`,
    platform,
    letter,         // The formal complaint text
    report_link: PLATFORM_REPORT_LINKS[platform],  // Direct link to platform's report form
    brand: { name, domains, phones, keywords },
    evidence: { handle, bio, followers, risk_score, signals, ai },
  };

  await supabase.from("takedown_reports").insert({ ..., status: "Draft", content });
  await supabase.from("threats").update({ status: "Takedown Requested" }).eq("id", item.t.id);
}
```

**Platform report links (real URLs):**
```typescript
const PLATFORM_REPORT_LINKS = {
  Instagram: "https://help.instagram.com/contact/636276399721841",
  X: "https://help.x.com/forms/impersonation",
  Facebook: "https://www.facebook.com/help/contact/295309487309948",
  Telegram: "mailto:abuse@telegram.org",
  YouTube: "https://support.google.com/youtube/answer/2801947",
  "Play Store": "https://support.google.com/googleplay/android-developer/contact/takedown",
};
```

**Report page features:**
- Full article layout with sections: Complainant brand, Evidence, Similarity metrics, AI reasoning, Formal complaint
- Print button: `window.print()` → browser's print-to-PDF
- "Open [Platform] report form" → opens official report URL in new tab
- "Mark submitted" → changes status to "Submitted" in the database

---

## Feature 11: Threat Graph ✅ Fully Implemented

### File: `src/components/sx/ThreatGraph.tsx`

A hand-coded SVG network visualization (not using a graph library):

```
Center: Brand logo in a circle
Around it: Platform cluster nodes (Instagram, X, Facebook, etc.)
Around each cluster: Threat nodes (one per detected threat)
  - Node size = risk score (bigger = riskier)
  - Node color = severity (red=critical, orange=high, yellow=medium, green=low)
  - Lines connect threats to their platform cluster
  - Critical nodes have a glowing drop-shadow filter
```

**Math behind node placement:**
```typescript
clusters.map((p, i) => {
  const angle = (i / numPlatforms) * 2π - π/2;  // Evenly spaced in a circle
  return { x: cx + cos(angle) * 230, y: cy + sin(angle) * 210 };
});

// Each threat is placed near its platform cluster:
const ring = 60 + (i % 2) * 38;  // Two rings of nodes
const a = cluster.angle + ((i - arr.length/2) / arr.length) * 2.4;
return { x: cluster.x + cos(a) * ring, y: cluster.y + sin(a) * ring };
```

Click a node → `onSelect(node.id)` → navigate to threat detail page.

---

## Feature 12: Suspicious Apps Grid ✅ Implemented (Demo Data Only)

### File: `src/routes/_authenticated/apps.tsx`

Shows 6 pre-built fake Play Store apps impersonating the brand.

**What each card shows:**
- App title + package ID
- Developer name (flagged red if it doesn't match the official developer)
- Risk score + severity
- Install count + star rating
- Permission tags (dangerous ones like `READ_SMS` highlighted in red)
- AI explanation of why it's suspicious

**Risky permissions flagged:**
```typescript
const RISKY_PERMISSIONS = [
  "READ_SMS", "RECEIVE_SMS", "SEND_SMS",
  "BIND_ACCESSIBILITY_SERVICE",  // Can control your phone
  "SYSTEM_ALERT_WINDOW",         // Can draw over other apps (phishing UI)
  "READ_CONTACTS", "READ_CALL_LOG",
  "REQUEST_INSTALL_PACKAGES",    // Can install more malware
];
```

Like threats, all data is from `demo-data.ts`. No real Play Store API exists.

---

## Feature 13: Command Palette ✅ Fully Implemented

### File: `src/components/sx/AppShell.tsx`

Press `⌘K` (Mac) or `Ctrl+K` (Windows) to open a search overlay.

**Implementation:**
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setCmd(c => !c);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

**What you can search:**
- All pages (Dashboard, Threats, Graph, Apps, Takedowns, Settings)
- All detected threats (by handle, display name, platform)
- Actions (Run Scan)

---

## Feature 14: Multi-Brand Support ✅ Fully Implemented

### File: `src/lib/data.ts`, `src/components/sx/AppShell.tsx`

One login → multiple brands.

```typescript
// Active brand is stored in localStorage
export function getActiveBrandId() {
  return localStorage.getItem("sentinelx.brand");
}
export function setActiveBrandId(id: string) {
  localStorage.setItem("sentinelx.brand", id);
}

// useBrand hook:
export function useBrand() {
  const q = useBrands();  // Fetch all brands for current user
  const [activeId, setActive] = useState(getActiveBrandId());
  const brand = q.data?.find(b => b.id === activeId) ?? q.data?.[0] ?? null;
  return { brand, brands: q.data, switchBrand: (id) => { setActiveBrandId(id); setActive(id); } };
}
```

The brand switcher dropdown is in the top bar of `AppShell.tsx`. Switching brand triggers
`invalidate("threats", "apps", "reports")` which re-fetches all data for the new brand.

---

## Feature 15: Notifications Bell ✅ Fully Implemented

### File: `src/components/sx/AppShell.tsx`

Shows unread critical threat count. "Seen" timestamp stored in `localStorage("sx.seen")`.

```typescript
const unread = (threats.data ?? []).filter(t =>
  t.severity === "critical" &&
  new Date(t.detected_at).getTime() > seenAt  // Newer than last-seen timestamp
);
// Badge shows unread.length
// On dropdown close: localStorage.setItem("sx.seen", String(Date.now()))
```

---

## Feature 16: Settings Page ✅ Fully Implemented

### File: `src/routes/_authenticated/settings.tsx`

Three sections:
1. **Brand profile** — Edit name, keywords, handles, app IDs, domains, phones
2. **Alert preferences** — Toggle email alerts for critical threats (preference saved; emails NOT sent)
3. **Team members** — Add/remove analyst emails

**Team management implementation:**
```typescript
// Team stored as JSON array in brands.team column — NOT real user accounts
const [f, setF] = useState({ team: [] as { email: string; role: string }[] });

// Adding a member:
const team = [...f.team, { email: invite, role: "Analyst" }];
await supabase.from("brands").update({ team }).eq("id", brand.id);
```

⚠️ Team members are stored as plain JSON. No invitation email is sent. They cannot log in.

---

## What Is NOT Implemented

| Feature | Status | Evidence |
|---|---|---|
| Real social media scanning | ❌ Simulation only | `SCAN_POOL` has 6 hardcoded records in `demo-data.ts` |
| Real Play Store scanning | ❌ Simulation only | `APPS` has 6 hardcoded records in `demo-data.ts` |
| Logo image comparison | ❌ Hardcoded numbers | `logo: 94` is a fixed number, not computed from real images |
| Email alerts | ❌ Preference stored, email not sent | No email-sending code exists anywhere |
| Team collaboration (real logins) | ❌ JSON-only storage | Team emails don't create accounts |
| Password reset | ❌ No UI for it | `auth.tsx` has no "Forgot password" link |

---

## Continue Reading

- **[DOCS_3_CODE_DEEP_DIVE.md](DOCS_3_CODE_DEEP_DIVE.md)** — How the key files work, with code walkthroughs
- **[DOCS_4_DATABASE_AUTH_AI.md](DOCS_4_DATABASE_AUTH_AI.md)** — Database schema, auth flow, AI details
