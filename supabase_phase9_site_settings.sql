-- MIAGE Connection — Phase 9 : réglages d'affichage du site (chiffres de l'accueil)
-- Ré-exécutable sans erreur.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;

DROP POLICY IF EXISTS "public_read" ON public.site_settings;
CREATE POLICY "public_read" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_full_access" ON public.site_settings;
CREATE POLICY "admin_full_access" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

NOTIFY pgrst, 'reload schema';
