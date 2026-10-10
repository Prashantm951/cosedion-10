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
      { title: "SentinelX — Find your brand's impostors first" },
      {
        name: "description",
        content:
          "AI-powered digital risk protection: detect fake profiles, impersonators, scam accounts and look-alike apps, then file takedowns in one click.",
      },
      { property: "og:title", content: "SentinelX — Find your brand's impostors first" },
      {
        property: "og:description",
        content:
          "AI-powered detection of fake profiles, scam accounts and suspicious apps impersonating your brand.",
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
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Start free
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping-dot" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Simulated monitoring MVP
          </div>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Find your brand's <span className="text-gradient">impostors</span> before your customers
            do.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            SentinelX generates brand-specific simulated candidates, scores every one with
            explainable signals, and drafts the takedown for you. It does not crawl real platforms
            or stores.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild variant="hero" size="lg" className="h-12 px-7 text-base">
              <Link to="/auth" search={{ mode: "signup" }}>
                Protect my brand <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-10 flex items-end gap-3">
            <div className="font-mono text-4xl font-bold text-foreground">
              <CountUp value={12408} duration={2.2} />
            </div>
            <div className="pb-1.5 label-caps">impostors detected this month</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="panel relative overflow-hidden p-2 glow-primary"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="label-caps">Illustrative threat graph</div>
            <div className="flex gap-1.5">
              {SEVS.map((s) => (
                <SeverityBadge key={s} severity={s} />
              ))}
            </div>
          </div>
          <ThreatGraph nodes={DEMO_NODES} brandName="Your brand" height={420} />
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div {...reveal} className="mb-12 max-w-2xl">
          <div className="label-caps mb-3 text-primary">How it works</div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            From registration to takedown in three moves.
          </h2>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              icon: Fingerprint,
              t: "Register your identity",
              d: "Add your name, aliases, logo, official handles, apps, domains and support numbers.",
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
              d: "One click generates a formal complaint with evidence, metrics and the platform's report link.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              {...reveal}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="panel panel-hover p-6"
            >
              <div className="mb-8 flex items-center justify-between">
                <s.icon className="h-6 w-6 text-primary" />
                <span className="font-mono text-sm text-muted-foreground">{s.n}</span>
              </div>
              <h3 className="text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
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
              d: "Plain-English reasoning with scam phrases highlighted.",
              span: "",
            },
            {
              icon: Eye,
              t: "Logo similarity",
              d: "Cloned avatars and app icons, scored by match %.",
              span: "",
            },
            {
              icon: Smartphone,
              t: "Rogue app hunting",
              d: "Look-alike Play Store apps requesting SMS, Accessibility and Overlay permissions.",
              span: "",
            },
            {
              icon: Network,
              t: "Threat graph",
              d: "See your attack surface as a living network.",
              span: "",
            },
            {
              icon: ShieldCheck,
              t: "One-click takedowns",
              d: "Printable, evidence-backed reports filed straight to each platform.",
              span: "md:col-span-2",
            },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              {...reveal}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`panel panel-hover p-6 ${f.span}`}
            >
              <f.icon className="mb-4 h-5 w-5 text-primary" />
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <RealVsFake />

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <motion.div {...reveal}>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Your customers can't tell the difference. <span className="text-gradient">We can.</span>
          </h2>
          <Button asChild variant="hero" size="lg" className="mt-10 h-12 px-8 text-base">
            <Link to="/auth" search={{ mode: "signup" }}>
              Protect your brand <ArrowRight />
            </Link>
          </Button>
        </motion.div>
      </section>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 SentinelX · Digital Risk Protection
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
    <section className="mx-auto max-w-7xl px-6 py-20">
      <motion.div
        {...reveal}
        className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <div className="label-caps mb-3 text-primary">Spot the fake</div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            One of these is a scammer.
          </h2>
        </div>
        <Button variant="outline" onClick={() => setRevealed(!revealed)}>
          {revealed ? "Hide analysis" : "Reveal with SentinelX"}
        </Button>
      </motion.div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...cards]
          .sort(() => 0)
          .map((c) => (
            <div
              key={c.handle}
              className={`panel p-6 transition-all duration-500 ${revealed && c.fake ? "border-critical/50 glow-critical" : revealed ? "border-low/40" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
                  YB
                </div>
                <div>
                  <div className="font-semibold">
                    {c.name} {!c.fake && <span className="ml-1 text-primary">✓</span>}
                  </div>
                  <div className="font-mono text-sm text-muted-foreground">
                    @{revealed ? <HandleDiff handle={c.handle} /> : c.handle}
                  </div>
                </div>
                <PlatformIcon
                  platform="Instagram"
                  className="ml-auto h-5 w-5 text-muted-foreground"
                />
              </div>
              <p className="mt-4 text-sm">{c.bio}</p>
              <div className="mt-4 flex gap-6 font-mono text-xs text-muted-foreground">
                <span>{c.f} followers</span>
                <span>since {c.age}</span>
              </div>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 border-t border-border pt-4 text-sm"
                >
                  {c.fake ? (
                    <div className="flex items-center justify-between">
                      <span className="text-critical">
                        Homoglyph "0" and Cyrillic "а", _support suffix, refund + WhatsApp lure
                      </span>
                      <span className="font-mono text-2xl font-bold text-critical">94</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-low">Official verified account</span>
                      <span className="font-mono text-2xl font-bold text-low">0</span>
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
