import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate } from "@/lib/data";
import { useShell } from "@/components/sx/AppShell";
import { PageHeader, PlatformIcon } from "@/components/sx/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PLATFORMS } from "@/lib/monitoring";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SentinelX" },
      { name: "description", content: "Brand profile, alerts and team." },
      { property: "og:title", content: "Settings — SentinelX" },
      { property: "og:description", content: "Brand profile, alerts and team." },
    ],
  }),
  component: SettingsPage,
});

type Member = { email: string; role: string };

function SettingsPage() {
  const { brand } = useShell();
  const invalidate = useInvalidate();
  const [f, setF] = useState({
    name: "",
    keywords: "",
    handles: {} as Record<string, string>,
    apps: "",
    publishers: "",
    domains: "",
    phones: "",
    alert: true,
    alertEmail: "",
    team: [] as Member[],
  });
  const [invite, setInvite] = useState("");
  useEffect(() => {
    if (!brand) return;
    setF({
      name: brand.name,
      keywords: brand.keywords.join(", "),
      handles: brand.handles as Record<string, string>,
      apps: brand.app_ids.join(", "),
      publishers: brand.app_publishers.join(", "),
      domains: brand.domains.join(", "),
      phones: brand.phones.join(", "),
      alert: brand.alert_critical_email,
      alertEmail: brand.alert_email ?? "",
      team: (brand.team as Member[]) ?? [],
    });
  }, [brand?.id]);
  const list = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  async function save(team = f.team) {
    const { error } = await supabase
      .from("brands")
      .update({
        name: f.name,
        keywords: list(f.keywords),
        handles: f.handles,
        app_ids: list(f.apps),
        app_publishers: list(f.publishers),
        domains: list(f.domains),
        phones: list(f.phones),
        alert_critical_email: f.alert,
        alert_email: f.alertEmail,
        team,
      })
      .eq("id", brand!.id);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    invalidate("brands");
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" actions={<Button onClick={() => save()}>Save changes</Button>} />
      <div className="space-y-4">
        <section className="panel space-y-4 p-6">
          <h2 className="label-caps">Brand profile</h2>
          <F label="Brand name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </F>
          <F label="Keywords & aliases">
            <Input value={f.keywords} onChange={(e) => setF({ ...f, keywords: e.target.value })} />
          </F>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLATFORMS.map((p) => (
              <F key={p} label={p} icon={<PlatformIcon platform={p} />}>
                <Input
                  className="font-mono"
                  value={f.handles[p] ?? ""}
                  onChange={(e) => setF({ ...f, handles: { ...f.handles, [p]: e.target.value } })}
                />
              </F>
            ))}
          </div>
          <F label="Official app IDs">
            <Input
              className="font-mono"
              value={f.apps}
              onChange={(e) => setF({ ...f, apps: e.target.value })}
            />
          </F>
          <F label="Approved app developers / publishers">
            <Input
              value={f.publishers}
              onChange={(e) => setF({ ...f, publishers: e.target.value })}
            />
          </F>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Domains">
              <Input
                className="font-mono"
                value={f.domains}
                onChange={(e) => setF({ ...f, domains: e.target.value })}
              />
            </F>
            <F label="Support phones">
              <Input
                className="font-mono"
                value={f.phones}
                onChange={(e) => setF({ ...f, phones: e.target.value })}
              />
            </F>
          </div>
        </section>
        <section className="panel space-y-4 p-6">
          <h2 className="label-caps">Alert preferences</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Email me on critical threats</div>
              <div className="text-sm text-muted-foreground">
                Sent when a new threat scores 80+.
              </div>
            </div>
            <Switch checked={f.alert} onCheckedChange={(v) => setF({ ...f, alert: v })} />
          </div>
          <F label="Alert email">
            <Input
              type="email"
              value={f.alertEmail}
              onChange={(e) => setF({ ...f, alertEmail: e.target.value })}
            />
          </F>
        </section>
        <section className="panel space-y-4 p-6">
          <h2 className="label-caps">Team members</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!invite.includes("@")) return;
              const team = [...f.team, { email: invite, role: "Analyst" }];
              setF({ ...f, team });
              setInvite("");
              save(team);
            }}
          >
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
          <ul className="divide-y divide-border">
            {f.team.map((m, i) => (
              <li key={m.email} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-mono">{m.email}</span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground">{m.role}</span>
                  <button
                    aria-label={`Remove ${m.email}`}
                    onClick={() => {
                      const team = f.team.filter((_, j) => j !== i);
                      setF({ ...f, team });
                      save(team);
                    }}
                    className="text-muted-foreground hover:text-critical"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
            {!f.team.length && (
              <li className="py-2 text-sm text-muted-foreground">Just you for now.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function F({
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
