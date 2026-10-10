import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/sx/Logo";
import { PlatformIcon } from "@/components/sx/primitives";
import { setActiveBrandId, useSession } from "@/lib/data";
import { PLATFORMS } from "@/lib/monitoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Register your brand — SentinelX" },
      {
        name: "description",
        content: "Set up your official brand identity so SentinelX can find impostors.",
      },
      { property: "og:title", content: "Register your brand — SentinelX" },
      { property: "og:description", content: "Brand onboarding wizard." },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Identity", "Logo", "Social handles", "Apps", "Domains & phones"];
const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

async function resizeToDataUrl(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const c = document.createElement("canvas");
  const s = 256;
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const r = Math.max(s / img.width, s / img.height);
  ctx.drawImage(
    img,
    (s - img.width * r) / 2,
    (s - img.height * r) / 2,
    img.width * r,
    img.height * r,
  );
  return c.toDataURL("image/png");
}

function Onboarding() {
  const { session, loading, error } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "",
    keywords: "",
    logo: "" as string,
    handles: {} as Record<string, string>,
    apps: "",
    publishers: "",
    domains: "",
    phones: "",
  });
  useEffect(() => {
    if (!loading && error) toast.error(error.message);
  }, [loading, error]);

  async function finish() {
    if (!f.name.trim()) {
      setStep(0);
      toast.error("Brand name is required");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("brands")
      .insert({
        user_id: session!.user.id,
        name: f.name.trim(),
        keywords: [f.name.trim(), ...splitList(f.keywords)],
        logo_url: f.logo || null,
        handles: f.handles,
        app_ids: splitList(f.apps),
        app_publishers: splitList(f.publishers),
        domains: splitList(f.domains),
        phones: splitList(f.phones),
        alert_email: null,
      })
      .select()
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setActiveBrandId(data.id);
    toast.success(`${data.name} registered — ready for a simulated scan`);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen cyber-bg">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Logo />
        <span className="text-xs text-muted-foreground">Simulated monitoring MVP</span>
      </header>
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight">Register your official identity</h1>
        <p className="mt-2 text-muted-foreground">
          This is the official asset registry used for simulated candidate generation and
          comparison.
        </p>
        <ol className="mt-8 flex gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button onClick={() => setStep(i)} className="w-full text-left">
                <div
                  className={cn(
                    "h-1 rounded-full transition-colors",
                    i <= step ? "bg-primary glow-primary" : "bg-muted",
                  )}
                />
                <div
                  className={cn(
                    "mt-2 hidden text-xs sm:block",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s}
                </div>
              </button>
            </li>
          ))}
        </ol>
        <div className="panel mt-6 p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {step === 0 && (
                <>
                  <Field label="Brand name">
                    <Input
                      value={f.name}
                      onChange={(e) => setF({ ...f, name: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                    />
                  </Field>
                  <Field label="Keywords & aliases (comma separated)">
                    <Input
                      value={f.keywords}
                      onChange={(e) => setF({ ...f, keywords: e.target.value })}
                      placeholder="HDFC, HDFC Bank, HDFCBank"
                    />
                  </Field>
                </>
              )}
              {step === 1 && (
                <label className="flex cursor-pointer flex-col items-center gap-4 rounded-xl border border-dashed border-border p-10 hover:border-primary/50">
                  {f.logo ? (
                    <img src={f.logo} alt="Logo preview" className="h-24 w-24 rounded-2xl" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {f.logo ? "Click to replace" : "Upload your official logo (PNG/JPG)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setF({ ...f, logo: await resizeToDataUrl(file) });
                    }}
                  />
                </label>
              )}
              {step === 2 &&
                PLATFORMS.map((p) => (
                  <Field key={p} label={p} icon={<PlatformIcon platform={p} />}>
                    <Input
                      className="font-mono"
                      value={f.handles[p] ?? ""}
                      onChange={(e) =>
                        setF({ ...f, handles: { ...f.handles, [p]: e.target.value } })
                      }
                      placeholder="@handle"
                    />
                  </Field>
                ))}
              {step === 3 && (
                <>
                  <Field label="Official app package IDs (Play Store / App Store)">
                    <Input
                      className="font-mono"
                      value={f.apps}
                      onChange={(e) => setF({ ...f, apps: e.target.value })}
                      placeholder="com.example.app, id123456789"
                    />
                  </Field>
                  <Field label="Approved app developers / publishers">
                    <Input
                      value={f.publishers}
                      onChange={(e) => setF({ ...f, publishers: e.target.value })}
                      placeholder="Example Technologies Pvt Ltd"
                    />
                  </Field>
                </>
              )}
              {step === 4 && (
                <>
                  <Field label="Official domains">
                    <Input
                      className="font-mono"
                      value={f.domains}
                      onChange={(e) => setF({ ...f, domains: e.target.value })}
                      placeholder="hdfcbank.com"
                    />
                  </Field>
                  <Field label="Support phone numbers">
                    <Input
                      className="font-mono"
                      value={f.phones}
                      onChange={(e) => setF({ ...f, phones: e.target.value })}
                      placeholder="1800-202-6161"
                    />
                  </Field>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>Continue</Button>
            ) : (
              <Button onClick={finish} disabled={busy}>
                <Check />
                Finish setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="label-caps flex items-center gap-2">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
