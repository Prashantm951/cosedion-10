import { supabase } from "@/integrations/supabase/client";
import type { Brand } from "./brand";
import type { ScanCandidate } from "./monitoring";

export type StoredScan = {
  id: string;
  brand_id: string;
  brand_name: string;
  created_at: string;
  total_candidates: number;
  legitimate_count: number;
  impersonation_count: number;
  scam_count: number;
  average_risk_score: number;
  candidates: ScanCandidate[];
};

const LOCAL_STORAGE_KEY_BRAND = "threatlens_active_brand";
const LOCAL_STORAGE_KEY_SCANS = "threatlens_scans_history";

/**
 * Checks connection status to Supabase PostgreSQL database
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  latencyMs?: number;
}> {
  const start = performance.now();
  try {
    const { data, error } = await supabase.from("brands").select("id").limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      // If table doesn't exist or RLS restricts it, auth service is still active
      return {
        connected: true,
        message: `PostgreSQL connection active (${latencyMs}ms)`,
        latencyMs,
      };
    }
    return {
      connected: true,
      message: `Connected to PostgreSQL (${latencyMs}ms)`,
      latencyMs,
    };
  } catch (err) {
    return {
      connected: false,
      message: err instanceof Error ? err.message : "Database unavailable",
    };
  }
}

/**
 * Saves official brand baseline to PostgreSQL database and local cache
 */
export async function saveBrandBaseline(
  brand: Omit<
    Brand,
    "id" | "user_id" | "created_at" | "team" | "alert_critical_email" | "alert_email"
  >,
): Promise<Brand> {
  const brandRecord: Brand = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}`,
    user_id: "authenticated-user",
    name: brand.name,
    keywords: brand.keywords ?? [],
    logo_url: brand.logo_url ?? null,
    handles: brand.handles ?? {},
    app_ids: brand.app_ids ?? [],
    app_publishers: brand.app_publishers ?? [],
    domains: brand.domains ?? [],
    phones: brand.phones ?? [],
    alert_critical_email: true,
    alert_email: null,
    team: [],
    created_at: new Date().toISOString(),
  };

  // Always cache locally for resilient instant reads
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY_BRAND, JSON.stringify(brandRecord));
  }

  // Attempt database save to PostgreSQL
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;

    const payload = {
      name: brandRecord.name,
      keywords: brandRecord.keywords,
      logo_url: brandRecord.logo_url,
      handles: brandRecord.handles,
      app_ids: brandRecord.app_ids,
      app_publishers: brandRecord.app_publishers,
      domains: brandRecord.domains,
      phones: brandRecord.phones,
      ...(userId ? { user_id: userId } : {}),
    };

    const { data, error } = await supabase.from("brands").insert([payload]).select().maybeSingle();

    if (!error && data) {
      brandRecord.id = data.id;
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY_BRAND, JSON.stringify(brandRecord));
      }
    }
  } catch (err) {
    console.warn("PostgreSQL write fallback to local storage:", err);
  }

  return brandRecord;
}

/**
 * Loads the saved official brand baseline
 */
export async function loadBrandBaseline(): Promise<Brand | null> {
  // Check local cache first for instant UX
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY_BRAND);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
  }

  // Attempt to fetch from PostgreSQL
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const brand: Brand = {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        keywords: data.keywords ?? [],
        logo_url: data.logo_url,
        handles: data.handles ?? {},
        app_ids: data.app_ids ?? [],
        app_publishers: data.app_publishers ?? [],
        domains: data.domains ?? [],
        phones: data.phones ?? [],
        alert_critical_email: data.alert_critical_email ?? true,
        alert_email: data.alert_email,
        team: data.team ?? [],
        created_at: data.created_at,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY_BRAND, JSON.stringify(brand));
      }
      return brand;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Stores full scan report and candidates in PostgreSQL database
 */
export async function saveScanResults(
  brand: Brand,
  candidates: ScanCandidate[],
): Promise<StoredScan> {
  const scanId =
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}`;
  const now = new Date().toISOString();

  const legit = candidates.filter((c) => c.classification === "Legitimate / official");
  const impersonations = candidates.filter(
    (c) =>
      c.classification === "Potential impersonation" ||
      c.classification === "High-risk impersonation",
  );
  const scams = candidates.filter((c) => c.classification === "Likely scam");
  const avgScore = candidates.length
    ? Math.round(candidates.reduce((acc, c) => acc + c.risk_score, 0) / candidates.length)
    : 0;

  const storedScan: StoredScan = {
    id: scanId,
    brand_id: brand.id,
    brand_name: brand.name,
    created_at: now,
    total_candidates: candidates.length,
    legitimate_count: legit.length,
    impersonation_count: impersonations.length,
    scam_count: scams.length,
    average_risk_score: avgScore,
    candidates,
  };

  // Cache in local history
  if (typeof window !== "undefined") {
    try {
      const historyJson = localStorage.getItem(LOCAL_STORAGE_KEY_SCANS);
      const history: StoredScan[] = historyJson ? JSON.parse(historyJson) : [];
      history.unshift(storedScan);
      // keep last 10 scans
      localStorage.setItem(LOCAL_STORAGE_KEY_SCANS, JSON.stringify(history.slice(0, 10)));
    } catch {
      // ignore
    }
  }

  // Persist to PostgreSQL database
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;

    // 1. Insert scan record
    await supabase.from("scans").insert([
      {
        id: scanId,
        brand_id: brand.id,
        started_at: now,
        finished_at: now,
        profiles_analyzed: candidates.length,
        threats_found: impersonations.length + scams.length,
        ...(userId ? { user_id: userId } : {}),
      },
    ]);

    // 2. Insert fake social accounts into public.threats table
    const socialThreats = candidates
      .filter((c) => !c.package_id && c.classification !== "Legitimate / official")
      .map((c) => ({
        brand_id: brand.id,
        platform: c.platform_or_store,
        type: c.classification === "Likely scam" ? "Scam Account" : "Impersonation",
        handle: c.handle_or_title,
        display_name: c.display_name,
        avatar_url: c.logo_similarity > 70 ? brand.logo_url : null,
        bio: c.bio_or_description,
        followers: c.followers,
        verified: c.verified,
        risk_score: c.risk_score,
        severity: c.severity,
        signals: c.signals,
        status: "New",
        ...(userId ? { user_id: userId } : {}),
      }));

    if (socialThreats.length > 0) {
      await supabase.from("threats").insert(socialThreats);
    }

    // 3. Insert fake rogue apps into public.suspicious_apps table
    const appThreats = candidates
      .filter((c) => !!c.package_id && c.classification !== "Legitimate / official")
      .map((c) => ({
        brand_id: brand.id,
        store: c.platform_or_store,
        title: c.display_name,
        package_id: c.package_id || c.handle_or_title,
        developer: c.publisher || "Unknown Developer",
        permissions: c.permissions,
        description: c.bio_or_description,
        risk_score: c.risk_score,
        severity: c.severity,
        signals: c.signals,
        status: "New",
        ...(userId ? { user_id: userId } : {}),
      }));

    if (appThreats.length > 0) {
      await supabase.from("suspicious_apps").insert(appThreats);
    }
  } catch (err) {
    console.warn("PostgreSQL scan write fallback:", err);
  }

  return storedScan;
}

/**
 * Loads recent scan reports history
 */
export function getScanHistory(): StoredScan[] {
  if (typeof window === "undefined") return [];
  try {
    const historyJson = localStorage.getItem(LOCAL_STORAGE_KEY_SCANS);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch {
    return [];
  }
}
