import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Radar } from "lucide-react";
import { useApps, useReports, useThreats } from "@/lib/data";
import { useShell } from "@/components/sx/AppShell";
import {
  CountUp,
  EmptyState,
  PageHeader,
  PlatformIcon,
  SeverityBadge,
  Skel,
  Sparkline,
  StatusChip,
  fadeUp,
} from "@/components/sx/primitives";
import { ThreatGraph } from "@/components/sx/ThreatGraph";
import { Button } from "@/components/ui/button";
import { PLATFORMS } from "@/lib/monitoring";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SentinelX" },
      { name: "description", content: "Brand threat overview." },
      { property: "og:title", content: "Dashboard — SentinelX" },
      { property: "og:description", content: "Brand threat overview." },
    ],
  }),
  component: Dashboard,
});

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <div className="text-muted-foreground">{label ?? payload[0].name}</div>
      <div className="font-mono text-sm font-bold">{payload[0].value}</div>
    </div>
  );
}

function Dashboard() {
  const { brand, runScan } = useShell();
  const threats = useThreats(brand?.id);
  const apps = useApps(brand?.id);
  const reports = useReports(brand?.id);
  const navigate = useNavigate();
  const t = threats.data ?? [];

  const stats = useMemo(() => {
    const day = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    const series = Array.from({ length: 14 }, (_, i) => {
      const d = 13 - i;
      return {
        day: new Date(Date.now() - d * 86400000).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        }),
        count: t.filter((x) => day(x.detected_at) === d).length,
        critical: t.filter((x) => day(x.detected_at) === d && x.severity === "critical").length,
      };
    });
    const thisWeek = t.filter((x) => day(x.detected_at) < 7).length,
      lastWeek = t.filter((x) => day(x.detected_at) >= 7 && day(x.detected_at) < 14).length;
    const delta = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 100;
    return {
      series,
      delta,
      byPlatform: PLATFORMS.map((p) => ({
        name: p,
        value: t.filter((x) => x.platform === p).length,
      })),
      bySev: ["critical", "high", "medium", "low"].map((s) => ({
        name: s,
        value: t.filter((x) => x.severity === s).length,
      })),
    };
  }, [t]);

  if (threats.isLoading)
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skel key={i} className="h-36" />
        ))}
      </div>
    );
  if (!t.length)
    return (
      <EmptyState
        title="No threats yet"
        body="Run your first scan to sweep 5 social platforms and app stores for impostors."
        action={
          <Button onClick={runScan}>
            <Radar />
            Run first scan
          </Button>
        }
      />
    );

  const crit = t.filter((x) => x.severity === "critical");
  const spark = stats.series.map((s) => s.count);
  const kpis = [
    { label: "Total threats", value: t.length, color: "var(--primary)", data: spark },
    {
      label: "Critical",
      value: crit.length,
      color: "var(--critical)",
      data: stats.series.map((s) => s.critical),
    },
    {
      label: "Impersonating accounts",
      value: t.filter((x) => x.type === "Impersonation").length,
      color: "var(--violet)",
      data: spark.map((v, i) => (v + i) % 4),
    },
    {
      label: "Suspicious apps",
      value: apps.data?.length ?? 0,
      color: "var(--high)",
      data: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, apps.data?.length ?? 0],
    },
    {
      label: "Takedowns filed",
      value:
        (reports.data?.length ?? 0) + t.filter((x) => x.status === "Takedown Requested").length,
      color: "var(--low)",
      data: [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Command center"
        sub={`Simulated monitoring for ${brand?.name} across ${PLATFORMS.length} platforms + Play Store`}
        actions={
          <Button onClick={runScan}>
            <Radar />
            Run simulated scan
          </Button>
        }
      />

      <div className="mb-4 rounded-lg border border-primary/25 bg-primary/5 px-4 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-primary">Simulated scan data.</span> This MVP generates
        brand-specific candidates; it does not crawl real social platforms or app stores.
      </div>

      <div className="panel mb-4 flex items-center overflow-hidden py-2.5">
        <div className="label-caps z-10 shrink-0 border-r border-border bg-surface px-4 text-critical">
          ● Live
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex w-max gap-8 animate-ticker whitespace-nowrap px-4 font-mono text-xs">
            {[...t.slice(0, 12), ...t.slice(0, 12)].map((x, i) => (
              <span key={i} className="flex items-center gap-2 text-muted-foreground">
                <PlatformIcon platform={x.platform} className="h-3.5 w-3.5" />
                <span className="text-foreground">@{x.handle}</span>
                <span style={{ color: `var(--${x.severity})` }}>{x.risk_score}</span>
                <span>
                  {new Date(x.detected_at).toLocaleTimeString("en", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={i}
            className="panel panel-hover p-4"
          >
            <div className="label-caps">{k.label}</div>
            <div className="mt-2 flex items-end justify-between">
              <CountUp value={k.value} className="font-mono text-3xl font-bold" />
              {i === 0 && (
                <span
                  className={`font-mono text-xs ${stats.delta >= 0 ? "text-critical" : "text-low"}`}
                >
                  {stats.delta >= 0 ? "▲" : "▼"}
                  {Math.abs(stats.delta)}% wk
                </span>
              )}
            </div>
            <div className="mt-3">
              <Sparkline data={k.data} color={k.color} id={String(i)} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={5}
          className="panel p-5 lg:col-span-2"
        >
          <div className="label-caps mb-4">Threats over time · 14 days</div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={stats.series}>
                <defs>
                  <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="1" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border)" }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#ar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={6}
          className="panel p-5"
        >
          <div className="label-caps mb-2">Severity mix</div>
          <div className="relative h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats.bySev}
                  dataKey="value"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {stats.bySev.map((s) => (
                    <Cell key={s.name} fill={`var(--${s.name})`} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-bold">{crit.length}</span>
              <span className="label-caps">critical</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.bySev.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <SeverityBadge severity={s.name} />
                <span className="font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={7}
          className="panel p-5"
        >
          <div className="label-caps mb-4">By platform</div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={stats.byPlatform} layout="vertical">
                <defs>
                  <linearGradient id="br" x1="0" x2="1">
                    <stop offset="0" stopColor="var(--violet)" />
                    <stop offset="1" stopColor="var(--primary)" />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="value" fill="url(#br)" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={8}
          className="panel overflow-hidden lg:col-span-2"
        >
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="label-caps">Threat graph</div>
            <Link to="/graph" className="text-xs text-primary hover:underline">
              Open full graph →
            </Link>
          </div>
          <ThreatGraph
            height={260}
            brandName={brand?.name ?? ""}
            logo={brand?.logo_url}
            nodes={t.map((x) => ({
              id: x.id,
              label: x.handle,
              platform: x.platform,
              risk: x.risk_score,
              severity: x.severity,
            }))}
            onSelect={(id) => navigate({ to: "/threats/$id", params: { id } })}
          />
        </motion.div>
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={9}
        className="panel mt-4 overflow-hidden"
      >
        <div className="flex items-center justify-between p-5">
          <div className="label-caps">Latest critical threats</div>
          <Link to="/threats" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {crit.slice(0, 6).map((x) => (
                <tr
                  key={x.id}
                  className="row-accent cursor-pointer border-t border-border"
                  onClick={() => navigate({ to: "/threats/$id", params: { id: x.id } })}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={x.platform} className="text-muted-foreground" />
                      <span className="font-mono">@{x.handle}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{x.type}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono font-bold text-critical">{x.risk_score}</span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={x.status} />
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">
                    {new Date(x.detected_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
