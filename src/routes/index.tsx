import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  FileWarning,
  Fingerprint,
  Network,
  Radar,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/sx/Logo";
import { CountUp, PlatformIcon, SeverityBadge } from "@/components/sx/primitives";
import { ThreatGraph } from "@/components/sx/ThreatGraph";
import { HandleDiff } from "@/components/sx/HandleDiff";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ThreatLens — Find your brand's impostors first" },
      {
        name: "description",
        content:
          "Threat analysis & brand defense: detect fake profiles, impersonators, scam accounts and look-alike apps, then file takedowns in one click.",
      },
      { property: "og:title", content: "ThreatLens — Find your brand's impostors first" },
      {
        property: "og:description",
        content:
          "Automated detection of fake profiles, scam accounts and suspicious apps impersonating your brand.",
      },
    ],
  }),
  component: Landing,
});

const SEVS = ["critical", "high", "medium", "low"];
const DEMO_NODES = ["Instagram", "X", "Facebook", "Telegram", "YouTube", "Play Store"].flatMap(
  (p, i) =>
    Array.from({ length: 3 + (i % 3) }, (_, j) => {
      const risk = 35 + ((i * 17 + j * 23) % 64);
      return {
        id: `${p}${j}`,
        label: `brand_${["support", "care", "help", "refund", "kyc"][j % 5]}`,
        platform: p,
        risk,
        severity: risk >= 80 ? "critical" : risk >= 60 ? "high" : risk >= 40 ? "medium" : "low",
      };
    }),
);

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

