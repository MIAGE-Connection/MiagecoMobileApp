-- MIAGE Connection — Phase 10 (ré-exécutable)

-- 1. Historique des notifications envoyées (écrit par l'Edge Function, lu par le super admin)
CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scheduled')),
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notification_history TO authenticated;
DROP POLICY IF EXISTS "admin_read" ON public.notification_history;
CREATE POLICY "admin_read" ON public.notification_history
  FOR SELECT TO authenticated USING (public.is_federation_admin());

-- 2. Image (URL) pour l'Actu Admin
ALTER TABLE public.admin_news ADD COLUMN IF NOT EXISTS image_url text;

-- 3. Permettre la suppression d'un compte dans Supabase (Authentication > Users) :
--    ses données personnelles suivent, ses contenus restent (auteur mis à NULL).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('profiles',                 'profiles_id_fkey',                        'id',         'auth.users',      'CASCADE'),
      ('push_tokens',              'push_tokens_user_id_fkey',                'user_id',    'public.profiles', 'CASCADE'),
      ('notification_preferences', 'notification_preferences_user_id_fkey',   'user_id',    'public.profiles', 'CASCADE'),
      ('notification_send_log',    'notification_send_log_user_id_fkey',      'user_id',    'public.profiles', 'CASCADE'),
      ('account_deletion_requests','account_deletion_requests_user_id_fkey',  'user_id',    'public.profiles', 'CASCADE'),
      ('miagistes',                'miagistes_profile_id_fkey',               'profile_id', 'public.profiles', 'SET NULL'),
      ('news',                     'news_author_id_fkey',                     'author_id',  'public.profiles', 'SET NULL'),
      ('member_documents',         'member_documents_created_by_fkey',        'created_by', 'public.profiles', 'SET NULL'),
      ('announcements',            'announcements_created_by_fkey',           'created_by', 'public.profiles', 'SET NULL'),
      ('allowed_domains',          'allowed_domains_added_by_fkey',           'added_by',   'public.profiles', 'SET NULL'),
      ('domain_audit_log',         'domain_audit_log_actor_id_fkey',          'actor_id',   'public.profiles', 'SET NULL'),
      ('scheduled_notifications',  'scheduled_notifications_created_by_fkey', 'created_by', 'public.profiles', 'SET NULL')
    ) AS t(tbl, cname, col, ref, act)
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.tbl, r.cname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE %s',
                   r.tbl, r.cname, r.col, r.ref, r.act);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- 4. Enregistrement du jeton push : un même téléphone peut changer de compte.
--    Le jeton est unique ; il est réattribué au compte connecté (la RLS
--    refusait de modifier une ligne appartenant à l'ancien compte).
CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_device_info text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  INSERT INTO public.push_tokens (user_id, expo_push_token, device_info, updated_at)
  VALUES (auth.uid(), p_token, p_device_info, now())
  ON CONFLICT (expo_push_token) DO UPDATE
    SET user_id = auth.uid(), device_info = EXCLUDED.device_info, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_push_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- 5. Annuaire adhérents : ajoute l'email de contact (celui que l'adhérent a
--    choisi de renseigner dans « Mon profil », jamais son email de connexion).
CREATE OR REPLACE VIEW public.profiles_public_view AS
SELECT p.id, p.full_name, p.position_in_association, p.association_id, p.graduation_year, p.contact_email,
       (p.role = 'admin_association') AS is_referent
FROM public.profiles p
WHERE NOT p.is_suspended
  AND p.valid_until >= current_date
  AND p.association_id = (SELECT association_id FROM public.profiles WHERE id = auth.uid())
  AND public.is_active_member();

GRANT SELECT ON public.profiles_public_view TO authenticated;

NOTIFY pgrst, 'reload schema';

-- 6. Documents adhérents : réservés au super admin (le référent ne fait que les lire)
DROP POLICY IF EXISTS "referent_manage_own" ON public.member_documents;

NOTIFY pgrst, 'reload schema';

-- 7. Événements : toujours visibles par tout le monde
UPDATE public.events SET visibility = 'public' WHERE visibility <> 'public';

NOTIFY pgrst, 'reload schema';

-- 8. Historique des notifications : lisible par les adhérents actifs (boîte « Notifications »)
DROP POLICY IF EXISTS "members_read" ON public.notification_history;
CREATE POLICY "members_read" ON public.notification_history
  FOR SELECT TO authenticated USING (public.is_active_member());

NOTIFY pgrst, 'reload schema';
