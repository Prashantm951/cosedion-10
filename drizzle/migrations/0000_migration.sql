CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  logo_url text,
  handles jsonb NOT NULL DEFAULT '{}',
  app_ids text[] NOT NULL DEFAULT '{}',
  domains text[] NOT NULL DEFAULT '{}',
  phones text[] NOT NULL DEFAULT '{}',
  alert_critical_email boolean NOT NULL DEFAULT true,
  alert_email text,
  team jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  platform text NOT NULL,
  type text NOT NULL,
  handle text NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  followers integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  account_created_at timestamptz,
  risk_score integer NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'low',
  signals jsonb NOT NULL DEFAULT '{}',
  ai_analysis jsonb,
  status text NOT NULL DEFAULT 'New',
  detected_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.suspicious_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  store text NOT NULL DEFAULT 'Play Store',
  title text NOT NULL,
  package_id text NOT NULL,
  developer text NOT NULL,
  installs text,
  rating numeric,
  permissions text[] NOT NULL DEFAULT '{}',
  description text,
  risk_score integer NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'low',
  signals jsonb NOT NULL DEFAULT '{}',
  ai_analysis jsonb,
  status text NOT NULL DEFAULT 'New',
  detected_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.takedown_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  threat_id uuid REFERENCES public.threats(id) ON DELETE CASCADE,
  app_id uuid REFERENCES public.suspicious_apps(id) ON DELETE CASCADE,
  title text NOT NULL,
  platform text,
  status text NOT NULL DEFAULT 'Draft',
  content jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.analyst_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  threat_id uuid NOT NULL REFERENCES public.threats(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  profiles_analyzed integer NOT NULL DEFAULT 0,
  threats_found integer NOT NULL DEFAULT 0
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['brands','threats','suspicious_apps','takedown_reports','analyst_notes','scans'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Own rows select" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "Own rows insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "Own rows update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "Own rows delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;

CREATE INDEX ON public.threats (brand_id, detected_at DESC);
CREATE INDEX ON public.suspicious_apps (brand_id);

CREATE POLICY "Logo public read" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Logo upload own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Logo update own folder" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);