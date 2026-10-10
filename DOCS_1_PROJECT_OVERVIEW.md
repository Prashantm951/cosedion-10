# SentinelX — Part 1: Project Overview & Technology Stack

> Read this first. This file answers: **What is this project? Who built it? What does it do?**

---

## ⚡ 30-Second Summary

**SentinelX is a brand-protection dashboard.**

Imagine you run a popular UPI payment app called NovaPay. Scammers create fake Instagram
accounts called `novapay_support` or `n0vapаy.care` and trick your customers into sharing OTPs
or paying fake fees. SentinelX finds those fake accounts, gives each one a danger score (0–100),
explains *why* it is dangerous using AI, and writes the legal takedown letter for you — all
from one web dashboard.

---

## 📋 The Real-World Problem

| Problem | Example |
|---|---|
| Scammers copy your brand name | `novapay_support` on Instagram |
| They use look-alike characters | Cyrillic `а` looks identical to Latin `a` |
| They create fake app listings | "NovaPay KYC Update" on Play Store (not official) |
| Finding them manually is impossible | 5 platforms × thousands of accounts |
| Writing a takedown request takes hours | Legal letter + evidence + platform links |

SentinelX automates the entire pipeline: **Detect → Score → Report**.

---

## 👥 Who Uses It

| User Type | Why They Use It |
|---|---|
| **Brand protection analysts** | Investigate and triage individual threats |
| **Digital marketing teams** | Monitor brand impersonation across social media |
| **Legal / compliance teams** | Generate formal evidence-backed takedown letters |
| **Fintech / consumer brand companies** | Protect customers from scam accounts |

---

## 🗺️ How a User Interacts With the App (User Flow)

```
Open app → Sign up with email+password
         → Register your brand (name, logo, handles, apps, domains)
         → Click "Run Scan"
         → View dashboard (threat counts, charts, live ticker)
         → Click a threat to see AI analysis + risk score
         → Click "Generate Takedown Report"
         → Print / submit the legal complaint
```

---

## 🏆 What Makes It Useful

1. **Homoglyph detection** — Catches `n0vapаy` (with Cyrillic `а`) that looks identical to `novapay`
2. **AI scam-content analysis** — Reads the bio and flags "Refund lure", "WhatsApp number", "KYC pretext"
3. **One-click takedown reports** — Pre-filled legal letter + direct link to platform's report form
4. **Threat graph** — Network visualization showing your brand surrounded by all impostor accounts
5. **Multi-platform coverage** — Instagram, X (Twitter), Facebook, Telegram, YouTube, Play Store

---

## 🖥️ Technology Stack — Everything That Is Actually Used

### Frontend (What You See in the Browser)

| Technology | What It Does | Where Used |
|---|---|---|
| **React 19** | Builds the UI from reusable components (like LEGO bricks). Every page, chart, and button is a React component. | Every `.tsx` file in `src/` |
| **TypeScript** | JavaScript with types — forces you to say "this is a number" so errors are caught before you run the code. | All source files use `.tsx`/`.ts` |
| **TanStack Router** | Shows the right page for each URL (`/dashboard` → dashboard page, `/threats` → threats page). Uses file-based routing — the file name **is** the URL. | Every file in `src/routes/` |
| **TanStack Query** | Fetches data from the database and caches it so the UI is instant on second visits. | `useThreats()`, `useApps()`, `useReports()` in `src/lib/data.ts` |
| **TanStack Start** | Full-stack framework — lets you write server code (that runs on a Node server) right alongside your React components. | `analyzeScam` server function in `src/lib/ai.functions.ts` |
| **Tailwind CSS v4** | Style elements by adding small class names in JSX: `className="flex gap-3 text-sm"` instead of writing a separate CSS file. | All component files |
| **Framer Motion** | Animation library — powers the radar sweep, card fade-ins, and risk gauge animation. | `ScanOverlay`, `ThreatGraph`, `primitives.tsx` |
| **Recharts** | Chart library — area chart, donut chart, bar chart on the dashboard. | `dashboard.tsx` |
| **Radix UI** | Accessible headless components (dropdowns, dialogs, checkboxes). They are unstyled; Tailwind adds the look. | All 46 files in `src/components/ui/` |
| **Lucide React** | 500+ SVG icons: the radar icon, warning icons, platform icons. | Throughout the app |
| **Sonner** | The small pop-up "toast" notifications ("Settings saved", "AI analysis updated"). | Every route that calls the API |
| **Zod** | Validates form inputs — e.g., ensures email is a real email before sending to the server. | `auth.tsx`, `ai.functions.ts` |

