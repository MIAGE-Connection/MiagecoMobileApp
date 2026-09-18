-- MIAGE Connection — Phase 5c : durcissement du dispatch des notifs programmées
-- - suit le résultat réel de chaque envoi (pending / sent / failed), sans retry
-- - déplace l'URL et le secret cron hors du corps de la fonction (table verrouillée)
-- Ré-exécutable. À lancer APRÈS supabase_phase5b (qui contient encore les valeurs
-- réelles dans dispatch_scheduled_notifications, récupérées automatiquement ici).

-- ============================================================
-- 1. Configuration interne (inaccessible au client)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.internal_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_config FROM anon, authenticated;
-- Aucune policy : seul le rôle postgres / les fonctions SECURITY DEFINER y accèdent.

-- Récupère l'URL et le secret depuis l'ancienne fonction (première exécution
-- seulement). Si ça échoue, insère-les à la main :
--   INSERT INTO public.internal_config VALUES
--     ('edge_function_url', 'https://<PROJECT_REF>.supabase.co/functions/v1/send-notification'),
--     ('cron_secret', '<CRON_SECRET>');
DO $$
DECLARE
  v_def text;
  v_secret text;
  v_url text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.internal_config WHERE key = 'cron_secret')
     AND EXISTS (SELECT 1 FROM public.internal_config WHERE key = 'edge_function_url') THEN
    RETURN;
  END IF;

  v_def := pg_get_functiondef('public.dispatch_scheduled_notifications'::regproc);
  v_secret := substring(v_def from '''x-cron-secret'',\s*''([^'']+)''');
  v_url := substring(v_def from 'url := ''([^'']+)''');

  IF v_secret IS NULL OR v_url IS NULL OR v_secret LIKE '<%' OR v_url LIKE '%<PROJECT_REF>%' THEN
    RAISE EXCEPTION 'Impossible de récupérer url/secret depuis l''ancienne fonction. Insère-les manuellement dans public.internal_config (voir commentaire en haut du script).';
  END IF;

  INSERT INTO public.internal_config (key, value) VALUES ('cron_secret', v_secret), ('edge_function_url', v_url)
  ON CONFLICT (key) DO NOTHING;
END;
$$;

-- ============================================================
-- 2. Colonnes de suivi du dernier envoi
-- ============================================================

ALTER TABLE public.scheduled_notifications ADD COLUMN IF NOT EXISTS last_request_id bigint;
ALTER TABLE public.scheduled_notifications ADD COLUMN IF NOT EXISTS last_status text;
ALTER TABLE public.scheduled_notifications ADD COLUMN IF NOT EXISTS last_sent_count integer;
ALTER TABLE public.scheduled_notifications ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.scheduled_notifications DROP CONSTRAINT IF EXISTS scheduled_notifications_last_status_check;
ALTER TABLE public.scheduled_notifications
  ADD CONSTRAINT scheduled_notifications_last_status_check CHECK (last_status IN ('pending', 'sent', 'failed'));

-- ============================================================
-- 3. Dispatch : lance l'appel, mémorise la requête, avance le planning.
--    Pas de retry : une occurrence en échec est simplement marquée "failed".
-- ============================================================

CREATE OR REPLACE FUNCTION public.dispatch_scheduled_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec record;
  v_url text;
  v_secret text;
  v_request_id bigint;
  v_next timestamptz;
BEGIN
  SELECT value INTO v_url FROM public.internal_config WHERE key = 'edge_function_url';
  SELECT value INTO v_secret FROM public.internal_config WHERE key = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE EXCEPTION 'internal_config incomplète (edge_function_url / cron_secret)';
  END IF;

  FOR rec IN
    SELECT * FROM public.scheduled_notifications
    WHERE is_active AND send_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    v_request_id := net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := jsonb_build_object('title', rec.title, 'body', rec.body)
    );

    IF rec.recurrence = 'once' THEN
      UPDATE public.scheduled_notifications
        SET is_active = false, last_sent_at = now(), last_request_id = v_request_id,
            last_status = 'pending', last_sent_count = NULL, last_error = NULL
        WHERE id = rec.id;
    ELSE
      -- Prochaine occurrence strictement dans le futur (les occurrences
      -- manquées pendant une éventuelle panne sont sautées, pas rattrapées).
      v_next := rec.send_at;
      LOOP
        v_next := v_next + CASE rec.recurrence WHEN 'weekly' THEN interval '7 days' ELSE interval '14 days' END;
        EXIT WHEN v_next > now();
      END LOOP;

      UPDATE public.scheduled_notifications
        SET send_at = v_next, last_sent_at = now(), last_request_id = v_request_id,
            last_status = 'pending', last_sent_count = NULL, last_error = NULL
        WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 4. Réconciliation : lit la réponse HTTP réelle (pg_net est asynchrone)
-- ============================================================

CREATE OR REPLACE FUNCTION public.reconcile_scheduled_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec record;
  v_count integer;
BEGIN
  FOR rec IN
    SELECT s.id, r.status_code, r.content, r.error_msg
    FROM public.scheduled_notifications s
    JOIN net._http_response r ON r.id = s.last_request_id
    WHERE s.last_status = 'pending'
  LOOP
    IF rec.status_code = 200 THEN
      BEGIN
        v_count := (rec.content::jsonb ->> 'sent')::integer;
      EXCEPTION WHEN others THEN
        v_count := NULL;
      END;
      UPDATE public.scheduled_notifications
        SET last_status = 'sent', last_sent_count = v_count, last_error = NULL
        WHERE id = rec.id;
    ELSE
      UPDATE public.scheduled_notifications
        SET last_status = 'failed',
            last_error = left(coalesce(rec.error_msg, rec.content, 'Erreur inconnue'), 300)
        WHERE id = rec.id;
    END IF;
  END LOOP;

  -- Pas de réponse au bout de 30 min (réponse purgée ou appel perdu) : échec.
  UPDATE public.scheduled_notifications
    SET last_status = 'failed', last_error = 'Aucune réponse de la fonction d''envoi'
    WHERE last_status = 'pending' AND last_sent_at < now() - interval '30 minutes';
END;
$$;

-- Ces fonctions ne sont destinées qu'au cron (rôle postgres), pas au client.
REVOKE EXECUTE ON FUNCTION public.dispatch_scheduled_notifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_scheduled_notifications() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 5. Planification de la réconciliation (chaque minute, ne touche que
--    les envois "pending" donc quasi gratuit)
-- ============================================================

SELECT cron.unschedule('reconcile-scheduled-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-scheduled-notifications');

SELECT cron.schedule(
  'reconcile-scheduled-notifications',
  '* * * * *',
  'SELECT public.reconcile_scheduled_notifications();'
);

NOTIFY pgrst, 'reload schema';
