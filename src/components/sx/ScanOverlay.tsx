import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { scanDiscoveries, PLATFORMS } from "@/lib/demo-data";
import type { Brand } from "@/lib/data";
import { PlatformIcon, SeverityBadge } from "./primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Found = { handle: string; platform: string; risk_score: number; severity: string; display_name: string | null };

export function ScanOverlay({ open, onClose, brand, onDone }: { open: boolean; onClose: () => void; brand: Brand | null; onDone: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [found, setFound] = useState<Found[]>([]);
  const [done, setDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !brand) return;
    let cancelled = false;
    setLogs([]); setFound([]); setDone(false); setActive(-1);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const log = (l: string) => !cancelled && setLogs((p) => [...p, l]);

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      const { data: existing } = await supabase.from("threats").select("handle").eq("brand_id", brand.id);
      const disc = scanDiscoveries(brand.id, uid, brand.logo_url, new Set((existing ?? []).map((e) => e.handle)), 3 + Math.floor(Math.random() * 2));
      const { data: scan } = await supabase.from("scans").insert({ brand_id: brand.id, user_id: uid }).select().single();
      log(`[CORE] Initializing scan for "${brand.name}" · ${brand.keywords.length} keywords · ${PLATFORMS.length} platforms`);
      await sleep(500);
      let total = 0;
      for (let i = 0; i < PLATFORMS.length; i++) {
        if (cancelled) return;
        const p = PLATFORMS[i];
        setActive(i);
        log(`[${p.toUpperCase()}] Querying look-alike handles & homoglyph variants…`);
        await sleep(450);
        const n = 600 + Math.floor(Math.random() * 1400);
        total += n;
        const hits = disc.filter((d) => d.platform === p);
        log(`[${p.toUpperCase()}] ${n.toLocaleString()} profiles analyzed… ${hits.length} impersonator${hits.length === 1 ? "" : "s"} found`);
        for (const h of hits) {
          await sleep(250);
          if (cancelled) return;
          setFound((f) => [...f, h]);
          log(`  ↳ FLAG @${h.handle} · risk ${h.risk_score} · ${h.severity.toUpperCase()}`);
        }
        await sleep(300);
      }
      log(`[AI] Scoring bios with scam-language model…`);
      await sleep(600);
      const { error } = await supabase.from("threats").insert(disc);
      if (scan) await supabase.from("scans").update({ finished_at: new Date().toISOString(), profiles_analyzed: total, threats_found: disc.length }).eq("id", scan.id);
      if (cancelled) return;
      if (error) { toast.error("Scan failed to save results"); return; }
      log(`[DONE] ${total.toLocaleString()} profiles · ${disc.length} new threats added to queue`);
      setActive(PLATFORMS.length);
      setDone(true);
      onDone();
      toast.success(`Scan complete — ${disc.length} new threats detected`);
    })();
    return () => { cancelled = true; };
  }, [open, brand?.id]);

  useEffect(() => { logRef.current?.scrollTo({ top: 1e6 }); }, [logs]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal aria-label="Live scan">
          <motion.div initial={{ scale: 0.97, y: 10 }} animate={{ scale: 1, y: 0 }} className="glass relative grid w-full max-w-5xl gap-6 rounded-2xl p-6 md:grid-cols-[320px_1fr]">
            <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="flex flex-col items-center gap-6">
              <div className="relative aspect-square w-full max-w-[280px] rounded-full border border-primary/20 bg-surface">
                {[0.25, 0.5, 0.75].map((s) => <div key={s} className="absolute rounded-full border border-primary/15" style={{ inset: `${s * 50}%` }} />)}
                <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(to right, transparent 49.8%, color-mix(in oklab, var(--primary) 15%, transparent) 50%, transparent 50.2%), linear-gradient(to bottom, transparent 49.8%, color-mix(in oklab, var(--primary) 15%, transparent) 50%, transparent 50.2%)" }} />
                {!done && <div className="absolute inset-0 rounded-full animate-radar" style={{ background: "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary) 45%, transparent) 50deg, transparent 52deg)" }} />}
                {found.map((f, i) => {
                  const a = (i * 137) % 360, d = 25 + ((i * 53) % 55);
                  return <motion.span key={f.handle} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${50 + (d / 2) * Math.cos((a * Math.PI) / 180)}%`, top: `${50 + (d / 2) * Math.sin((a * Math.PI) / 180)}%`, background: `var(--${f.severity})`, boxShadow: `0 0 12px var(--${f.severity})` }} />;
                })}
                <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary glow-primary" />
              </div>
              <div className="flex gap-3">
                {PLATFORMS.map((p, i) => (
                  <div key={p} className={cn("flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300", i < active ? "border-low/40 bg-low/10 text-low" : i === active ? "border-primary bg-primary/15 text-primary glow-primary" : "border-border text-muted-foreground")}>
                    <PlatformIcon platform={p} />
                  </div>
                ))}
              </div>
              <div className="label-caps">{done ? "Scan complete" : "Scanning the open web"}</div>
            </div>
            <div className="flex min-h-[420px] flex-col gap-4">
              <div ref={logRef} className="h-56 overflow-y-auto rounded-xl border border-border bg-background/80 p-4 font-mono text-xs leading-relaxed">
                {logs.map((l, i) => (
                  <div key={i} className={cn(l.includes("FLAG") ? "text-critical" : l.startsWith("[DONE]") ? "text-low" : l.startsWith("[AI]") ? "text-violet" : "text-primary/90")}>{l}</div>
                ))}
                {!done && <span className="inline-block h-3 w-2 bg-primary animate-blink" />}
              </div>
              <div className="label-caps">Threats found · {found.length}</div>
              <div className="grid flex-1 content-start gap-2 sm:grid-cols-2">
                <AnimatePresence>
                  {found.map((f) => (
                    <motion.div key={f.handle} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="panel flex items-center gap-3 p-3">
                      <PlatformIcon platform={f.platform} className="text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-sm">@{f.handle}</div>
                        <div className="truncate text-xs text-muted-foreground">{f.display_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-bold tabular">{f.risk_score}</div>
                        <SeverityBadge severity={f.severity} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {done && <Button onClick={onClose} className="self-end">Review threats</Button>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
