-- MIAGE Connection — Phase 11 : billetterie, « Intéressé », rappels d'événements,
-- nettoyage du jeton de notification à la déconnexion.
-- Ré-exécutable. Prérequis : phases 5b/5c (pg_cron, pg_net, table internal_config)
-- et Edge Function send-notification redéployée (elle accepte maintenant "preference").

-- 1. Événements : lien de billetterie, lien du post Instagram, suivi du rappel
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
-- Rappel automatique la veille : désactivé par défaut, activé événement par événement par le super admin.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false;

-- Si la date de l'événement change, le rappel est de nouveau programmé.
CREATE OR REPLACE FUNCTION public.reset_event_reminder()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
    NEW.reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_event_reminder ON public.events;
CREATE TRIGGER trg_reset_event_reminder
  BEFORE UPDATE OF start_date ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.reset_event_reminder();

-- 2. « Intéressé » : un adhérent actif marque un événement, un seul marquage par personne
CREATE TABLE IF NOT EXISTS public.event_interests (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.event_interests TO authenticated;

DROP POLICY IF EXISTS "self_read" ON public.event_interests;
CREATE POLICY "self_read" ON public.event_interests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "self_insert" ON public.event_interests;
CREATE POLICY "self_insert" ON public.event_interests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_active_member());

DROP POLICY IF EXISTS "self_delete" ON public.event_interests;
CREATE POLICY "self_delete" ON public.event_interests
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Statistiques : super admin = tous les événements, référent = ceux de son association.
-- Seuls des totaux sont renvoyés, jamais l'identité des personnes intéressées.
CREATE OR REPLACE FUNCTION public.event_interest_counts()
RETURNS TABLE (event_id uuid, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT i.event_id, count(*)::bigint
  FROM public.event_interests i
  JOIN public.events e ON e.id = i.event_id
  WHERE public.is_federation_admin()
     OR e.association_id = (
       SELECT p.association_id FROM public.profiles p
       WHERE p.id = auth.uid() AND p.role = 'admin_association'
     )
  GROUP BY i.event_id;
$$;

REVOKE EXECUTE ON FUNCTION public.event_interest_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_interest_counts() TO authenticated;

-- 3. Déconnexion : retire le jeton de notification de CET appareil pour ce compte
CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.push_tokens WHERE expo_push_token = p_token AND user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.unregister_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(text) TO authenticated;

-- 4. Rappels automatiques : la veille des événements publiés dont le rappel est activé, à 8 h (heure de Paris en hiver, 9 h en été)
CREATE OR REPLACE FUNCTION public.send_event_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec record;
  v_url text;
  v_secret text;
  v_tomorrow date := ((now() AT TIME ZONE 'Europe/Paris')::date + 1);
BEGIN
  SELECT value INTO v_url FROM public.internal_config WHERE key = 'edge_function_url';
  SELECT value INTO v_secret FROM public.internal_config WHERE key = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE EXCEPTION 'internal_config incomplète : lance la phase 5c.';
  END IF;

  FOR rec IN
    SELECT id, title, location, start_date
    FROM public.events
    WHERE is_published
      AND reminder_enabled
      AND reminder_sent_at IS NULL
      AND (start_date AT TIME ZONE 'Europe/Paris')::date = v_tomorrow
  LOOP
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object(
        'title', 'Rappel : demain',
        'body', rec.title
          || ' — ' || to_char(rec.start_date AT TIME ZONE 'Europe/Paris', 'HH24"h"MI')
          || CASE WHEN rec.location IS NOT NULL THEN ' · ' || rec.location ELSE '' END,
        'preference', 'events_reminders'
      )
    );
    UPDATE public.events SET reminder_sent_at = now() WHERE id = rec.id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_event_reminders() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('send-event-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-event-reminders');

SELECT cron.schedule('send-event-reminders', '0 7 * * *', 'SELECT public.send_event_reminders();');

NOTIFY pgrst, 'reload schema';
