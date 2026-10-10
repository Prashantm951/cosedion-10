import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, Search, Upload, Wand2 } from "lucide-react";
import type { Brand } from "@/lib/data";
import { generateCandidates, type ScanCandidate } from "@/lib/monitoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Prototype tester - SentinelX" },
      {
        name: "description",
        content: "Basic frontend for testing brand input, lookalike generation, and search.",
      },
    ],
  }),
  component: Dashboard,
});

type FormState = {
  brandName: string;
  aliases: string;
  logoUrl: string;
  instagram: string;
  x: string;
  facebook: string;
  telegram: string;
  youtube: string;
  domains: string;
  appIds: string;
  publishers: string;
};

const initialForm: FormState = {
  brandName: "",
  aliases: "",
  logoUrl: "",
  instagram: "",
  x: "",
  facebook: "",
  telegram: "",
  youtube: "",
  domains: "",
  appIds: "",
  publishers: "",
};

function Dashboard() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");

  const brand = useMemo(() => formToBrand(form), [form]);
  const official = candidates.filter((c) => c.classification === "Legitimate / official");
  const lookalikes = candidates.filter((c) => c.candidate_kind === "lookalike");
  const scams = candidates.filter((c) => c.candidate_kind === "scam");
  const findings = candidates.filter(
    (c) =>
      c.classification !== "Legitimate / official" &&
      c.classification !== "Legitimate / benign",
  );
  const filtered = candidates.filter((candidate) => {
    const haystack = [
      candidate.platform_or_store,
      candidate.handle_or_title,
      candidate.display_name,
      candidate.bio_or_description,
      candidate.classification,
      candidate.reasons.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase());
    const matchesKind = kind === "all" || candidate.candidate_kind === kind;
    return matchesQuery && matchesKind;
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("logoUrl", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function runGeneration() {
    setCandidates(generateCandidates(brand));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Prototype mode</p>
            <h1 className="mt-1 text-2xl font-semibold">Brand input and fake-candidate tester</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Auth, Gmail, database save, and real crawling are removed for now. Use this screen to
              check the core logic: enter brand details, generate fake lookalike usernames/apps, and
              search/filter the generated results.
            </p>
          </div>
          <Button onClick={runGeneration}>
            <Wand2 className="h-4 w-4" />
            Generate fake candidates
          </Button>
        </div>
      </section>

      <Pipeline
        hasBrand={Boolean(form.brandName.trim())}
        generated={candidates.length}
        official={official.length}
        lookalikes={lookalikes.length + scams.length}
        findings={findings.length}
      />

      <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-semibold">Brand details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is the minimum input needed to test matching and lookalike generation.
          </p>
          <div className="mt-5 space-y-4">
            <Field label="Brand name">
              <Input value={form.brandName} onChange={(e) => update("brandName", e.target.value)} />
            </Field>
            <Field label="Aliases / keywords">
              <Input value={form.aliases} onChange={(e) => update("aliases", e.target.value)} />
            </Field>
            <Field label="Official logo">
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-3">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {form.logoUrl ? "Replace logo" : "Upload logo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadLogo(e.target.files?.[0])}
                />
              </label>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Instagram">
                <Input value={form.instagram} onChange={(e) => update("instagram", e.target.value)} />
              </Field>
              <Field label="X">
                <Input value={form.x} onChange={(e) => update("x", e.target.value)} />
              </Field>
              <Field label="Facebook">
                <Input value={form.facebook} onChange={(e) => update("facebook", e.target.value)} />
              </Field>
              <Field label="Telegram">
                <Input value={form.telegram} onChange={(e) => update("telegram", e.target.value)} />
              </Field>
              <Field label="YouTube">
                <Input value={form.youtube} onChange={(e) => update("youtube", e.target.value)} />
              </Field>
            </div>
            <Field label="Official domains">
              <Input value={form.domains} onChange={(e) => update("domains", e.target.value)} />
            </Field>
            <Field label="Official app IDs">
              <Input value={form.appIds} onChange={(e) => update("appIds", e.target.value)} />
            </Field>
            <Field label="Approved app publishers">
              <Input value={form.publishers} onChange={(e) => update("publishers", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-4">
            <Metric label="Generated" value={candidates.length} />
            <Metric label="Official excluded" value={official.length} />
            <Metric label="Lookalikes/scams" value={lookalikes.length + scams.length} />
            <Metric label="Findings" value={findings.length} />
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search username, app name, reason..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All candidates</option>
                <option value="official">Official</option>
                <option value="lookalike">Lookalike</option>
                <option value="scam">Scam</option>
                <option value="benign">Benign</option>
              </select>
            </div>
          </section>

          <CandidateTable rows={filtered} logo={form.logoUrl} />
        </div>
      </section>
    </div>
  );
}

function formToBrand(form: FormState): Brand {
  return {
    id: "local-brand",
    user_id: "local-user",
    name: form.brandName.trim() || "Demo Brand",
    keywords: [form.brandName, ...splitList(form.aliases)].filter(Boolean),
    logo_url: form.logoUrl || null,
    handles: {
      Instagram: cleanHandle(form.instagram),
      X: cleanHandle(form.x),
      Facebook: cleanHandle(form.facebook),
      Telegram: cleanHandle(form.telegram),
      YouTube: cleanHandle(form.youtube),
    },
    app_ids: splitList(form.appIds),
    app_publishers: splitList(form.publishers),
    domains: splitList(form.domains),
    phones: [],
    alert_critical_email: false,
    alert_email: null,
    team: [],
    created_at: new Date().toISOString(),
  };
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanHandle(value: string) {
  return value.trim().replace(/^@/, "");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Pipeline({
  hasBrand,
  generated,
  official,
  lookalikes,
  findings,
}: {
  hasBrand: boolean;
  generated: number;
  official: number;
  lookalikes: number;
  findings: number;
}) {
  const steps = [
    {
      title: "1. User input",
      detail: hasBrand ? "Brand details entered" : "Enter brand details",
      state: hasBrand ? "done" : "todo",
    },
    {
      title: "2. Official baseline",
      detail: "Name, aliases, handles, logo, domains, app IDs, publishers",
      state: hasBrand ? "done" : "todo",
    },
    {
      title: "3. Generate candidates",
      detail: generated ? `${generated} simulated profiles/apps` : "Click generate",
      state: generated ? "done" : "todo",
    },
    {
      title: "4. Local staging",
      detail: generated ? "Stored in page state for testing" : "Database save later",
      state: generated ? "done" : "todo",
    },
    {
      title: "5. Exclude official",
      detail: official ? `${official} official matches excluded` : "Waiting for candidates",
      state: official ? "done" : "todo",
    },
    {
      title: "6. Analyze lookalikes",
      detail: lookalikes ? `${lookalikes} lookalike/scam variants` : "Waiting for candidates",
      state: lookalikes ? "done" : "todo",
    },
    {
      title: "7. Score and classify",
      detail: findings ? `${findings} findings scored 0-100` : "Waiting for analysis",
      state: findings ? "done" : "todo",
    },
  ];

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-semibold">Core logic sequence</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This mirrors your diagram. Database persistence and report generation are intentionally
        marked as later work; this page tests the logic locally.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-7">
        {steps.map((step, index) => (
          <div key={step.title} className="flex gap-2 md:block">
            <div
              className={`h-full rounded-lg border p-3 ${
                step.state === "done"
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-background"
              }`}
            >
              <div className="text-xs font-semibold">{step.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{step.detail}</div>
            </div>
            {index < steps.length - 1 && (
              <ArrowDown className="mt-3 h-4 w-4 shrink-0 text-muted-foreground md:mx-auto md:rotate-[-90deg]" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CandidateTable({ rows, logo }: { rows: ScanCandidate[]; logo: string }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        Click “Generate fake candidates” to create official exclusions, lookalike usernames, scam
        profiles, and suspicious app samples.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[1280px] text-left text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Logo</th>
            <th className="px-3 py-2">Candidate</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Decision path</th>
            <th className="px-3 py-2">Identity</th>
            <th className="px-3 py-2">Logo</th>
            <th className="px-3 py-2">Scam</th>
            <th className="px-3 py-2">Account/publisher</th>
            <th className="px-3 py-2">Classification</th>
            <th className="px-3 py-2">Risk</th>
            <th className="px-3 py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.platform_or_store}-${row.handle_or_title}`}
              className="border-t border-border"
            >
              <td className="px-3 py-2">
                {logo ? (
                  <img src={logo} alt="" className="h-9 w-9 rounded-md object-cover" />
                ) : (
                  <span className="block h-9 w-9 rounded-md bg-muted" />
                )}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium">{row.display_name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {row.package_id ? row.handle_or_title : `@${row.handle_or_title}`}
                </div>
              </td>
              <td className="px-3 py-2">
                <div>{row.platform_or_store}</div>
                <div className="font-mono text-xs text-muted-foreground">simulated</div>
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-md px-2 py-1 text-xs ${
                    row.classification === "Legitimate / official"
                      ? "bg-low/10 text-low"
                      : "bg-critical/10 text-critical"
                  }`}
                >
                  {row.classification === "Legitimate / official"
                    ? "official excluded"
                    : "scored finding"}
                </span>
              </td>
              <SignalCell value={signalNumber(row, "identity_similarity")} suffix="%" />
              <SignalCell value={signalNumber(row, "logo_similarity")} suffix="%" />
              <SignalCell value={signalNumber(row, "scam_content")} suffix="/100" />
              <SignalCell value={signalNumber(row, "account_or_publisher_risk")} suffix="/100" />
              <td className="px-3 py-2">{row.classification}</td>
              <td className="px-3 py-2">
                <span className="font-mono text-lg font-semibold">{row.risk_score}</span>
                <div className="text-xs capitalize text-muted-foreground">{row.severity}</div>
              </td>
              <td className="max-w-[360px] px-3 py-2 text-xs text-muted-foreground">
                {row.reasons.slice(0, 3).join(" ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function signalNumber(candidate: ScanCandidate, key: string) {
  const value = candidate.signals[key];
  return typeof value === "number" ? value : candidate.classification === "Legitimate / official" ? 0 : null;
}

function SignalCell({ value, suffix }: { value: number | null; suffix: string }) {
  return (
    <td className="px-3 py-2 font-mono text-xs">
      {value === null ? <span className="text-muted-foreground">-</span> : `${value}${suffix}`}
    </td>
  );
}
