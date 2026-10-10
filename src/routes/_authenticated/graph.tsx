import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApps, useThreats } from "@/lib/data";
import { useShell } from "@/components/sx/AppShell";
import { PageHeader, SeverityBadge, Skel } from "@/components/sx/primitives";
import { ThreatGraph } from "@/components/sx/ThreatGraph";

export const Route = createFileRoute("/_authenticated/graph")({
  head: () => ({ meta: [{ title: "Threat graph — SentinelX" }, { name: "description", content: "Network view of impostors around your brand." }, { property: "og:title", content: "Threat graph — SentinelX" }, { property: "og:description", content: "Network view of impostors around your brand." }] }),
  component: GraphPage,
});

function GraphPage() {
  const { brand } = useShell();
  const t = useThreats(brand?.id);
  const a = useApps(brand?.id);
  const navigate = useNavigate();
  if (t.isLoading) return <Skel className="h-[640px]" />;
  const nodes = [
    ...(t.data ?? []).map((x) => ({ id: x.id, label: x.handle, platform: x.platform, risk: x.risk_score, severity: x.severity })),
    ...(a.data ?? []).map((x) => ({ id: "app:" + x.id, label: x.title, platform: "Play Store", risk: x.risk_score, severity: x.severity })),
  ];
  return (
    <div>
      <PageHeader title="Threat graph" sub="Node size = risk · color = severity · clustered by platform. Click a node to investigate." actions={<div className="flex gap-1.5">{["critical", "high", "medium", "low"].map((s) => <SeverityBadge key={s} severity={s} />)}</div>} />
      <div className="panel p-2">
        <ThreatGraph nodes={nodes} brandName={brand?.name ?? ""} logo={brand?.logo_url} height={680} onSelect={(id) => id.startsWith("app:") ? navigate({ to: "/apps" }) : navigate({ to: "/threats/$id", params: { id } })} />
      </div>
    </div>
  );
}
