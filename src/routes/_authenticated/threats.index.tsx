import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowUpDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, useThreats } from "@/lib/data";
import { useShell } from "@/components/sx/AppShell";
import { EmptyState, PageHeader, PlatformIcon, SeverityBadge, Skel, StatusChip } from "@/components/sx/primitives";
import { HandleDiff } from "@/components/sx/HandleDiff";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS, STATUSES, THREAT_TYPES } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/threats/")({
  head: () => ({ meta: [{ title: "Threats — SentinelX" }, { name: "description", content: "All detected impostor accounts." }, { property: "og:title", content: "Threats — SentinelX" }, { property: "og:description", content: "All detected impostor accounts." }] }),
  component: ThreatsPage,
});

type SortKey = "risk_score" | "detected_at" | "followers";

function ThreatsPage() {
  const { brand } = useShell();
  const q = useThreats(brand?.id);
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sev, setSev] = useState("all");
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: "risk_score", d: -1 });
  const [sel, setSel] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? [])
      .filter((t) => (platform === "all" || t.platform === platform) && (type === "all" || t.type === type) && (status === "all" || t.status === status) && (sev === "all" || t.severity === sev))
      .filter((t) => !s || t.handle.toLowerCase().includes(s) || (t.display_name ?? "").toLowerCase().includes(s) || (t.bio ?? "").toLowerCase().includes(s))
      .sort((a, b) => { const av = a[sort.k], bv = b[sort.k]; return (av! > bv! ? 1 : av! < bv! ? -1 : 0) * sort.d; });
  }, [q.data, search, platform, type, status, sev, sort]);

  async function bulk(newStatus: string) {
    const ids = [...sel];
    const { error } = await supabase.from("threats").update({ status: newStatus }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} threats → ${newStatus}`);
    setSel(new Set());
    invalidate("threats");
  }
  const toggleSort = (k: SortKey) => setSort((s) => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : -1 }));
  const allSel = rows.length > 0 && rows.every((r) => sel.has(r.id));

  return (
    <div>
      <PageHeader title="Threats" sub={`${rows.length} of ${q.data?.length ?? 0} detections`} />
      <div className="panel mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search handle, name or bio…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Filter value={platform} onChange={setPlatform} label="Platform" opts={[...PLATFORMS]} />
        <Filter value={type} onChange={setType} label="Type" opts={[...THREAT_TYPES]} />
        <Filter value={sev} onChange={setSev} label="Severity" opts={["critical", "high", "medium", "low"]} />
        <Filter value={status} onChange={setStatus} label="Status" opts={[...STATUSES]} />
      </div>
      {sel.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="glass mb-4 flex flex-wrap items-center gap-2 rounded-xl p-3">
          <span className="mr-2 font-mono text-sm">{sel.size} selected</span>
          {["Under Review", "Confirmed", "Takedown Requested", "Resolved", "False Positive"].map((s) => <Button key={s} size="sm" variant="secondary" onClick={() => bulk(s)}>{s}</Button>)}
        </motion.div>
      )}
      {q.isLoading ? <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-12" />)}</div> : !rows.length ? <EmptyState title="No matching threats" body="Try clearing a filter or run a new scan." /> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead><tr className="text-left">
              <th className="w-10 px-4 py-3"><Checkbox checked={allSel} onCheckedChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="Select all" /></th>
              <th className="label-caps px-3 py-3">Account</th>
              <th className="label-caps px-3 py-3">Type</th>
              <th className="px-3 py-3"><button className="label-caps flex items-center gap-1" onClick={() => toggleSort("risk_score")}>Risk <ArrowUpDown className="h-3 w-3" /></button></th>
              <th className="label-caps px-3 py-3">Severity</th>
              <th className="px-3 py-3"><button className="label-caps flex items-center gap-1" onClick={() => toggleSort("followers")}>Followers <ArrowUpDown className="h-3 w-3" /></button></th>
              <th className="label-caps px-3 py-3">Status</th>
              <th className="px-4 py-3"><button className="label-caps flex items-center gap-1" onClick={() => toggleSort("detected_at")}>Detected <ArrowUpDown className="h-3 w-3" /></button></th>
            </tr></thead>
            <tbody>
              {rows.map((t, i) => (
                <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.02 }} className="row-accent cursor-pointer border-t border-border" onClick={() => navigate({ to: "/threats/$id", params: { id: t.id } })}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={sel.has(t.id)} onCheckedChange={() => { const n = new Set(sel); n.has(t.id) ? n.delete(t.id) : n.add(t.id); setSel(n); }} aria-label={`Select ${t.handle}`} /></td>
                  <td className="px-3 py-3"><div className="flex items-center gap-3"><PlatformIcon platform={t.platform} className="text-muted-foreground" /><div><div className="font-mono">@<HandleDiff handle={t.handle} /></div><div className="text-xs text-muted-foreground">{t.display_name}</div></div></div></td>
                  <td className="px-3 py-3 text-muted-foreground">{t.type}</td>
                  <td className="px-3 py-3"><span className="font-mono text-base font-bold tabular" style={{ color: `var(--${t.severity})` }}>{t.risk_score}</span></td>
                  <td className="px-3 py-3"><SeverityBadge severity={t.severity} /></td>
                  <td className="px-3 py-3 font-mono text-muted-foreground">{t.followers.toLocaleString()}</td>
                  <td className="px-3 py-3"><StatusChip status={t.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{new Date(t.detected_at).toLocaleDateString()}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Filter({ value, onChange, label, opts }: { value: string; onChange: (v: string) => void; label: string; opts: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px] capitalize" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">All {label.toLowerCase()}</SelectItem>{opts.map((o) => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
