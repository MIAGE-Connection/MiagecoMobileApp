-- MIAGE Connection — Phase 5 : notifications push (Expo Push, pas de VAPID web)
-- Ré-exécutable sans erreur.

-- ============================================================
-- 1. push_tokens : un adhérent peut avoir plusieurs devices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL UNIQUE,
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;

DROP POLICY IF EXISTS "self_manage" ON public.push_tokens;
CREATE POLICY "self_manage" ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 2. notification_preferences : une ligne par adhérent
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  events_reminders boolean NOT NULL DEFAULT true,
  announcements boolean NOT NULL DEFAULT true,
  federation_news boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

DROP POLICY IF EXISTS "self_manage" ON public.notification_preferences;
CREATE POLICY "self_manage" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. notification_templates : contenu des notifications, géré par
--    l'admin national (pas d'écran dédié pour l'instant, SQL direct)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
  key text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  preference_column text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;

DROP POLICY IF EXISTS "admin_full_access" ON public.notification_templates;
CREATE POLICY "admin_full_access" ON public.notification_templates
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

-- ============================================================
-- 4. notification_send_log : anti-doublon, jamais lu/écrit par le
--    client — uniquement par l'Edge Function via la service_role key
--    (qui contourne RLS), donc aucun GRANT à authenticated/anon.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL REFERENCES public.notification_templates(key) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  related_entity_id uuid,
  expo_ticket_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key, user_id, related_entity_id)
);

ALTER TABLE public.notification_send_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_send_log FROM anon, authenticated;
-- Aucune policy : verrouillé, seule la service_role (Edge Function) y touche.

NOTIFY pgrst, 'reload schema';
