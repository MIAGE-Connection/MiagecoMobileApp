-- MIAGE Connection — Phase 19 : rappel avant la fin d'adhésion + conservation limitée des données.
-- Ré-exécutable. Prérequis : phases 5c (pg_cron, pg_net, internal_config), 15 et 18,
-- et Edge Function send-notification REDÉPLOYÉE (elle accepte maintenant "expires_on").
--
-- 1. Rappel J-30 : chaque jour, si des adhérents actifs voient leur adhésion se terminer dans 30 jours,
--    une notification leur est envoyée (une seule fois par date de fin). Elle respecte les préférences de
--    notification (catégorie « annonces », donc reçue en mode « Toutes » ou « Essentielles »).
-- 2. Conservation : les données d'un adhérent sont supprimées 3 ans après la fin de sa dernière période
--    d'adhésion (durée de conservation annoncée dans la politique de confidentialité, phase 14).
--    Le journal des actions est purgé au bout d'un an. Chaque mois, tâche planifiée.
--    Les administrateurs (référents, super admin) ne sont jamais purgés automatiquement.

-- ============================================================
-- 1. Rappel avant la fin d'adhésion
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_membership_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_last text;
  v_target date := ((now() AT TIME ZONE 'Europe/Paris')::date + 30);
BEGIN
  SELECT value INTO v_url FROM public.internal_config WHERE key = 'edge_function_url';
  SELECT value INTO v_secret FROM public.internal_config WHERE key = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE EXCEPTION 'internal_config incomplète : lance la phase 5c.';
  END IF;

  -- Déjà envoyé pour cette date de fin ?
  SELECT value INTO v_last FROM public.internal_config WHERE key = 'membership_reminder_last_for';
  IF v_last = v_target::text THEN
    RETURN;
  END IF;

  -- Personne ne termine ce jour-là : rien à envoyer (et on ne marque rien, pour retenter demain si besoin).
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE valid_until = v_target AND NOT is_suspended
  ) THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := jsonb_build_object(
      'title', 'Ton adhésion se termine bientôt',
      'body', 'Ton adhésion MIAGE Connection se termine le ' || to_char(v_target, 'DD/MM/YYYY')
        || '. Après cette date, reconnecte-toi pour la renouveler en un tap.',
      'preference', 'announcements',
      'expires_on', v_target::text
    )
  );

  INSERT INTO public.internal_config (key, value) VALUES ('membership_reminder_last_for', v_target::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_membership_reminders() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('send-membership-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-membership-reminders');

-- Tous les jours à 8 h UTC (9 h en hiver, 10 h en été, heure de Paris)
SELECT cron.schedule('send-membership-reminders', '0 8 * * *', 'SELECT public.send_membership_reminders();');

-- ============================================================
-- 2. Conservation limitée des données
-- ============================================================

-- Supprime les comptes d'adhérents dont l'adhésion est terminée depuis plus de 3 ans, et le journal de plus d'un an.
-- p_dry_run = true (défaut) : ne supprime rien, renvoie seulement le nombre de comptes concernés.
CREATE OR REPLACE FUNCTION public.purge_expired_data(p_dry_run boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.profiles
  WHERE role = 'member' AND valid_until < (current_date - INTERVAL '3 years');

  IF p_dry_run THEN
    RETURN v_count;
  END IF;

  IF v_count > 0 THEN
    -- Supprimer l'utilisateur d'authentification emporte son profil et ses données (cascade, phase 10).
    DELETE FROM auth.users
    WHERE id IN (
      SELECT id FROM public.profiles
      WHERE role = 'member' AND valid_until < (current_date - INTERVAL '3 years')
    );
    PERFORM public.write_audit_log('account_purge', NULL, NULL, jsonb_build_object('count', v_count));
  END IF;

  DELETE FROM public.admin_audit_log
  WHERE created_at < now() - INTERVAL '1 year' AND action <> 'account_purge';

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_data(boolean) FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('purge-expired-data')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-data');

-- Le 1er de chaque mois à 3 h UTC
SELECT cron.schedule('purge-expired-data', '0 3 1 * *', 'SELECT public.purge_expired_data(false);');

-- Pour voir combien de comptes seraient supprimés, sans rien supprimer (à lancer dans l'éditeur SQL) :
--   SELECT public.purge_expired_data(true);

NOTIFY pgrst, 'reload schema';
