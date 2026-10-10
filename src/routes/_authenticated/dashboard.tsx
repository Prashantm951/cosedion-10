import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  FileDown,
  Filter,
  Flame,
  Globe,
  HelpCircle,
  Layers,
  Play,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  UserCheck,
  Wand2,
  XCircle,
} from "lucide-react";
import type { Brand } from "@/lib/brand";
import { generateCandidates, type ScanCandidate } from "@/lib/monitoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBrandBaseline, loadBrandBaseline, saveScanResults, getScanHistory, type StoredScan } from "@/lib/db";
import { toast } from "sonner";
import { HandleDiff } from "@/components/sx/HandleDiff";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Threat Intelligence Command Center — SentinelX" },
      {
        name: "description",
        content: "Automated brand baseline protection, candidate look-alike analysis, and categorized scan reporting.",
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

const emptyForm: FormState = {
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

export function Dashboard() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [savedBrand, setSavedBrand] = useState<Brand | null>(null);
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "scam" | "impersonation" | "official">("all");
  const [pipelineStep, setPipelineStep] = useState<number>(1);
  const [isScanning, setIsScanning] = useState(false);
  const [isSavingBaseline, setIsSavingBaseline] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ScanCandidate | null>(null);
  const [takedownModalCandidate, setTakedownModalCandidate] = useState<ScanCandidate | null>(null);
  const [scanHistory, setScanHistory] = useState<StoredScan[]>([]);

  // Load baseline and scan history on initial mount
  useEffect(() => {
    loadBrandBaseline().then((loaded) => {
      if (loaded && loaded.name && loaded.name.toLowerCase() !== "novapay") {
        setSavedBrand(loaded);
        setForm({
          brandName: loaded.name,
          aliases: loaded.keywords.join(", "),
          logoUrl: loaded.logo_url ?? "",
          instagram: loaded.handles["Instagram"] ?? "",
          x: loaded.handles["X"] ?? "",
          facebook: loaded.handles["Facebook"] ?? "",
          telegram: loaded.handles["Telegram"] ?? "",
          youtube: loaded.handles["YouTube"] ?? "",
          domains: loaded.domains.join(", "),
          appIds: loaded.app_ids.join(", "),
          publishers: loaded.app_publishers.join(", "),
        });
        setPipelineStep(2);
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("sentinelx_active_brand");
        }
      }
    });
    setScanHistory(getScanHistory());
  }, []);

  const brand = useMemo(() => formToBrand(form), [form]);

  const handleClearForm = () => {
    setForm(emptyForm);
    setSavedBrand(null);
    setCandidates([]);
    setPipelineStep(1);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sentinelx_active_brand");
    }
    toast.info("Form cleared. Enter your brand details.");
  };

  // Handle saving brand baseline to PostgreSQL
  const handleSaveBaseline = async () => {
    if (!form.brandName.trim()) {
      toast.error("Brand name is required to establish baseline.");
      return;
    }
    setIsSavingBaseline(true);
    try {
      const currentBrand = formToBrand(form);
      const saved = await saveBrandBaseline(currentBrand);
      setSavedBrand(saved);
      setPipelineStep(2);
      toast.success(`Official baseline for "${saved.name}" stored in PostgreSQL!`);
    } catch {
      toast.error("Failed to save brand baseline.");
    } finally {
      setIsSavingBaseline(false);
    }
  };

  // Run the full sequence from the flowchart
  const handleRunFullScan = async () => {
    if (!form.brandName.trim()) {
      toast.error("Please enter a Brand Name first.");
      return;
    }

    setIsScanning(true);
    setPipelineStep(2);

    try {
      // Step 2: ALWAYS use the CURRENT brand entered in the form
      const currentBrand = formToBrand(form);
      const activeBrand = await saveBrandBaseline(currentBrand);
      setSavedBrand(activeBrand);

      // Step 3: Candidate Ingestion
      setPipelineStep(3);
      await new Promise((r) => setTimeout(r, 400));

      // Step 4: Verification of official baseline
      setPipelineStep(4);
      const generated = generateCandidates(activeBrand);
      await new Promise((r) => setTimeout(r, 400));

      // Step 5: Multi-Signal Deep Analysis
      setPipelineStep(5);
      await new Promise((r) => setTimeout(r, 500));

      // Step 6 & 7: Explainable Scoring & Classification
      setPipelineStep(6);
      await new Promise((r) => setTimeout(r, 300));
      setPipelineStep(7);
      await new Promise((r) => setTimeout(r, 300));

      // Step 8: Save to PostgreSQL and Generate Report
      setCandidates(generated);
      const storedScan = await saveScanResults(activeBrand, generated);
      setActiveScanId(storedScan.id);
      setScanHistory(getScanHistory());
      setPipelineStep(8);

      toast.success(
        `Scan complete! Generated categorized report with ${generated.length} candidates.`
      );
    } catch (err) {
      toast.error("Scan pipeline encountered an error.");
    } finally {
      setIsScanning(false);
    }
  };

  // Categorized candidate groups
  const official = useMemo(
    () => candidates.filter((c) => c.classification === "Legitimate / official"),
    [candidates]
  );
  const impersonations = useMemo(
    () =>
      candidates.filter(
        (c) =>
          c.classification === "Potential impersonation" ||
          c.classification === "High-risk impersonation"
      ),
    [candidates]
  );
  const scams = useMemo(
    () => candidates.filter((c) => c.classification === "Likely scam"),
    [candidates]
  );

  // Filtered rows for current active tab & search
  const filteredCandidates = useMemo(() => {
    let list = candidates;
    if (activeTab === "scam") list = scams;
    else if (activeTab === "impersonation") list = impersonations;
    else if (activeTab === "official") list = official;

    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((c) =>
      [c.platform_or_store, c.handle_or_title, c.display_name, c.bio_or_description, ...c.reasons]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [candidates, activeTab, scams, impersonations, official, query]);

  return (
    <div className="space-y-8 pb-16">
      {/* ─────────────────────────────────────────────────────────────
          FLOWCHART SEQUENCE TRACKER (Matches Core Logic Flowchart)
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/80 bg-surface/50 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Core Logic Sequence — Flowchart Execution Pipeline
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span>Pipeline State:</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              Step {pipelineStep} of 8
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <PipelineNode
            step={1}
            current={pipelineStep}
            title="Brand Details"
            desc="Enter profile"
          />
          <PipelineNode
            step={2}
            current={pipelineStep}
            title="Save Baseline"
            desc="Store in Postgres"
          />
          <PipelineNode
            step={3}
            current={pipelineStep}
            title="Generate Candidates"
            desc="Social & apps"
          />
          <PipelineNode
            step={4}
            current={pipelineStep}
            title="Verify Official"
            desc="Exclude baseline"
          />
          <PipelineNode
            step={5}
            current={pipelineStep}
            title="Analyze Signals"
            desc="Homoglyphs, logos, bios"
          />
          <PipelineNode
            step={6}
            current={pipelineStep}
            title="Score 0-100"
            desc="Explainable weights"
          />
          <PipelineNode
            step={7}
            current={pipelineStep}
            title="Classify"
            desc="Scam / Impersonation"
          />
          <PipelineNode
            step={8}
            current={pipelineStep}
            title="Scan Report"
            desc="Categorized findings"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1 & 2: BRAND DETAILS & OFFICIAL BASELINE
         ───────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary font-mono">
                1
              </span>
              <h2 className="text-lg font-bold text-foreground">Official Brand Baseline Setup</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Define the approved identity assets for your brand. All incoming candidates are verified against this baseline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearForm}
              className="text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear Form
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSaveBaseline}
              disabled={isSavingBaseline}
              className="text-xs font-mono"
            >
              <Database className="h-3.5 w-3.5 mr-1" />
              {isSavingBaseline ? "Saving..." : "Save Baseline to DB"}
            </Button>
          </div>
        </div>

        {/* Input Form Fields */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Identity */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-surface/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary font-mono">
              <Shield className="h-3.5 w-3.5" /> Identity & Branding
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Brand Name *</Label>
              <Input
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                placeholder="e.g. NovaPay"
                className="bg-background/80"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Aliases & Search Keywords</Label>
              <Input
                value={form.aliases}
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                placeholder="Comma separated (e.g. Nova Pay, NovaWallet)"
                className="bg-background/80"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Official Logo URL</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://... logo image link"
                className="bg-background/80 font-mono text-xs"
              />
            </div>
          </div>

          {/* Social Media Handles */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-surface/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary font-mono">
              <Globe className="h-3.5 w-3.5" /> Approved Official Handles
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">X (Twitter)</Label>
                <Input
                  value={form.x}
                  onChange={(e) => setForm({ ...form, x: e.target.value })}
                  placeholder="novapay"
                  className="bg-background/80 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Instagram</Label>
                <Input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="novapay_official"
                  className="bg-background/80 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Facebook</Label>
                <Input
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="novapay.finance"
                  className="bg-background/80 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Telegram</Label>
                <Input
                  value={form.telegram}
                  onChange={(e) => setForm({ ...form, telegram: e.target.value })}
                  placeholder="novapay_channel"
                  className="bg-background/80 text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">YouTube</Label>
              <Input
                value={form.youtube}
                onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                placeholder="NovaPayOfficial"
                className="bg-background/80 text-xs font-mono"
              />
            </div>
          </div>

          {/* Apps & Domains */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-surface/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary font-mono">
              <Smartphone className="h-3.5 w-3.5" /> Mobile Apps & Domains
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Official Domains</Label>
              <Input
                value={form.domains}
                onChange={(e) => setForm({ ...form, domains: e.target.value })}
                placeholder="novapay.com, novapay.io"
                className="bg-background/80 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Approved App Package IDs</Label>
              <Input
                value={form.appIds}
                onChange={(e) => setForm({ ...form, appIds: e.target.value })}
                placeholder="com.novapay.app, com.novapay.wallet"
                className="bg-background/80 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Authorized App Publishers</Label>
              <Input
                value={form.publishers}
                onChange={(e) => setForm({ ...form, publishers: e.target.value })}
                placeholder="NovaPay Technologies Ltd"
                className="bg-background/80 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Trigger */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-semibold text-foreground">
                Ready to execute automated candidate detection
              </div>
              <div className="text-xs text-muted-foreground">
                Generates candidates, ingests to PostgreSQL, excludes approved baseline, and scores remaining impersonators.
              </div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleRunFullScan}
            disabled={isScanning}
            className="w-full sm:w-auto font-medium shadow-md"
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 animate-spin" />
                Executing Pipeline...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-current" />
                Execute Full Scan Pipeline
              </span>
            )}
          </Button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 8: CATEGORIZED SCAN REPORT & METRICS BREAKDOWN
         ───────────────────────────────────────────────────────────── */}
      {candidates.length > 0 && (
        <section className="space-y-6">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Total Scanned
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-foreground">
                {candidates.length}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Profiles, pages & apps
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                Official Verified
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
                {official.length}
              </div>
              <div className="mt-1 text-[11px] text-emerald-500/70">
                Baseline excluded
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
                Impersonations
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
                {impersonations.length}
              </div>
              <div className="mt-1 text-[11px] text-amber-500/70">
                Look-alikes & clones
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-rose-400">
                Likely Scams
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-rose-400">
                {scams.length}
              </div>
              <div className="mt-1 text-[11px] text-rose-500/70">
                Active fraud & lures
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-primary">
                Threat Ratio
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-primary">
                {Math.round(((impersonations.length + scams.length) / candidates.length) * 100)}%
              </div>
              <div className="mt-1 text-[11px] text-primary/70">
                Requiring review
              </div>
            </div>
          </div>

          {/* Categorized Report Explorer */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary font-mono">
                    8
                  </span>
                  <h3 className="text-lg font-bold text-foreground">Categorized Threat Report</h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Stored in PostgreSQL database. Candidates grouped according to multi-signal analysis.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search candidate, handle, bio..."
                    className="pl-9 h-9 text-xs bg-background/80"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(candidates, null, 2));
                    const dl = document.createElement("a");
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", `sentinelx_scan_${Date.now()}.json`);
                    dl.click();
                    toast.success("Scan report exported as JSON");
                  }}
                  className="h-9 text-xs font-mono"
                >
                  <FileDown className="h-3.5 w-3.5 mr-1" /> Export JSON
                </Button>
              </div>
            </div>

            {/* Classification Tabs */}
            <div className="flex items-center gap-2 border-b border-border bg-surface/40 px-5 py-2.5 overflow-x-auto text-xs font-medium">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Candidates ({candidates.length})
              </button>
              <button
                onClick={() => setActiveTab("scam")}
                className={`rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                  activeTab === "scam"
                    ? "bg-rose-600 text-white font-semibold"
                    : "text-rose-400 hover:bg-rose-500/10"
                }`}
              >
                <Flame className="h-3.5 w-3.5" /> Likely Scam ({scams.length})
              </button>
              <button
                onClick={() => setActiveTab("impersonation")}
                className={`rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                  activeTab === "impersonation"
                    ? "bg-amber-600 text-white font-semibold"
                    : "text-amber-400 hover:bg-amber-500/10"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Potential Impersonation ({impersonations.length})
              </button>
              <button
                onClick={() => setActiveTab("official")}
                className={`rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                  activeTab === "official"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "text-emerald-400 hover:bg-emerald-500/10"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" /> Legitimate / Official ({official.length})
              </button>
            </div>

            {/* Candidate Cards Grid */}
            <div className="p-5">
              {filteredCandidates.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No candidates match the selected filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCandidates.map((candidate) => (
                    <CandidateCard
                      key={`${candidate.platform_or_store}-${candidate.handle_or_title}`}
                      candidate={candidate}
                      officialLogo={brand.logo_url}
                      onInspect={() => setSelectedCandidate(candidate)}
                      onTakedown={() => setTakedownModalCandidate(candidate)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          INSPECTION DRAWER MODAL
         ───────────────────────────────────────────────────────────── */}
      {selectedCandidate && (
        <CandidateInspectorModal
          candidate={selectedCandidate}
          brand={brand}
          onClose={() => setSelectedCandidate(null)}
          onTakedown={() => {
            const c = selectedCandidate;
            setSelectedCandidate(null);
            setTakedownModalCandidate(c);
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAKEDOWN NOTICE GENERATOR MODAL
         ───────────────────────────────────────────────────────────── */}
      {takedownModalCandidate && (
        <TakedownNoticeModal
          candidate={takedownModalCandidate}
          brand={brand}
          onClose={() => setTakedownModalCandidate(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE NODE STEP INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function PipelineNode({
  step,
  current,
  title,
  desc,
}: {
  step: number;
  current: number;
  title: string;
  desc: string;
}) {
  const isDone = current > step || current === 8;
  const isCurrent = current === step;

  return (
    <div
      className={`rounded-lg border p-2.5 transition-all text-left ${
        isCurrent
          ? "border-primary bg-primary/10 shadow-sm"
          : isDone
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/50 bg-background/50 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold font-mono ${
            isCurrent
              ? "bg-primary text-primary-foreground"
              : isDone
              ? "bg-emerald-500 text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isDone ? "✓" : step}
        </span>
        {isCurrent && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </div>
      <div className="mt-1.5 font-mono text-[11px] font-bold text-foreground truncate">
        {title}
      </div>
      <div className="text-[10px] text-muted-foreground truncate">{desc}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function CandidateCard({
  candidate,
  officialLogo,
  onInspect,
  onTakedown,
}: {
  candidate: ScanCandidate;
  officialLogo: string | null;
  onInspect: () => void;
  onTakedown: () => void;
}) {
  const isOfficial = candidate.classification === "Legitimate / official";
  const isScam = candidate.classification === "Likely scam";
  const isImpersonation =
    candidate.classification === "Potential impersonation" ||
    candidate.classification === "High-risk impersonation";

  return (
    <div
      className={`rounded-xl border p-4 transition-all hover:shadow-md flex flex-col justify-between ${
        isOfficial
          ? "border-emerald-500/30 bg-surface/40"
          : isScam
          ? "border-rose-500/40 bg-rose-500/[0.03]"
          : "border-amber-500/40 bg-amber-500/[0.03]"
      }`}
    >
      <div>
        {/* Header Strip */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* Candidate avatar */}
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              {officialLogo ? (
                <img src={officialLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                  {candidate.handle_or_title[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground truncate max-w-[170px]">
                {candidate.display_name}
              </div>
              <div className="text-xs font-mono text-muted-foreground truncate max-w-[170px]">
                {candidate.package_id ? candidate.handle_or_title : `@${candidate.handle_or_title}`}
              </div>
            </div>
          </div>

          {/* Risk Score Pill */}
          <div
            className={`flex flex-col items-end rounded-lg px-2 py-1 font-mono text-right ${
              isOfficial
                ? "bg-emerald-500/10 text-emerald-400"
                : isScam
                ? "bg-rose-500/15 text-rose-400 font-bold"
                : "bg-amber-500/15 text-amber-400 font-bold"
            }`}
          >
            <span className="text-xs font-bold leading-none">{candidate.risk_score}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground leading-tight">
              {candidate.severity}
            </span>
          </div>
        </div>

        {/* Classification Badge & Platform */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="font-mono text-[11px] text-muted-foreground">
            {candidate.platform_or_store}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              isOfficial
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : isScam
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            {candidate.classification}
          </span>
        </div>

        {/* Bio or Description snippet */}
        <div className="mt-2.5 rounded bg-background/60 p-2 text-xs text-muted-foreground line-clamp-2">
          {candidate.bio_or_description || "No bio provided."}
        </div>

        {/* Forensic Signal Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
            Logo: {candidate.logo_similarity}%
          </span>
          {candidate.signals["identity_similarity"] !== undefined && (
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
              Name: {String(candidate.signals["identity_similarity"])}%
            </span>
          )}
          {candidate.verified && (
            <span className="rounded bg-sky-500/10 text-sky-400 px-1.5 py-0.5 text-[10px] font-mono border border-sky-500/20">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onInspect}
          className="flex-1 text-xs font-mono h-8"
        >
          <Eye className="h-3 w-3 mr-1 text-primary" /> Inspect
        </Button>
        {!isOfficial && (
          <Button
            variant="default"
            size="sm"
            onClick={onTakedown}
            className="text-xs font-mono h-8 bg-rose-600 hover:bg-rose-500 text-white"
          >
            <ShieldAlert className="h-3 w-3 mr-1" /> Takedown
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSPECTOR MODAL WITH DEEP SIGNAL BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────
function CandidateInspectorModal({
  candidate,
  brand,
  onClose,
  onTakedown,
}: {
  candidate: ScanCandidate;
  brand: Brand;
  onClose: () => void;
  onTakedown: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Candidate Forensic Analysis
            </div>
            <h3 className="text-xl font-bold text-foreground">{candidate.display_name}</h3>
            <div className="font-mono text-xs text-primary">
              {candidate.package_id ? candidate.handle_or_title : `@${candidate.handle_or_title}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Homoglyph / Typo comparison */}
          <div className="rounded-lg border border-border/80 bg-surface/40 p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Homoglyph & Typo Character Analysis
            </div>
            <div className="flex items-center gap-3 text-sm font-mono">
              <span className="text-muted-foreground">Target:</span>
              <span className="rounded bg-background px-2 py-1 font-bold">
                <HandleDiff handle={candidate.handle_or_title} />
              </span>
              <span className="text-muted-foreground">vs Baseline:</span>
              <span className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-400">
                {brand.name.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Signals Breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Logo Match</div>
              <div className="mt-1 text-xl font-bold font-mono text-foreground">
                {candidate.logo_similarity}%
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Risk Score</div>
              <div className="mt-1 text-xl font-bold font-mono text-rose-400">
                {candidate.risk_score} / 100
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Platform</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {candidate.platform_or_store}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Status</div>
              <div className="mt-1 text-xs font-bold text-foreground">
                {candidate.classification}
              </div>
            </div>
          </div>

          {/* Rationale and Flagged Reasons */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Explainable Risk Reasons
            </div>
            <ul className="space-y-1.5">
              {candidate.reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded bg-surface/50 p-2 text-xs text-foreground"
                >
                  <span className="text-rose-400">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Raw Bio Content */}
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Profile Bio / App Description
            </div>
            <div className="rounded bg-background p-3 font-mono text-xs text-muted-foreground">
              {candidate.bio_or_description || "No bio text provided."}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-mono">
            Close
          </Button>
          {candidate.classification !== "Legitimate / official" && (
            <Button
              size="sm"
              onClick={onTakedown}
              className="text-xs font-mono bg-rose-600 hover:bg-rose-500 text-white"
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Prepare Takedown Notice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAKEDOWN NOTICE GENERATOR MODAL
// ─────────────────────────────────────────────────────────────────────────────
function TakedownNoticeModal({
  candidate,
  brand,
  onClose,
}: {
  candidate: ScanCandidate;
  brand: Brand;
  onClose: () => void;
}) {
  const noticeText = useMemo(() => {
    return `FORMAL NOTICE OF TRADEMARK INFRINGEMENT & BRAND IMPERSONATION

To: Abuse and Legal Compliance Desk (${candidate.platform_or_store})
Date: ${new Date().toUTCString()}
Ref: SentinelX-Takedown-${Date.now().toString(36).toUpperCase()}

1. COMPLAINANT IDENTIFICATION
Brand Name: ${brand.name}
Official Baseline Domains: ${brand.domains.join(", ")}
Official Channels: ${Object.entries(brand.handles).map(([k, v]) => `${k}: @${v}`).join(", ")}

2. INFRINGING ASSET DETAILS
Platform: ${candidate.platform_or_store}
Target Identifier: ${candidate.package_id ? candidate.handle_or_title : `@${candidate.handle_or_title}`}
Display Name: ${candidate.display_name}
Calculated Risk Severity: ${candidate.severity.toUpperCase()} (${candidate.risk_score}/100)

3. FORENSIC EVIDENCE & VIOLATIONS
- Classification: ${candidate.classification}
- Detected Scam Lures / Reasons:
${candidate.reasons.map((r) => `  * ${r}`).join("\n")}
- Simulated Brand Identity Similarity: ${candidate.logo_similarity}% Logo Match

4. REMEDY REQUESTED
We request the immediate suspension and removal of this infringing profile/application pursuant to trademark violation and consumer fraud prevention standards.

Generated via SentinelX Threat Intelligence Platform.`;
  }, [candidate, brand]);

  const copyNotice = () => {
    navigator.clipboard.writeText(noticeText);
    toast.success("Takedown notice copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-rose-400">
              Legal Abuse Package
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Takedown Notice: {candidate.display_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <Label className="text-xs font-mono text-muted-foreground">Pre-Formatted Legal Notice</Label>
          <textarea
            readOnly
            value={noticeText}
            className="mt-1.5 h-64 w-full rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground focus:outline-none"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-mono">
            Close
          </Button>
          <Button size="sm" onClick={copyNotice} className="text-xs font-mono">
            Copy to Clipboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: FORM TO BRAND
// ─────────────────────────────────────────────────────────────────────────────
function formToBrand(form: FormState): Brand {
  const handles: Record<string, string> = {};
  if (form.instagram.trim()) handles["Instagram"] = form.instagram.trim().replace(/^@/, "");
  if (form.x.trim()) handles["X"] = form.x.trim().replace(/^@/, "");
  if (form.facebook.trim()) handles["Facebook"] = form.facebook.trim().replace(/^@/, "");
  if (form.telegram.trim()) handles["Telegram"] = form.telegram.trim().replace(/^@/, "");
  if (form.youtube.trim()) handles["YouTube"] = form.youtube.trim().replace(/^@/, "");

  return {
    id: "active-brand",
    user_id: "authenticated-user",
    name: form.brandName.trim() || "Brand",
    keywords: splitCsv(form.aliases),
    logo_url: form.logoUrl.trim() || null,
    handles,
    app_ids: splitCsv(form.appIds),
    app_publishers: splitCsv(form.publishers),
    domains: splitCsv(form.domains),
    phones: [],
    alert_critical_email: true,
    alert_email: null,
    team: [],
    created_at: new Date().toISOString(),
  };
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
