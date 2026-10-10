# SentinelX — Part 5: Setup, Hackathon Guide, and Reference

> This file answers: **How do I run this code? How do I present it? What does this jargon mean?**

---

## 🛠️ Installation and Running the Project

### Prerequisites

You need these installed on your computer:
- **Node.js** (v18 or later)
- **npm** or **Bun** (Bun is recommended as this project has a `bun.lock` file)
- A **Supabase project** (you can create one for free at supabase.com)

### Step 1: Clone and Install

```sh
git clone <repository-url>
cd senttinelx
npm install     # or: bun install
```

### Step 2: Configure Environment Variables

Create a file named `.env` in the root folder (or use the one already there, but replace with your own keys for a real deployment):

```env
# Required for the database:
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_your_key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_your_key"

# Required ONLY for AI Re-Analysis (otherwise it uses heuristic fallback):
LOVABLE_API_KEY="your_api_key_here"
```

### Step 3: Setup the Database

You must create the tables and security rules in your Supabase project.

Copy the entire contents of `drizzle/migrations/0000_migration.sql` and paste it into the **SQL Editor** in your Supabase dashboard, then click "Run".

### Step 4: Run the Development Server

```sh
npm run dev     # or: bun run dev
```

Open your browser to `http://localhost:3000`.

### Step 5: Test the Application

1. Click "Start free" and create an account with any email/password.
2. On the onboarding screen, click **"Use NovaPay demo"**.
3. You will immediately see the dashboard populated with 30 threats and 6 apps.

---

## 🎤 Project Explanation for a Hackathon

### The 30-Second Pitch

> "Every week, scammers create fake accounts pretending to be your brand to defraud your customers.
> SentinelX is an AI-powered platform that finds those impostors before your customers do. You
> register your brand once, we scan 5 platforms and app stores for look-alikes, score each threat
> 0–100 using string analysis and AI, and generate a ready-to-submit legal takedown complaint in 
> one click. Brand protection that used to take a legal team a week now takes an analyst 10 minutes."

### What Is Real vs. What Is Simulated

**Be honest with judges.** This is what is genuinely implemented:
- ✅ Authentication & Database isolation (Row-Level Security)
- ✅ The Threat Scoring algorithm (Levenshtein distance + homoglyph mapping)
- ✅ The Heuristic AI (regex-based bio analysis)
- ✅ The Real AI integration (GPT-6-astra via Lovable gateway)
- ✅ Takedown report generation (PDF + platform links)
- ✅ The interactive Threat Graph (SVG)

**This is what is simulated (mocked):**
- ⚠️ The actual web scraping of Instagram/X/etc. The "Run Scan" radar animation is real, but the accounts it "discovers" are loaded from a hardcoded demo file, not the live internet.
- ⚠️ The logo similarity score (it's a hardcoded number, not real image hashing).

### 5 Questions Evaluators Will Ask (And How to Answer)

**1. "How do you detect handles that use look-alike characters?"**
"We use a homoglyph normalizer. It's a dictionary that maps characters like the Cyrillic 'а' to the Latin 'a', or '0' to 'o'. We normalize the fake handle first, and *then* run a Levenshtein edit-distance calculation against the official brand name."

**2. "How do you ensure user data is secure?"**
"We use PostgreSQL Row-Level Security (RLS). Every table has a policy requiring `auth.uid() = user_id`. Even if someone reverse-engineers our API calls, the database itself will block them from reading another brand's threats."

**3. "What happens if the AI API goes down?"**
"We built a local heuristic fallback. If the AI call fails or we lack an API key, the system falls back to a regex-based algorithm that checks the bio for known scam patterns like WhatsApp numbers, refund lures, and shortened links to estimate the scam probability."

**4. "Is the web scraping live?"**
"No, for this prototype, the 'Run Scan' feature is a simulation. It demonstrates the UI/UX and data pipeline, but the accounts are loaded from a curated demo pool. Building live scrapers for 5 platforms requires handling CAPTCHAs and proxies, which was outside the scope."

**5. "Why use TanStack Start?"**
"It's a full-stack framework that lets us write our React frontend and our secure server functions (like the AI call that hides our API key) in the exact same codebase, with full TypeScript safety between them."

---

## 📖 Glossary of Technical Terms

| Term | Simple Definition | SentinelX Example |
|---|---|---|
| **API** | Application Programming Interface. How two apps talk to each other. | SentinelX calls the Lovable AI Gateway API to get scam analysis. |
| **Component** | A reusable piece of UI, like a custom HTML tag. | `<ThreatGraph />` or `<RiskGauge />`. |
| **Hook** | A React function starting with `use` that manages data. | `useThreats()` fetches data; `useSession()` checks login. |
| **Homoglyph** | A character that looks identical to another but is technically different. | Cyrillic `а` vs Latin `a`. |
| **JWT** | JSON Web Token. A cryptographically signed string proving you are logged in. | Supabase generates this when you log in. |
| **Levenshtein distance** | The minimum number of character edits to turn one string into another. | Used to compare `novapaysupport` with `novapay`. |
| **RLS** | Row-Level Security. A database feature that filters rows per user. | Prevents Brand A from seeing Brand B's data. |
| **Server Function** | Code that looks like a normal function in React, but actually runs on the backend server. | `analyzeScam()` keeps the AI API key safe on the server. |

---

## 📚 What to Study to Understand This Code

If you want to modify this code yourself, learn these concepts in this order:

1. **React fundamentals:** Props, State (`useState`), and Context (`useContext`).
2. **Tailwind CSS:** How utility classes like `flex items-center p-4` work.
3. **TanStack Query:** How `useQuery` caches data and `invalidateQueries` refreshes it.
4. **Supabase Auth & DB:** How to query data (`supabase.from('x').select()`) and how RLS works.
5. **TanStack Router:** How file-based routing (`src/routes/dashboard.tsx`) turns into URLs.
