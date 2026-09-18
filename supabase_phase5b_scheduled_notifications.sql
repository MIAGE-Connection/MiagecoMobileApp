-- MIAGE Connection — Phase 5b : notifications programmées / récurrentes
-- Réservé au super admin (admin_national). Ré-exécutable sans erreur.
--
-- IMPORTANT avant d'exécuter ce script :
-- 1. Remplace <PROJECT_REF> ci-dessous par la référence de ton projet Supabase
--    (visible dans l'URL du dashboard : https://supabase.com/dashboard/project/<PROJECT_REF>).
-- 2. Choisis une phrase secrète et remplace <CRON_SECRET> ci-dessous par cette
--    valeur, PUIS configure exactement la même valeur comme secret de l'Edge
--    Function "send-notification" (Edge Functions > send-notification >
--    Settings > Secrets), sous le nom CRON_SECRET.
-- 3. Active les extensions pg_cron et pg_net : Database > Extensions dans le
--    dashboard (ou décommente les CREATE EXTENSION ci-dessous si tu préfères
--    le faire ici).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 1. Table des notifications programmées
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  send_at timestamptz NOT NULL,
  recurrence text NOT NULL DEFAULT 'once',
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications DROP CONSTRAINT IF EXISTS scheduled_notifications_recurrence_check;
ALTER TABLE public.scheduled_notifications
  ADD CONSTRAINT scheduled_notifications_recurrence_check CHECK (recurrence IN ('once', 'weekly', 'biweekly'));

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_due
  ON public.scheduled_notifications(send_at) WHERE is_active;

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_notifications TO authenticated;

DROP POLICY IF EXISTS "admin_full_access" ON public.scheduled_notifications;
CREATE POLICY "admin_full_access" ON public.scheduled_notifications
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

-- ============================================================
-- 2. Fonction de dispatch (appelée périodiquement par pg_cron)
-- ============================================================

CREATE OR REPLACE FUNCTION public.dispatch_scheduled_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM public.scheduled_notifications
    WHERE is_active AND send_at <= now()
  LOOP
    PERFORM net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<CRON_SECRET>'
      ),
      body := jsonb_build_object('title', rec.title, 'body', rec.body)
    );

    IF rec.recurrence = 'once' THEN
      UPDATE public.scheduled_notifications
        SET is_active = false, last_sent_at = now()
        WHERE id = rec.id;
    ELSIF rec.recurrence = 'weekly' THEN
      UPDATE public.scheduled_notifications
        SET send_at = rec.send_at + interval '7 days', last_sent_at = now()
        WHERE id = rec.id;
    ELSIF rec.recurrence = 'biweekly' THEN
      UPDATE public.scheduled_notifications
        SET send_at = rec.send_at + interval '14 days', last_sent_at = now()
        WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Planification : vérifie les envois dus toutes les 15 minutes
-- ============================================================

SELECT cron.unschedule('dispatch-scheduled-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-scheduled-notifications');

SELECT cron.schedule(
  'dispatch-scheduled-notifications',
  '*/15 * * * *',
  'SELECT public.dispatch_scheduled_notifications();'
);

NOTIFY pgrst, 'reload schema';
