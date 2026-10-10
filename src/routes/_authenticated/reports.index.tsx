import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useReports } from "@/lib/data";
import { useShell } from "@/components/sx/AppShell";
import { EmptyState, PageHeader, PlatformIcon, Skel, StatusChip } from "@/components/sx/primitives";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Takedown reports — SentinelX" }, { name: "description", content: "All generated takedown reports." }, { property: "og:title", content: "Takedown reports — SentinelX" }, { property: "og:description", content: "All generated takedown reports." }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { brand } = useShell();
  const q = useReports(brand?.id);
  const navigate = useNavigate();
  if (q.isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skel key={i} className="h-14" />)}</div>;
  const rows = q.data ?? [];
  return (
    <div>
      <PageHeader title="Takedown reports" sub={`${rows.length} reports`} />
      {!rows.length ? <EmptyState title="No reports yet" body="Open any threat and click “Generate Takedown Report” to create a formal complaint." /> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left"><th className="label-caps px-5 py-3">Target</th><th className="label-caps px-3 py-3">Platform</th><th className="label-caps px-3 py-3">Status</th><th className="label-caps px-5 py-3 text-right">Created</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="row-accent cursor-pointer border-t border-border" onClick={() => navigate({ to: "/reports/$id", params: { id: r.id } })}>
                <td className="px-5 py-3 font-mono">{(r.content as { target?: string }).target ?? r.title}</td>
                <td className="px-3 py-3"><span className="flex items-center gap-2"><PlatformIcon platform={r.platform ?? ""} className="text-muted-foreground" />{r.platform}</span></td>
                <td className="px-3 py-3"><StatusChip status={r.status} /></td>
                <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