function Landing() {
  return (
    <div className="min-h-screen cyber-bg">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 border-b border-[#2A6B5C]/40 bg-[#123F36]">
        <Logo />
        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" size="sm" className="font-mono text-xs">
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button asChild size="sm" variant="default" className="font-mono text-xs font-semibold">
            <Link to="/dashboard">Command Center</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2A6B5C]/60 bg-[#143f36] px-3 py-1 text-xs text-[#C49A45] font-mono shadow-[inset_1px_1px_3px_rgba(5,18,15,0.7)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-[#C49A45] animate-ping-dot" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[#C49A45]" />
            </span>
            Automated Threat Analysis · Real-Time Telemetry
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl text-[#E8DCC4]">
            Find your brand's <span className="text-[#C49A45]">impostors</span> before your
            customers do.
          </h1>
          <p className="mt-5 max-w-xl text-base text-[#b8ab94] leading-relaxed">
            ThreatLens establishes your official brand baseline, generates potential look-alike
            candidates, scores every candidate with explainable multi-signal telemetry, and drafts
            ready-to-file takedowns.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              variant="default"
              size="default"
              className="h-9 px-5 text-xs font-mono font-bold"
            >
              <Link to="/dashboard">
                Launch Command Center <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="default" className="h-9 px-4 text-xs font-mono">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
          <div className="mt-9 flex items-end gap-3">
            <div className="font-mono text-3xl font-bold text-[#E8DCC4]">
              <CountUp value={12408} duration={2.2} />
            </div>
            <div className="pb-1 label-caps text-[#C49A45]">impostors detected this month</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="neo-card relative overflow-hidden p-2.5 shadow-[8px_8px_20px_rgba(4,16,13,0.85),-5px_-5px_14px_rgba(42,107,92,0.35)] border border-[#2A6B5C]/60"
        >
          <div className="flex items-center justify-between border-b border-[#2A6B5C]/50 px-4 py-2.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#C49A45]">
              Live threat telemetry
            </div>
            <div className="flex gap-1.5">
              {SEVS.map((s) => (
                <SeverityBadge key={s} severity={s} />
              ))}
            </div>
          </div>
          <ThreatGraph nodes={DEMO_NODES} brandName="Your brand" height={420} />
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <motion.div {...reveal} className="mb-10 max-w-2xl">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#C49A45] mb-2">
            Tactical workflow
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-[#E8DCC4]">
            From baseline registration to takedown in three moves.
          </h2>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              icon: Fingerprint,
              t: "Register your identity",
              d: "Add your name, aliases, logo, official handles, apps, domains and authorized publishers.",
            },
            {
              n: "02",
              icon: Radar,
              t: "Run a simulated scan",
              d: "Brand-driven simulated candidates are analyzed for look-alikes, cloned logos and scam bios, then scored 0–100.",
            },
            {
              n: "03",
              icon: FileWarning,
              t: "Take them down",
              d: "One click generates a formal abuse complaint with evidence, metrics and platform legal links.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              {...reveal}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="neo-card p-5 border border-[#2A6B5C]/50 transition-all hover:-translate-y-1 hover:border-[#C49A45]/50"
            >
              <div className="mb-6 flex items-center justify-between">
                <s.icon className="h-5 w-5 text-[#C49A45]" />
                <span className="font-mono text-xs text-[#C49A45] font-semibold">{s.n}</span>
              </div>
              <h3 className="text-base font-bold text-[#E8DCC4]">{s.t}</h3>
              <p className="mt-1.5 text-xs text-[#b8ab94] leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
          {[
            {
              icon: ScanSearch,
              t: "Homoglyph detection",
              d: "Cyrillic letters, 0-for-o, rn-for-m and _support / _care suffixes caught instantly.",
              span: "md:col-span-2",
            },
            {
              icon: Brain,
              t: "AI scam analysis",
              d: "Explainable reasoning with scam phrases and financial lures flagged.",
              span: "",
            },
            {
              icon: Eye,
              t: "Logo similarity",
              d: "Cloned avatars and app icons, scored by algorithmic match %.",
              span: "",
            },
            {
              icon: Smartphone,
              t: "Rogue app hunting",
              d: "Look-alike Play Store apps requesting dangerous device permissions.",
              span: "",
            },
            {
              icon: Network,
              t: "Threat graph",
              d: "See your digital attack surface as a responsive interactive network.",
              span: "",
            },
            {
              icon: ShieldCheck,
              t: "One-click takedowns",
              d: "Printable, evidence-backed reports formatted specifically for platform legal desks.",
              span: "md:col-span-2",
            },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              {...reveal}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`neo-card p-5 border border-[#2A6B5C]/50 hover:border-[#C49A45]/50 transition-all ${f.span}`}
            >
              <f.icon className="mb-3 h-4 w-4 text-[#C49A45]" />
              <h3 className="text-sm font-bold text-[#E8DCC4]">{f.t}</h3>
              <p className="mt-1 text-xs text-[#b8ab94] leading-relaxed">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <RealVsFake />

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <motion.div {...reveal}>
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl text-[#E8DCC4]">
            Your customers can't tell the difference.{" "}
            <span className="text-[#C49A45]">We can.</span>
          </h2>
          <Button
            asChild
            variant="default"
            size="default"
            className="mt-7 h-9 px-6 text-xs font-mono font-bold"
          >
            <Link to="/dashboard">
              Open Threat Command Center <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </motion.div>
      </section>
      <footer className="border-t border-[#2A6B5C]/40 bg-[#123F36] py-6 text-center text-xs text-muted-foreground">
        © 2026 ThreatLens · Digital Risk & Threat Intelligence Protection
      </footer>
    </div>
  );
}

function RealVsFake() {
  const [revealed, setRevealed] = useState(false);
  const cards = [
    {
      fake: false,
      handle: "yourbrand",
      name: "Your Brand",
      bio: "Approved official account. We'll never ask for your OTP.",
      f: "100K",
      age: "2018",
    },
    {
      fake: true,
      handle: "y0urbrаnd_support",
      name: "Your Brand Support",
      bio: "Failed payment? DM for refund. WhatsApp +91 98765 43210 — urgent KYC.",
      f: "2,140",
      age: "12 days",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <motion.div
        {...reveal}
        className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#C49A45] mb-1.5">
            Forensic comparison
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-[#E8DCC4]">
            One of these is an active scammer.
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRevealed(!revealed)}
          className="font-mono text-xs"
        >
          {revealed ? "Hide analysis" : "Reveal with ThreatLens"}
        </Button>
      </motion.div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...cards]
          .sort(() => 0)
          .map((c) => (
            <div
              key={c.handle}
              className={`neo-card p-5 transition-all duration-300 border ${
                revealed && c.fake
                  ? "border-[#e25252]/80 bg-[#1c3a33] shadow-[0_0_15px_rgba(226,82,82,0.3)]"
                  : revealed
                    ? "border-[#36aa80]/80 bg-[#16433a]"
                    : "border-[#2A6B5C]/50"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-brand text-xs font-bold text-[#123F36] shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                  YB
                </div>
                <div>
                  <div className="text-sm font-bold text-[#E8DCC4]">
                    {c.name} {!c.fake && <span className="ml-1 text-[#36aa80]">✓</span>}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    @{revealed ? <HandleDiff handle={c.handle} /> : c.handle}
                  </div>
                </div>
                <PlatformIcon platform="Instagram" className="ml-auto h-4 w-4 text-[#C49A45]" />
              </div>
              <p className="mt-3 text-xs text-[#b8ab94]">{c.bio}</p>
              <div className="mt-3 flex gap-4 font-mono text-[11px] text-muted-foreground">
                <span>{c.f} followers</span>
                <span>since {c.age}</span>
              </div>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3.5 border-t border-[#2A6B5C]/50 pt-3 text-xs"
                >
                  {c.fake ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[#ff7575] font-mono text-[11px]">
                        Homoglyph "0" and Cyrillic "а", _support suffix, refund lure
                      </span>
                      <span className="font-mono text-xl font-bold text-[#ff7575]">94</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[#55cca0] font-mono text-[11px]">
                        Official verified account baseline
                      </span>
                      <span className="font-mono text-xl font-bold text-[#55cca0]">0</span>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
