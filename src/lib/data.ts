import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Brand = Tables<"brands">;
export type Threat = Tables<"threats">;
export type App = Tables<"suspicious_apps">;
export type Report = Tables<"takedown_reports">;

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading, user: session?.user ?? null };
}

const BRAND_KEY = "sentinelx.brand";
export function getActiveBrandId() {
  return typeof window !== "undefined" ? localStorage.getItem(BRAND_KEY) : null;
}
export function setActiveBrandId(id: string) {
  localStorage.setItem(BRAND_KEY, id);
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useBrand() {
  const q = useBrands();
  const [activeId, setActive] = useState<string | null>(null);
  useEffect(() => setActive(getActiveBrandId()), []);
  const brand = q.data?.find((b) => b.id === activeId) ?? q.data?.[0] ?? null;
  return { brand, brands: q.data ?? [], isLoading: q.isLoading, switchBrand: (id: string) => { setActiveBrandId(id); setActive(id); } };
}

export function useThreats(brandId?: string) {
  return useQuery({
    enabled: !!brandId,
    queryKey: ["threats", brandId],
    queryFn: async () => {
      const { data, error } = await supabase.from("threats").select("*").eq("brand_id", brandId!).order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useApps(brandId?: string) {
  return useQuery({
    enabled: !!brandId,
    queryKey: ["apps", brandId],
    queryFn: async () => {
      const { data, error } = await supabase.from("suspicious_apps").select("*").eq("brand_id", brandId!).order("risk_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useReports(brandId?: string) {
  return useQuery({
    enabled: !!brandId,
    queryKey: ["reports", brandId],
    queryFn: async () => {
      const { data, error } = await supabase.from("takedown_reports").select("*").eq("brand_id", brandId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export const PLATFORM_REPORT_LINKS: Record<string, string> = {
  Instagram: "https://help.instagram.com/contact/636276399721841",
  X: "https://help.x.com/forms/impersonation",
  Facebook: "https://www.facebook.com/help/contact/295309487309948",
  Telegram: "mailto:abuse@telegram.org",
  YouTube: "https://support.google.com/youtube/answer/2801947",
  "Play Store": "https://support.google.com/googleplay/android-developer/contact/takedown",
};

export function fmtNum(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
