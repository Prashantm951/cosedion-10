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
  Activity,
  Crosshair,
  Radar,
} from "lucide-react";
import type { Brand } from "@/lib/brand";
import { generateCandidates, type ScanCandidate } from "@/lib/monitoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveBrandBaseline,
  loadBrandBaseline,
  saveScanResults,
  getScanHistory,
  type StoredScan,
} from "@/lib/db";
import { toast } from "sonner";
import { HandleDiff } from "@/components/sx/HandleDiff";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Threat Intelligence Command Center — ThreatLens" },
      {
        name: "description",
        content:
          "Automated brand baseline protection, candidate look-alike analysis, and categorized scan reporting with ThreatLens.",
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
          localStorage.removeItem("threatlens_active_brand");
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
      localStorage.removeItem("threatlens_active_brand");
    }
    toast.info("Form cleared. Enter your brand details.");
  };

  // Automatically save and persist brand baseline in the background
  useEffect(() => {
    if (!form.brandName.trim()) return;
    const timer = setTimeout(() => {
      const currentBrand = formToBrand(form);
      saveBrandBaseline(currentBrand)
        .then((saved) => {
          setSavedBrand(saved);
          if (pipelineStep < 2) {
            setPipelineStep(2);
          }
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [form, pipelineStep]);

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
        `Scan complete! ThreatLens generated categorized report with ${generated.length} candidates.`,
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
    [candidates],
  );
  const impersonations = useMemo(
    () =>
      candidates.filter(
        (c) =>
          c.classification === "Potential impersonation" ||
          c.classification === "High-risk impersonation",
      ),
    [candidates],
  );
  const scams = useMemo(
    () => candidates.filter((c) => c.classification === "Likely scam"),
    [candidates],
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
        .includes(q),
    );
  }, [candidates, activeTab, scams, impersonations, official, query]);

  return (
    <div className="space-y-7 pb-24">
      {/* ─────────────────────────────────────────────────────────────
          FLOWCHART SEQUENCE TRACKER (Tactile Neomorphism Pipeline)
         ───────────────────────────────────────────────────────────── */}
      <div id="pipeline-tracker" className="neo-card p-4 border border-[#2A6B5C]/50">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#C49A45]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E8DCC4] font-mono">
              Core Logic Sequence — Flowchart Execution Pipeline
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span>Pipeline State:</span>
            <span className="rounded bg-[#123830] border border-[#2A6B5C]/60 px-2 py-0.5 font-bold text-[#C49A45] shadow-[inset_1px_1px_2px_rgba(5,18,15,0.7)]">
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
            desc="Auto-persisted"
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
          SECTION 1 & 2: BRAND DETAILS & OFFICIAL BASELINE (Neomorphism)
         ───────────────────────────────────────────────────────────── */}
      <section id="baseline-setup" className="neo-card p-5 border border-[#2A6B5C]/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#2A6B5C]/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#123830] border border-[#C49A45]/60 text-[11px] font-bold text-[#C49A45] font-mono shadow-[inset_1px_1px_2px_rgba(0,0,0,0.6)]">
                1
              </span>
              <h2 className="text-base font-bold text-[#E8DCC4]">Official Brand Baseline Setup</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define the approved identity assets for your brand. All incoming candidates are
              verified against this baseline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearForm}
              className="text-xs font-mono text-muted-foreground hover:text-white"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Clear Form
            </Button>
          </div>
        </div>

        {/* Input Form Fields - Neomorphic Debossed Containers */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Identity */}
          <div className="space-y-3.5 rounded-lg border border-[#2A6B5C]/40 bg-[#143d34] p-3.5 shadow-[inset_2px_2px_5px_rgba(5,18,15,0.7),inset_-1px_-1px_4px_rgba(42,107,92,0.2)]">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C49A45] font-mono">
              <Shield className="h-3.5 w-3.5" /> Identity & Branding
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-[#E8DCC4]">Brand Name *</Label>
              <Input
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                placeholder="e.g. NovaPay"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-[#E8DCC4]">
                Aliases & Search Keywords
              </Label>
              <Input
                value={form.aliases}
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                placeholder="Comma separated (e.g. Nova Pay, NovaWallet)"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-[#E8DCC4]">Official Logo URL</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://... logo image link"
              />
            </div>
          </div>

          {/* Social Media Handles */}
          <div className="space-y-3.5 rounded-lg border border-[#2A6B5C]/40 bg-[#143d34] p-3.5 shadow-[inset_2px_2px_5px_rgba(5,18,15,0.7),inset_-1px_-1px_4px_rgba(42,107,92,0.2)]">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C49A45] font-mono">
              <Globe className="h-3.5 w-3.5" /> Approved Official Handles
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X (Twitter)</Label>
                <Input
                  value={form.x}
                  onChange={(e) => setForm({ ...form, x: e.target.value })}
                  placeholder="novapay"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Instagram</Label>
                <Input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="novapay_official"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Facebook</Label>
                <Input
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="novapay.finance"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Telegram</Label>
                <Input
                  value={form.telegram}
                  onChange={(e) => setForm({ ...form, telegram: e.target.value })}
                  placeholder="novapay_channel"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">YouTube</Label>
              <Input
                value={form.youtube}
                onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                placeholder="NovaPayOfficial"
              />
            </div>
          </div>

          {/* Apps & Domains */}
          <div className="space-y-3.5 rounded-lg border border-[#2A6B5C]/40 bg-[#143d34] p-3.5 shadow-[inset_2px_2px_5px_rgba(5,18,15,0.7),inset_-1px_-1px_4px_rgba(42,107,92,0.2)]">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C49A45] font-mono">
              <Smartphone className="h-3.5 w-3.5" /> Mobile Apps & Domains
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-[#E8DCC4]">Official Domains</Label>
              <Input
                value={form.domains}
                onChange={(e) => setForm({ ...form, domains: e.target.value })}
                placeholder="novapay.com, novapay.io"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-[#E8DCC4]">
                Approved App Package IDs
              </Label>
              <Input
                value={form.appIds}
                onChange={(e) => setForm({ ...form, appIds: e.target.value })}
                placeholder="com.novapay.app, com.novapay.wallet"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-[#E8DCC4]">
                Authorized App Publishers
              </Label>
              <Input
                value={form.publishers}
                onChange={(e) => setForm({ ...form, publishers: e.target.value })}
                placeholder="NovaPay Technologies Ltd"
              />
            </div>
          </div>
        </div>

        {/* Action Trigger - Dense Neomorphic Bar */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3.5 rounded-lg border border-[#2A6B5C]/60 bg-[#133c33] p-3.5 shadow-[2px_2px_6px_rgba(5,18,15,0.7)]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-[#C49A45]" />
            <div>
              <div className="text-xs font-bold text-[#E8DCC4]">
                Ready to execute automated candidate detection
              </div>
              <div className="text-[11px] text-muted-foreground">
                Generates candidates, ingests data, excludes approved baseline, and scores remaining
                impersonators.
              </div>
            </div>
          </div>

          <Button
            size="default"
            variant="default"
            onClick={handleRunFullScan}
            disabled={isScanning}
            className="w-full sm:w-auto font-mono text-xs font-bold h-8 px-4"
          >
            {isScanning ? (
              <span className="flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                Executing Pipeline...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 fill-current" />
                Execute Full Scan Pipeline
              </span>
            )}
          </Button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 8: CATEGORIZED SCAN REPORT (Spatial UI Theme for Threats)
         ───────────────────────────────────────────────────────────── */}
      {candidates.length > 0 && (
        <section id="threats-report" className="space-y-5">
          {/* KPI Summary Strip - Neomorphic Tiles */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <div className="neo-card p-3 border border-[#2A6B5C]/40">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Total Scanned
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-[#E8DCC4]">
                {candidates.length}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Profiles, pages & apps</div>
            </div>

            <div className="neo-card p-3 border border-[#36aa80]/40 bg-[#153f36]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#55cca0]">
                Official Verified
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-[#55cca0]">
                {official.length}
              </div>
              <div className="mt-0.5 text-[10px] text-[#55cca0]/70">Baseline excluded</div>
            </div>

            <div className="neo-card p-3 border border-[#C49A45]/40 bg-[#184239]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#C49A45]">
                Impersonations
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-[#C49A45]">
                {impersonations.length}
              </div>
              <div className="mt-0.5 text-[10px] text-[#C49A45]/70">Look-alikes & clones</div>
            </div>

            <div className="neo-card p-3 border border-[#e25252]/40 bg-[#1c3933]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#ff7575]">
                Likely Scams
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-[#ff7575]">{scams.length}</div>
              <div className="mt-0.5 text-[10px] text-[#ff7575]/70">Active fraud & lures</div>
            </div>

            <div className="neo-card p-3 border border-[#C49A45]/50 bg-[#17483e]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#E8DCC4]">
                Threat Ratio
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-[#C49A45]">
                {Math.round(((impersonations.length + scams.length) / candidates.length) * 100)}%
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Requiring review</div>
            </div>
          </div>

          {/* Categorized Report Explorer - Spatial UI Threat Telemetry Panel */}
          <div className="neo-card border border-[#2A6B5C]/60 shadow-[8px_8px_20px_rgba(4,16,13,0.85),-5px_-5px_14px_rgba(42,107,92,0.35)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2A6B5C]/40 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#123830] border border-[#C49A45]/60 text-[11px] font-bold text-[#C49A45] font-mono shadow-[inset_1px_1px_2px_rgba(0,0,0,0.6)]">
                    8
                  </span>
                  <h3 className="text-base font-bold text-[#E8DCC4]">Categorized Threat Report</h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Stored in ThreatLens database. Candidates analyzed across homoglyph, logo, and
                  keyword signals.
                </p>
              </div>

              {/* Search & Filter Controls - Dense */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search candidate, handle, bio..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const dataStr =
                      "data:text/json;charset=utf-8," +
                      encodeURIComponent(JSON.stringify(candidates, null, 2));
                    const dl = document.createElement("a");
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", `threatlens_scan_${Date.now()}.json`);
                    dl.click();
                    toast.success("Threat report exported as JSON");
                  }}
                  className="h-8 text-xs font-mono"
                >
                  <FileDown className="h-3 w-3 mr-1 text-[#C49A45]" /> Export JSON
                </Button>
              </div>
            </div>

            {/* Classification Tabs - Neomorphic Inset Ribbon */}
            <div className="flex items-center gap-1.5 border-b border-[#2A6B5C]/40 bg-[#133c33] px-4 py-2 overflow-x-auto text-xs font-mono">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-md px-2.5 py-1 text-xs transition-all ${
                  activeTab === "all"
                    ? "bg-[#C49A45] text-[#123F36] font-bold shadow-[inset_1px_1px_3px_rgba(60,40,5,0.7)]"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                All Candidates ({candidates.length})
              </button>
              <button
                onClick={() => setActiveTab("scam")}
                className={`rounded-md px-2.5 py-1 text-xs transition-all flex items-center gap-1.5 ${
                  activeTab === "scam"
                    ? "bg-[#e25252] text-white font-bold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.7)]"
                    : "text-[#ff8585] hover:bg-[#194339]"
                }`}
              >
                <Flame className="h-3 w-3" /> Likely Scam ({scams.length})
              </button>
              <button
                onClick={() => setActiveTab("impersonation")}
                className={`rounded-md px-2.5 py-1 text-xs transition-all flex items-center gap-1.5 ${
                  activeTab === "impersonation"
                    ? "bg-[#C49A45] text-[#123F36] font-bold shadow-[inset_1px_1px_3px_rgba(60,40,5,0.7)]"
                    : "text-[#e0b45a] hover:bg-[#194339]"
                }`}
              >
                <ShieldAlert className="h-3 w-3" /> Potential Impersonation ({impersonations.length}
                )
              </button>
              <button
                onClick={() => setActiveTab("official")}
                className={`rounded-md px-2.5 py-1 text-xs transition-all flex items-center gap-1.5 ${
                  activeTab === "official"
                    ? "bg-[#36aa80] text-[#123F36] font-bold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.7)]"
                    : "text-[#55cca0] hover:bg-[#194339]"
                }`}
              >
                <UserCheck className="h-3 w-3" /> Legitimate / Official ({official.length})
              </button>
            </div>

            {/* Candidate Cards Grid - Spatial UI Theme for Threats */}
            <div className="p-4">
              {filteredCandidates.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground font-mono">
                  No threat candidates match the selected filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCandidates.map((candidate, idx) => (
                    <CandidateCard
                      key={`${candidate.platform_or_store}-${candidate.handle_or_title}`}
                      candidate={candidate}
                      index={idx}
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
          FLOATING TAB IN THE CENTRE DOWN (Only taking space needed)
         ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-fit w-auto pointer-events-auto">
        <div className="neo-floating-dock rounded-full px-2 py-1.5 flex items-center gap-1.5 shadow-[0_14px_30px_rgba(4,15,13,0.9),-4px_-4px_14px_rgba(42,107,92,0.35),inset_0_1px_0_rgba(232,220,196,0.18)]">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title="Jump to Top / Flowchart"
            className="h-7 px-2.5 rounded-full text-[11px] font-mono text-[#E8DCC4] hover:text-[#C49A45] hover:bg-[#123830] transition-colors flex items-center gap-1"
          >
            <Layers className="h-3 w-3 text-[#C49A45]" />
            <span className="hidden sm:inline">Pipeline</span>
          </button>

          <div className="h-3.5 w-px bg-[#2A6B5C]/60" />

          {/* Quick tab switcher that takes only space needed */}
          <button
            onClick={() => setActiveTab("all")}
            className={`h-7 px-2.5 rounded-full text-[11px] font-mono transition-all flex items-center gap-1 ${
              activeTab === "all"
                ? "bg-[#C49A45] text-[#123F36] font-bold shadow-[inset_1px_1px_3px_rgba(60,40,5,0.6)]"
                : "text-[#E8DCC4] hover:bg-[#123830]"
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-80">({candidates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("scam")}
            className={`h-7 px-2.5 rounded-full text-[11px] font-mono transition-all flex items-center gap-1 ${
              activeTab === "scam"
                ? "bg-[#e25252] text-white font-bold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]"
                : "text-[#ff8585] hover:bg-[#123830]"
            }`}
          >
            <Flame className="h-3 w-3" />
            <span>Scams</span>
            <span className="text-[10px] opacity-80">({scams.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("impersonation")}
            className={`h-7 px-2.5 rounded-full text-[11px] font-mono transition-all flex items-center gap-1 ${
              activeTab === "impersonation"
                ? "bg-[#C49A45] text-[#123F36] font-bold shadow-[inset_1px_1px_3px_rgba(60,40,5,0.6)]"
                : "text-[#e0b45a] hover:bg-[#123830]"
            }`}
          >
            <ShieldAlert className="h-3 w-3" />
            <span className="hidden sm:inline">Impersonations</span>
            <span className="sm:hidden">Clones</span>
            <span className="text-[10px] opacity-80">({impersonations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("official")}
            className={`h-7 px-2.5 rounded-full text-[11px] font-mono transition-all flex items-center gap-1 ${
              activeTab === "official"
                ? "bg-[#36aa80] text-[#123F36] font-bold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]"
                : "text-[#55cca0] hover:bg-[#123830]"
            }`}
          >
            <UserCheck className="h-3 w-3" />
            <span className="hidden sm:inline">Official</span>
            <span className="text-[10px] opacity-80">({official.length})</span>
          </button>

          <div className="h-3.5 w-px bg-[#2A6B5C]/60" />

          {/* Quick Scan Button */}
          <Button
            size="sm"
            variant="default"
            onClick={handleRunFullScan}
            disabled={isScanning}
            className="h-7 px-3 rounded-full text-[11px] font-mono font-bold"
          >
            {isScanning ? (
              <RotateCcw className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3 fill-current" />
            )}
            <span className="hidden md:inline ml-1">{isScanning ? "Scanning..." : "Scan"}</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INSPECTION DRAWER MODAL (Spatial UI Viewport)
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
          TAKEDOWN NOTICE GENERATOR MODAL (Spatial Viewport)
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
// PIPELINE NODE STEP INDICATOR (Neomorphic Embossed/Debossed Nodes)
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
  key?: string | number;
}) {
  const isDone = current > step || current === 8;
  const isCurrent = current === step;

  return (
    <div
      className={`rounded-lg p-2.5 transition-all text-left ${
        isCurrent
          ? "bg-[#184e42] border border-[#C49A45] shadow-[3px_3px_8px_rgba(5,18,15,0.8),-2px_-2px_6px_rgba(42,107,92,0.35)]"
          : isDone
            ? "bg-[#143e34] border border-[#36aa80]/50 shadow-[inset_1px_1px_2px_rgba(5,18,15,0.6)]"
            : "bg-[#123830] border border-[#2A6B5C]/30 opacity-60 shadow-[inset_1px_1px_2px_rgba(5,18,15,0.7)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold font-mono ${
            isCurrent
              ? "bg-[#C49A45] text-[#123F36]"
              : isDone
                ? "bg-[#36aa80] text-[#123F36]"
                : "bg-[#1a4a3f] text-muted-foreground"
          }`}
        >
          {isDone ? "✓" : step}
        </span>
        {isCurrent && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C49A45] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C49A45]" />
          </span>
        )}
      </div>
      <div className="mt-1 font-mono text-[11px] font-bold text-[#E8DCC4] truncate">{title}</div>
      <div className="text-[10px] text-muted-foreground truncate">{desc}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE CARD COMPONENT (Spatial UI Theme for Threats)
// ─────────────────────────────────────────────────────────────────────────────
function CandidateCard({
  candidate,
  index,
  officialLogo,
  onInspect,
  onTakedown,
}: {
  candidate: ScanCandidate;
  index: number;
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
      className={`spatial-threat-card rounded-xl p-4 flex flex-col justify-between ${
        isOfficial
          ? "border-t-[#36aa80] border-[#2A6B5C]/40"
          : isScam
            ? "border-t-[#e25252] border-[#2A6B5C]/50"
            : "border-t-[#C49A45] border-[#2A6B5C]/50"
      }`}
    >
      <div>
        {/* Spatial HUD Coordinate Strip */}
        <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/80 mb-2 border-b border-[#2A6B5C]/30 pb-1">
          <span className="flex items-center gap-1">
            <Crosshair className="h-2.5 w-2.5 text-[#C49A45]" />
            THREAT-VEC // 0{index + 1}
          </span>
          <span className="text-[#C49A45] font-semibold">
            {candidate.platform_or_store.toUpperCase()}
          </span>
        </div>

        {/* Header Strip */}
        <div className="flex items-start justify-between gap-2 mt-1">
          <div className="flex items-center gap-2.5">
            {/* Candidate avatar - Tactile Recessed */}
            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-[#2A6B5C]/50 bg-[#123830] shadow-[inset_1px_1px_3px_rgba(5,18,15,0.8)]">
              {officialLogo ? (
                <img src={officialLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#C49A45]">
                  {candidate.handle_or_title[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-[#E8DCC4] truncate max-w-[160px]">
                {candidate.display_name}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground truncate max-w-[160px]">
                {candidate.package_id ? candidate.handle_or_title : `@${candidate.handle_or_title}`}
              </div>
            </div>
          </div>

          {/* Spatial Risk Score Pill */}
          <div
            className={`flex flex-col items-end rounded-md px-2 py-0.5 font-mono text-right shadow-[inset_1px_1px_2px_rgba(5,18,15,0.6)] border ${
              isOfficial
                ? "bg-[#143e34] border-[#36aa80]/50 text-[#55cca0]"
                : isScam
                  ? "bg-[#251717] border-[#e25252]/60 text-[#ff7575] font-bold"
                  : "bg-[#221e14] border-[#C49A45]/60 text-[#e0b45a] font-bold"
            }`}
          >
            <span className="text-xs font-bold leading-none">{candidate.risk_score}</span>
            <span className="text-[8px] uppercase tracking-wider opacity-80 leading-tight">
              {candidate.severity}
            </span>
          </div>
        </div>

        {/* Classification Badge & Platform */}
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="font-mono text-[10px] text-muted-foreground">
            {candidate.platform_or_store}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)] ${
              isOfficial
                ? "bg-[#143e34] text-[#55cca0] border border-[#36aa80]/50"
                : isScam
                  ? "bg-[#251717] text-[#ff7575] border border-[#e25252]/60"
                  : "bg-[#221e14] text-[#e0b45a] border border-[#C49A45]/60"
            }`}
          >
            {candidate.classification}
          </span>
        </div>

        {/* Bio or Description snippet */}
        <div className="mt-2 rounded bg-[#123830] border border-[#2A6B5C]/30 p-2 text-[11px] text-[#b8ab94] line-clamp-2 shadow-[inset_1px_1px_3px_rgba(5,18,15,0.7)] font-mono">
          {candidate.bio_or_description || "No bio telemetry detected."}
        </div>

        {/* Forensic Signal Tags */}
        <div className="mt-2.5 flex flex-wrap gap-1">
          <span className="rounded bg-[#123830] px-1.5 py-0.5 text-[9px] font-mono text-[#E8DCC4] border border-[#2A6B5C]/50">
            Logo: {candidate.logo_similarity}%
          </span>
          {candidate.signals["identity_similarity"] !== undefined && (
            <span className="rounded bg-[#123830] px-1.5 py-0.5 text-[9px] font-mono text-[#E8DCC4] border border-[#2A6B5C]/50">
              Name: {String(candidate.signals["identity_similarity"])}%
            </span>
          )}
          {candidate.verified && (
            <span className="rounded bg-[#153f36] text-[#55cca0] px-1.5 py-0.5 text-[9px] font-mono border border-[#36aa80]/40">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Card Actions - Dense Tactile Buttons */}
      <div className="mt-3.5 flex items-center gap-2 border-t border-[#2A6B5C]/40 pt-2.5">
        <Button
          variant="outline"
          size="sm"
          onClick={onInspect}
          className="flex-1 text-[11px] font-mono h-7"
        >
          <Eye className="h-3 w-3 mr-1 text-[#C49A45]" /> Inspect
        </Button>
        {!isOfficial && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onTakedown}
            className="text-[11px] font-mono h-7 px-3"
          >
            <ShieldAlert className="h-3 w-3 mr-1" /> Takedown
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSPECTOR MODAL WITH DEEP SIGNAL BREAKDOWN (Spatial Viewport)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d2722]/85 p-4">
      <div className="spatial-viewport relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl p-5 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(232,220,196,0.2)] border border-[#2A6B5C]/60">
        <div className="flex items-start justify-between border-b border-[#2A6B5C]/40 pb-3.5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#C49A45]">
              ThreatLens Candidate Forensic Telemetry
            </div>
            <h3 className="text-lg font-bold text-[#E8DCC4]">{candidate.display_name}</h3>
            <div className="font-mono text-xs text-[#C49A45]">
              {candidate.package_id ? candidate.handle_or_title : `@${candidate.handle_or_title}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-[#123830] hover:text-white transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Homoglyph / Typo comparison - Spatial Plane */}
          <div className="rounded-lg border border-[#2A6B5C]/40 bg-[#123830] p-3.5 space-y-1.5 shadow-[inset_2px_2px_5px_rgba(5,18,15,0.7)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#C49A45] font-mono">
              Homoglyph & Typo Character Analysis
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-muted-foreground">Target:</span>
              <span className="rounded bg-[#16443b] px-2 py-0.5 font-bold text-[#E8DCC4] border border-[#2A6B5C]/60">
                <HandleDiff handle={candidate.handle_or_title} />
              </span>
              <span className="text-muted-foreground">vs Baseline:</span>
              <span className="rounded bg-[#143e34] border border-[#36aa80]/50 px-2 py-0.5 text-[#55cca0] font-bold">
                {brand.name.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Signals Breakdown */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-lg border border-[#2A6B5C]/40 bg-[#123830] p-2.5 shadow-[inset_1px_1px_3px_rgba(5,18,15,0.6)]">
              <div className="text-[9px] font-mono uppercase text-muted-foreground">Logo Match</div>
              <div className="mt-1 text-lg font-bold font-mono text-[#E8DCC4]">
                {candidate.logo_similarity}%
              </div>
            </div>
            <div className="rounded-lg border border-[#e25252]/40 bg-[#1e1c1c] p-2.5 shadow-[inset_1px_1px_3px_rgba(5,18,15,0.6)]">
              <div className="text-[9px] font-mono uppercase text-muted-foreground">Risk Score</div>
              <div className="mt-1 text-lg font-bold font-mono text-[#ff7575]">
                {candidate.risk_score} / 100
              </div>
            </div>
            <div className="rounded-lg border border-[#2A6B5C]/40 bg-[#123830] p-2.5 shadow-[inset_1px_1px_3px_rgba(5,18,15,0.6)]">
              <div className="text-[9px] font-mono uppercase text-muted-foreground">Platform</div>
              <div className="mt-1 text-xs font-bold text-[#E8DCC4] truncate">
                {candidate.platform_or_store}
              </div>
            </div>
            <div className="rounded-lg border border-[#2A6B5C]/40 bg-[#123830] p-2.5 shadow-[inset_1px_1px_3px_rgba(5,18,15,0.6)]">
              <div className="text-[9px] font-mono uppercase text-muted-foreground">Status</div>
              <div className="mt-1 text-xs font-bold text-[#C49A45] truncate">
                {candidate.classification}
              </div>
            </div>
          </div>

          {/* Rationale and Flagged Reasons */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#C49A45] font-mono">
              Explainable Risk Reasons
            </div>
            <ul className="space-y-1">
              {candidate.reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded bg-[#123830] p-2 text-xs text-[#E8DCC4] border border-[#2A6B5C]/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] font-mono"
                >
                  <span className="text-[#ff7575]">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Raw Bio Content */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Profile Bio / App Description
            </div>
            <div className="rounded bg-[#123830] border border-[#2A6B5C]/40 p-2.5 font-mono text-xs text-[#b8ab94] shadow-[inset_1px_1px_3px_rgba(5,18,15,0.7)]">
              {candidate.bio_or_description || "No bio text provided."}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-[#2A6B5C]/40 pt-3.5">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-mono">
            Close
          </Button>
          {candidate.classification !== "Legitimate / official" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onTakedown}
              className="text-xs font-mono font-bold"
            >
              <ShieldAlert className="h-3 w-3 mr-1" /> Prepare Takedown Notice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAKEDOWN NOTICE GENERATOR MODAL (Spatial Viewport)
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
Ref: ThreatLens-Takedown-${Date.now().toString(36).toUpperCase()}

1. COMPLAINANT IDENTIFICATION
Brand Name: ${brand.name}
Official Baseline Domains: ${brand.domains.join(", ")}
Official Channels: ${Object.entries(brand.handles)
      .map(([k, v]) => `${k}: @${v}`)
      .join(", ")}

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

Generated via ThreatLens Threat Intelligence Platform.`;
  }, [candidate, brand]);

  const copyNotice = () => {
    navigator.clipboard.writeText(noticeText);
    toast.success("Takedown notice copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d2722]/85 p-4">
      <div className="spatial-viewport relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl p-5 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(232,220,196,0.2)] border border-[#2A6B5C]/60">
        <div className="flex items-start justify-between border-b border-[#2A6B5C]/40 pb-3.5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff7575]">
              ThreatLens Legal Abuse Package
            </div>
            <h3 className="text-lg font-bold text-[#E8DCC4]">
              Takedown Notice: {candidate.display_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-[#123830] hover:text-white transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3.5">
          <Label className="text-xs font-mono text-[#C49A45]">Pre-Formatted Legal Notice</Label>
          <textarea
            readOnly
            value={noticeText}
            className="mt-1.5 h-64 w-full rounded-md border border-[#2A6B5C]/50 bg-[#123830] p-3 font-mono text-xs text-[#E8DCC4] focus:outline-none shadow-[inset_2px_2px_5px_rgba(5,18,15,0.8)]"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-[#2A6B5C]/40 pt-3.5">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-mono">
            Close
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={copyNotice}
            className="text-xs font-mono font-bold"
          >
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
