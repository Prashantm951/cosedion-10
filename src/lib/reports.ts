import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_REPORT_LINKS, type App, type Brand, type Threat } from "./data";

export async function createTakedownReport(brand: Brand, item: { kind: "threat"; t: Threat } | { kind: "app"; a: App }) {
  const { data: u } = await supabase.auth.getUser();
  const isT = item.kind === "threat";
  const platform = isT ? item.t.platform : item.a.store;
  const target = isT ? `@${item.t.handle}` : `${item.a.title} (${item.a.package_id})`;
  const ai = (isT ? item.t.ai_analysis : item.a.ai_analysis) as { explanation?: string; indicators?: string[] } | null;
  const official = isT ? (brand.handles as Record<string, string>)[platform] : brand.app_ids[0];
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const letter = `To the ${platform} Trust & Safety Team,

I am writing on behalf of ${brand.name} to formally report the ${isT ? "account" : "application"} ${target}, which impersonates our brand in violation of your impersonation, intellectual property and fraud policies.

Our official ${isT ? "account" : "application"} is ${official ? (isT ? "@" + official : official) : "listed in the attached brand details"}. The reported ${isT ? "account" : "app"} is not affiliated with, endorsed by, or operated by ${brand.name}. It uses our name${isT ? " and logo" : ", icon"} to deceive our customers, and our analysis indicates it is being used to solicit payments, OTPs or personal data.

Summary of evidence: ${ai?.explanation ?? "See attached signals."}

We request that you remove this ${isT ? "account" : "listing"} immediately to prevent further harm to consumers. We are available to provide any additional verification required.

Sincerely,
Brand Protection Team, ${brand.name}
${brand.alert_email ?? ""}
${date}`;
  const content = {
    target, platform, official, letter, date,
    report_link: PLATFORM_REPORT_LINKS[platform] ?? null,
    brand: { name: brand.name, domains: brand.domains, phones: brand.phones, keywords: brand.keywords },
    evidence: isT
      ? { handle: item.t.handle, display_name: item.t.display_name, bio: item.t.bio, followers: item.t.followers, created: item.t.account_created_at, risk_score: item.t.risk_score, severity: item.t.severity, signals: item.t.signals, ai }
      : { title: item.a.title, package_id: item.a.package_id, developer: item.a.developer, installs: item.a.installs, permissions: item.a.permissions, risk_score: item.a.risk_score, severity: item.a.severity, signals: item.a.signals, ai },
  };
  const { data, error } = await supabase.from("takedown_reports").insert({
    user_id: u.user!.id, brand_id: brand.id, threat_id: isT ? item.t.id : null, app_id: isT ? null : item.a.id,
    title: `Takedown · ${target}`, platform, status: "Draft", content,
  }).select().single();
  if (error) throw error;
  if (isT) await supabase.from("threats").update({ status: "Takedown Requested" }).eq("id", item.t.id);
  else await supabase.from("suspicious_apps").update({ status: "Takedown Requested" }).eq("id", item.a.id);
  return data;
}