### Backend / Server

| Technology | What It Does | Where Used |
|---|---|---|
| **TanStack Start server functions** | Functions marked with `createServerFn` run on the server, not in the browser. This keeps secret API keys safe. | `src/lib/ai.functions.ts` — the `analyzeScam` function |
| **Nitro** | The underlying HTTP server runtime that runs server functions and serves SSR (Server-Side Rendering) pages. | Configured in `vite.config.ts` via Lovable's config |
| **Vite** | Build tool and dev server. `npm run dev` starts Vite. | `vite.config.ts` |

### Database

| Technology | What It Does | Where Used |
|---|---|---|
| **Supabase** | Hosted PostgreSQL database + built-in authentication + auto-generated REST API. Think "Firebase but with a real SQL database". | `src/integrations/supabase/client.ts` — used on every data fetch |
| **PostgreSQL** | The actual database engine. Stores data in tables with rows and columns. | 6 tables: `brands`, `threats`, `suspicious_apps`, `takedown_reports`, `analyst_notes`, `scans` |
| **Row-Level Security (RLS)** | A database-level rule: you can only read/edit rows where `user_id` matches your login. Even a hacker with the API URL can't see another user's data. | Applied in `drizzle/migrations/0000_migration.sql` |
| **Drizzle ORM** | TypeScript ORM — installed and used to generate the migration file. Not used for runtime queries. | `drizzle/migrations/0000_migration.sql` |

### Authentication

| Technology | What It Does |
|---|---|
| **Supabase Auth** | Email + password signup/login. Returns a JWT (a signed token proving who you are). Stored in `localStorage` and auto-refreshed. |

### AI & External Services

| Service | What It Does | Where |
|---|---|---|
| **Lovable AI Gateway** | Proxy URL for AI calls: `https://ai.gateway.lovable.dev`. Routes to the actual AI model. | `src/lib/ai.functions.ts` |
| **GPT-6-astra (via OpenAI-compatible API)** | The actual language model that analyzes scam account bios. | `src/lib/ai.functions.ts` — model: `openai/gpt-6-astra` |
| **Lovable** | The AI-powered no-code platform that generated this entire codebase. Also hosts the live app. | Live at `https://senttinelx.lovable.app` |
| **Cloudflare Workers** | Production deployment target — Nitro builds to Cloudflare. | Configured via `@lovable.dev/vite-tanstack-config` |

---

## 📁 Files at a Glance

```
senttinelx/
├── .env                     ← Supabase URL + keys (NOT secret keys — safe publishable ones)
├── package.json             ← Dependencies + run scripts (npm run dev, test, build)
├── vite.config.ts           ← Build config (Vite + Nitro + TanStack)
├── drizzle/migrations/
│   └── 0000_migration.sql   ← Creates all 6 database tables + security policies
└── src/
    ├── styles.css           ← Global design tokens (colors, fonts, animations)
    ├── routes/              ← Every file here = one URL page
    ├── components/sx/       ← Custom SentinelX UI components
    ├── components/ui/       ← Standard Radix/shadcn primitives
    ├── lib/                 ← Business logic (scoring, AI, reports, data hooks)
    └── integrations/        ← Supabase client + auth middleware
```

---

## 🔗 Continue Reading

- **[DOCS_2_FEATURES.md](DOCS_2_FEATURES.md)** — Every feature explained with its implementation details
- **[DOCS_3_CODE_DEEP_DIVE.md](DOCS_3_CODE_DEEP_DIVE.md)** — Key files explained line by line
- **[DOCS_4_DATABASE_AUTH_AI.md](DOCS_4_DATABASE_AUTH_AI.md)** — Database schema, authentication, AI integration
- **[DOCS_5_SETUP_AND_REFERENCE.md](DOCS_5_SETUP_AND_REFERENCE.md)** — How to run the project, Q&A, glossary
