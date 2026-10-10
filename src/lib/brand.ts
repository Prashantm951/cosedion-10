export type Brand = {
  id: string;
  user_id: string;
  name: string;
  keywords: string[];
  logo_url: string | null;
  handles: Record<string, string>;
  app_ids: string[];
  app_publishers: string[];
  domains: string[];
  phones: string[];
  alert_critical_email: boolean;
  alert_email: string | null;
  team: unknown[];
  created_at: string;
};
