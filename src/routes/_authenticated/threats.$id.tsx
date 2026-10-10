import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate } from "@/lib/data";
import { useShell } from "@/components/sx/AppShell";
import {
  Avatar,
  PageHeader,
  PlatformIcon,
  RiskGauge,
  SeverityBadge,
  Skel,
  StatusChip,
} from "@/components/sx/primitives";
import { HandleDiff } from "@/components/sx/HandleDiff";
import { AIPanel, highlight } from "@/components/sx/AIPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES } from "@/lib/monitoring";
import { WEIGHTS, finalScore, severityOf } from "@/lib/scoring";
import { analyzeScam } from "@/lib/ai.functions";
import { createTakedownReport } from "@/lib/reports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/threats/$id")({
  head: () => ({
    meta: [
      { title: "Threat detail — SentinelX" },
      { name: "description", content: "Risk breakdown and AI analysis." },
      { property: "og:title", content: "Threat detail — SentinelX" },
      { property: "og:description", content: "Risk breakdown and AI analysis." },
    ],
  }),
  component: ThreatDetail,
});

type Signals = {
  handle: number;
  handle_similarity: number;
  keyword_flags: string[];
  homoglyphs: number[];
  logo: number;
  ai: number;
  account: number;
  age_days: number;
};

function ThreatDetail() {
  const { id } = Route.useParams();
  const { brand } = useShell();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeScam);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");

  const q = useQuery({
    queryKey: ["threat", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("threats").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const notes = useQuery({
    queryKey: ["notes", id],
    queryFn: async () =>
      (
        await supabase
          .from("analyst_notes")
          .select("*")
          .eq("threat_id", id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const t = q.data;
  const refresh = () => {
    q.refetch();
    invalidate("threats");
  };

  if (q.isLoading || !t || !brand)
    return (
      <div className="space-y-4">
        <Skel className="h-10 w-72" />
        <Skel className="h-72" />
        <Skel className="h-48" />
      </div>
    );
  const s = t.signals as unknown as Signals;
  const official = (brand.handles as Record<string, string>)[t.platform] ?? brand.name;
  const ageDays =
    s.age_days ??
    Math.round((Date.now() - new Date(t.account_created_at ?? Date.now()).getTime()) / 864e5);

  async function setStatus(st: string) {
    const { error } = await supabase.from("threats").update({ status: st }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Status → ${st}`);
    refresh();
  }
  async function rerun() {
    setRunning(true);
    try {
      const ai = await analyze({
        data: {
          brand: brand!.name,
          handle: t!.handle,
          bio: t!.bio ?? "",
          context: `Display name: ${t!.display_name}. Platform: ${t!.platform}. Followers: ${t!.followers}.`,
        },
      });
      const aiScore = Math.round(ai.scam_probability * 100);
      const score = finalScore({ handle: s.handle, logo: s.logo, ai: aiScore, account: s.account });
      await supabase
        .from("threats")
        .update({
          ai_analysis: ai,
          risk_score: score,
          severity: severityOf(score),
          signals: { ...s, ai: aiScore },
        })
        .eq("id", id);
      toast.success("AI analysis updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setRunning(false);
    }
  }
  async function addNote() {
    if (!note.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("analyst_notes")
      .insert({ threat_id: id, body: note.trim(), user_id: u.user!.id });
    if (error) return toast.error(error.message);
    setNote("");
    notes.refetch();
  }
  async function report() {
    try {
      const r = await createTakedownReport(brand!, { kind: "threat", t: t! });
      toast.success("Takedown report generated");
      invalidate("reports", "threats");
      navigate({ to: "/reports/$id", params: { id: r.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const breakdown = [
    {
      label: "Handle similarity",
      v: s.handle,
      w: WEIGHTS.handle,
      note: `${s.handle_similarity}% match${s.homoglyphs?.length ? " · homoglyphs" : ""}${s.keyword_flags?.length ? ` · +${s.keyword_flags.join(", ")}` : ""}`,
    },
    {
      label: "Logo / avatar similarity",
      v: s.logo,
      w: WEIGHTS.logo,
      note: `${s.logo}% visual match`,
    },
    { label: "AI scam-content", v: s.ai, w: WEIGHTS.ai, note: `p=${(s.ai / 100).toFixed(2)}` },
    {
      label: "Account signals",
      v: s.account,
      w: WEIGHTS.account,
      note: `${ageDays}d old · ${t.followers.toLocaleString()} followers · ${t.verified ? "verified" : "unverified"}`,
    },
  ];

  return (
    <div>
      <Link
        to="/threats"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All threats
      </Link>
      <PageHeader
        title={`@${t.handle}`}
        sub={`${t.type} · ${t.platform} · detected ${new Date(t.detected_at).toLocaleString()}`}
        actions={
          <>
            <StatusChip status={t.status} />
            <Button onClick={report}>
              <FileWarning />
              Generate Takedown Report
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="panel p-5">
          <div className="label-caps mb-4">Spot the fake</div>
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileCard
              tone="fake"
              title="Suspicious"
              avatar={t.avatar_url}
              name={t.display_name ?? t.handle}
              handle={<HandleDiff handle={t.handle} />}
              bio={highlight(t.bio ?? "")}
              followers={t.followers}
              created={t.account_created_at}
              verified={t.verified}
              platform={t.platform}
              flags={{
                followers: t.followers < 50000,
                created: ageDays < 365,
                verified: !t.verified,
              }}
            />
            <ProfileCard
              tone="real"
              title="Official"
              avatar={brand.logo_url}
              name={brand.name}
              handle={official}
              bio={`Approved official ${t.platform} asset from this brand's registry.`}
              followers={0}
              verified
              platform={t.platform}
            />
          </div>
        </div>
        <div className="panel flex flex-col items-center p-5">
          <div className="label-caps self-start">Risk score</div>
          <RiskGauge score={t.risk_score} />
          <SeverityBadge severity={t.severity} className="mb-4" />
          <div className="w-full space-y-3">
            {breakdown.map((b, i) => (
              <div key={b.label}>
                <div className="flex justify-between text-xs">
                  <span>
                    {b.label} <span className="text-muted-foreground">×{b.w}</span>
                  </span>
                  <span className="font-mono">{b.v}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.v}%` }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-risk"
                    style={{ backgroundSize: `${10000 / Math.max(b.v, 1)}% 100%` }}
                  />
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{b.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <AIPanel ai={t.ai_analysis as never} bio={t.bio ?? ""} onRerun={rerun} running={running} />
        <div className="panel p-5">
          <div className="label-caps mb-3">Update status</div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((st) => (
              <Button
                key={st}
                size="sm"
                variant={t.status === st ? "default" : "secondary"}
                onClick={() => setStatus(st)}
              >
                {st}
              </Button>
            ))}
          </div>
          <div className="label-caps mb-2 mt-6">Analyst notes</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context for your team…"
            rows={3}
          />
          <Button size="sm" className="mt-2" onClick={addNote}>
            Add note
          </Button>
          <div className="mt-4 space-y-2">
            {(notes.data ?? []).map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-border bg-background/50 p-3 text-sm"
              >
                <div>{n.body}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({
  tone,
  title,
  avatar,
  name,
  handle,
  bio,
  followers,
  created,
  verified,
  platform,
  flags,
}: {
  tone: "fake" | "real";
  title: string;
  avatar?: string | null;
  name: string;
  handle: React.ReactNode;
  bio: React.ReactNode;
  followers: number;
  created?: string | null;
  verified: boolean;
  platform: string;
  flags?: { followers: boolean; created: boolean; verified: boolean };
}) {
  const flag = (b?: boolean) => cn("font-mono", b && "text-critical");
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "fake" ? "border-critical/40 bg-critical/5" : "border-low/30 bg-low/5",
      )}
    >
      <div className={cn("label-caps mb-3", tone === "fake" ? "text-critical" : "text-low")}>
        {title}
      </div>
      <div className="flex items-center gap-3">
        <Avatar src={avatar} name={name} className="h-14 w-14" />
        <div className="min-w-0">
          <div className="flex items-center gap-1 font-semibold">
            {name}
            {verified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </div>
          <div className="truncate font-mono text-sm text-muted-foreground">@{handle}</div>
        </div>
        <PlatformIcon platform={platform} className="ml-auto text-muted-foreground" />
      </div>
      <p className="mt-4 min-h-[4rem] text-sm leading-relaxed">{bio}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <div>
          <dt className="label-caps">Followers</dt>
          <dd className={flag(flags?.followers)}>{followers.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="label-caps">Created</dt>
          <dd className={flag(flags?.created)}>
            {created ? new Date(created).toLocaleDateString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="label-caps">Verified</dt>
          <dd className={flag(flags?.verified)}>{verified ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </div>
  );
}
