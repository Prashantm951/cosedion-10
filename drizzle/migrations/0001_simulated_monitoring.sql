-- Brand-specific simulated monitoring pipeline. Existing user data is preserved.
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS app_publishers text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.scan_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_type text NOT NULL DEFAULT 'simulated',
  candidate_kind text NOT NULL,
  platform_or_store text NOT NULL,
  handle_or_title text NOT NULL,
  display_name text,
  bio_or_description text,
  logo_similarity integer NOT NULL DEFAULT 0,
  followers integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  account_age_days integer,
  package_id text,
  publisher text,
  permissions text[] NOT NULL DEFAULT '{}',
  processing_status text NOT NULL DEFAULT 'generated',
  classification text,
  risk_score integer,
  severity text,
  evidence jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_candidates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_candidates TO authenticated;
GRANT ALL ON public.scan_candidates TO service_role;
CREATE POLICY "Own scan candidates select" ON public.scan_candidates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own scan candidates insert" ON public.scan_candidates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own scan candidates update" ON public.scan_candidates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own scan candidates delete" ON public.scan_candidates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS scan_candidates_scan_id_idx ON public.scan_candidates (scan_id, created_at DESC);
