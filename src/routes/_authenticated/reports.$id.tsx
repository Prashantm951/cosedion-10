import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, ExternalLink, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate } from "@/lib/data";
import { Skel, StatusChip } from "@/components/sx/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  head: () => ({ meta: [{ title: "Takedown report — SentinelX" }, { name: "description", content: "Printable takedown report." }, { property: "og:title", content: "Takedown report — SentinelX" }, { property: "og:description", content: "Printable takedown report." }] }),
  component: ReportDetail,
});

type Content = { target: string; platform: string; official?: string; letter: string; date: string; report_link?: string; brand: { name: string; domains: string[]; phones: string[]; keywords: string[] }; evidence: Record<string, unknown> & { signals?: Record<string, unknown>; ai?: { explanation?: string; indicators?: string[] } } };

function ReportDetail() {
  const { id } = Route.useParams();
  const invalidate = useInvalidate();
  const q = useQuery({ queryKey: ["report", id], queryFn: async () => { const { data, error } = await supabase.from("takedown_reports").select("*").eq("id", id).single(); if (error) throw error; return data; } });
  if (q.isLoading || !q.data) return <Skel className="h-[600px]" />;
  const r = q.data; const c = r.content as unknown as Content;
  const { signals, ai, ...ev } = c.evidence;

  async function markSubmitted() {
    await supabase.from("takedown_reports").update({ status: "Submitted" }).eq("id", id);
    toast.success("Marked as submitted"); q.refetch(); invalidate("reports");
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All reports</Link>
        <div className="flex gap-2">
          {c.report_link && <Button asChild variant="outline"><a href={c.report_link} target="_blank" rel="noreferrer"><ExternalLink />Open {c.platform} report form</a></Button>}
          {r.status === "Draft" && <Button variant="secondary" onClick={markSubmitted}><Send />Mark submitted</Button>}
          <Button onClick={() => window.print()}><Download />Download PDF</Button>
        </div>
      </div>
      <article className="print-sheet panel mx-auto max-w-3xl space-y-8 p-8 sm:p-12">
        <header className="flex items-start justify-between border-b border-border pb-6">
          <div><div className="label-caps">Takedown request</div><h1 className="mt-1 text-2xl font-semibold">{c.target}</h1><div className="mt-1 text-sm text-muted-foreground">{c.platform} · {c.date}</div></div>
          <div className="text-right"><StatusChip status={r.status} /><div className="mt-2 font-mono text-[10px] text-muted-foreground">REF {r.id.slice(0, 8).toUpperCase()}</div></div>
        </header>
        <Section title="Complainant brand">
          <KV k="Brand" v={c.brand.name} /><KV k="Official account" v={c.official ?? "—"} /><KV k="Domains" v={c.brand.domains.join(", ") || "—"} /><KV k="Support numbers" v={c.brand.phones.join(", ") || "—"} />
        </Section>
        <Section title="Evidence">{Object.entries(ev).map(([k, v]) => <KV key={k} k={k.replace(/_/g, " ")} v={Array.isArray(v) ? v.join(", ") : String(v ?? "—")} />)}</Section>
        {signals && <Section title="Similarity metrics">{Object.entries(signals).filter(([, v]) => typeof v === "number" || typeof v === "boolean").map(([k, v]) => <KV key={k} k={k.replace(/_/g, " ")} v={String(v)} />)}</Section>}
        {ai?.explanation && <Section title="AI reasoning"><p className="col-span-2 text-sm leading-relaxed">{ai.explanation}</p></Section>}
        <Section title="Formal complaint"><pre className="col-span-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">{c.letter}</pre></Section>
        {c.report_link && <div className="text-xs text-muted-foreground">Platform reporting link: <span className="font-mono">{c.report_link}</span></div>}
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="label-caps mb-3 text-primary">{title}</h2><dl className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</dl></section>;
}
function KV({ k, v }: { k: string; v: string }) {
  return <><dt className="text-sm capitalize text-muted-foreground">{k}</dt><dd className="break-words font-mono text-sm">{v}</dd></>;
}
