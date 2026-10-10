import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AlertTriangle, FileWarning, Star } from "lucide-react";
import { RISKY_PERMISSIONS } from "@/lib/scoring";
import { useApps, useInvalidate } from "@/lib/data";
import { useShell } from "@/components/sx/AppShell";
import { EmptyState, PageHeader, SeverityBadge, Skel, StatusChip, fadeUp } from "@/components/sx/primitives";
import { Button } from "@/components/ui/button";
import { createTakedownReport } from "@/lib/reports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/apps")({
  head: () => ({ meta: [{ title: "Suspicious apps — SentinelX" }, { name: "description", content: "Look-alike apps impersonating your brand." }, { property: "og:title", content: "Suspicious apps — SentinelX" }, { property: "og:description", content: "Look-alike apps impersonating your brand." }] }),
  component: AppsPage,
});

function AppsPage() {
  const { brand } = useShell();
  const q = useApps(brand?.id);
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  if (q.isLoading) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-80" />)}</div>;
  const apps = q.data ?? [];
  return (
    <div>
      <PageHeader title="Suspicious apps" sub={`${apps.length} look-alike apps · official: ${brand?.app_ids.join(", ") || "not set"}`} />
      {!apps.length ? <EmptyState title="No rogue apps found" body="We'll flag look-alike apps here as soon as they appear in app stores." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((a, i) => {
            const sig = a.signals as { name_similarity: number; icon_similarity: number; developer_mismatch: boolean };
            const ai = a.ai_analysis as { explanation?: string } | null;
            return (
              <motion.div key={a.id} variants={fadeUp} initial="hidden" animate="show" custom={i} className={cn("panel panel-hover flex flex-col p-5", a.severity === "critical" && "border-critical/30")}>
                <div className="flex items-start gap-4">
                  <div className="relative">
                    {brand?.logo_url ? <img src={brand.logo_url} alt="" className="h-14 w-14 rounded-2xl" style={{ filter: `hue-rotate(${i * 25}deg) saturate(${0.8 + i * 0.1})` }} /> : <div className="h-14 w-14 rounded-2xl bg-gradient-brand" />}
                    <span className="absolute -bottom-1 -right-1 rounded bg-background px-1 font-mono text-[10px] text-high">{sig.icon_similarity}%</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-tight">{a.title}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">{a.package_id}</div>
                    <div className={cn("mt-1 flex items-center gap-1 text-xs", sig.developer_mismatch ? "text-critical" : "text-muted-foreground")}>{sig.developer_mismatch && <AlertTriangle className="h-3 w-3" />}{a.developer}</div>
                  </div>
                  <div className="text-right"><div className="font-mono text-2xl font-bold" style={{ color: `var(--${a.severity})` }}>{a.risk_score}</div><SeverityBadge severity={a.severity} /></div>
                </div>
                <div className="mt-4 flex gap-4 font-mono text-xs text-muted-foreground"><span>{a.installs} installs</span><span className="flex items-center gap-1"><Star className="h-3 w-3" />{a.rating}</span><span>{a.store}</span></div>
                <div className="mt-4 flex flex-wrap gap-1.5">{a.permissions.map((p) => <span key={p} className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[10px]", RISKY_PERMISSIONS.includes(p) ? "border-critical/30 bg-critical/10 text-critical" : "border-border text-muted-foreground")}>{p}</span>)}</div>
                <p className="mt-4 flex-1 text-sm text-muted-foreground">{ai?.explanation}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <StatusChip status={a.status} />
                  <Button size="sm" variant="outline" onClick={async () => { try { const r = await createTakedownReport(brand!, { kind: "app", a }); invalidate("apps", "reports"); toast.success("Report generated"); navigate({ to: "/reports/$id", params: { id: r.id } }); } catch (e) { toast.error(String(e)); } }}><FileWarning />Takedown</Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
