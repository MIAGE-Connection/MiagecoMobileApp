-- MIAGE Connection — Phase 18 : journal des actions sensibles + ordre des postes.
-- Ré-exécutable. Prérequis : phases 3, 15 et 16.
--
-- 1. Journal (admin_audit_log), rempli par des TRIGGERS (donc impossible à contourner depuis l'app,
--    et les changements faits à la main dans Supabase sont aussi tracés, sans auteur) :
--      * suspension / réactivation d'un compte ;
--      * nomination / retrait d'un référent (et tout autre changement de rôle) ;
--      * modification de la date de fin d'adhésion, et son application immédiate aux adhérents.
--    Lecture réservée au super admin ; personne ne peut écrire ni effacer depuis l'app.
--    Quand un compte est supprimé, son nom/email disparaît du journal (l'action reste, anonymisée).
--    Le journal est purgé au bout de 1 an (phase 19).
-- 2. Ordre des postes : fonction atomique appelée par les flèches haut / bas de l'écran « Postes ».

-- ============================================================
-- 1. Journal des actions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,          -- NULL = action faite hors de l'app (console Supabase) ou compte supprimé depuis
  actor_label text,
  action text NOT NULL,
  target_id uuid,         -- compte concerné, le cas échéant
  target_label text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'member_suspended', 'member_reactivated',
    'referent_appointed', 'referent_removed', 'role_changed',
    'membership_end_changed', 'membership_end_applied',
    'account_purge'
  ))
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx ON public.admin_audit_log (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON public.admin_audit_log (target_id) WHERE target_id IS NOT NULL;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;

DROP POLICY IF EXISTS "admin_read" ON public.admin_audit_log;
CREATE POLICY "admin_read" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_federation_admin());

-- Écrit une ligne de journal (fonction interne : jamais appelable depuis l'app)
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_target_id uuid,
  p_target_label text,
  p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_label text;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT COALESCE(NULLIF(btrim(full_name), ''), email) INTO v_actor_label FROM public.profiles WHERE id = v_actor;
  END IF;

  INSERT INTO public.admin_audit_log (actor_id, actor_label, action, target_id, target_label, details)
  VALUES (v_actor, v_actor_label, p_action, p_target_id, p_target_label, COALESCE(p_details, '{}'::jsonb));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.write_audit_log(text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Suspension / rôle d'un profil
CREATE OR REPLACE FUNCTION public.log_profile_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_label text := COALESCE(NULLIF(btrim(NEW.full_name), ''), NEW.email);
  v_asso text;
BEGIN
  IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
    PERFORM public.write_audit_log(
      CASE WHEN NEW.is_suspended THEN 'member_suspended' ELSE 'member_reactivated' END,
      NEW.id, v_label, '{}'::jsonb
    );
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT name INTO v_asso FROM public.associations WHERE id = NEW.association_id;
    PERFORM public.write_audit_log(
      CASE
        WHEN NEW.role = 'admin_association' AND OLD.role = 'member' THEN 'referent_appointed'
        WHEN OLD.role = 'admin_association' AND NEW.role = 'member' THEN 'referent_removed'
        ELSE 'role_changed'
      END,
      NEW.id, v_label,
      jsonb_build_object('from', OLD.role, 'to', NEW.role, 'association', v_asso)
    );
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_profile_admin_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_profile_admin_change ON public.profiles;
CREATE TRIGGER trg_log_profile_admin_change
AFTER UPDATE OF is_suspended, role ON public.profiles
FOR EACH ROW
WHEN (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended OR OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.log_profile_admin_change();

-- Date de fin d'adhésion
CREATE OR REPLACE FUNCTION public.log_membership_end_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.key = 'membership_end' AND (TG_OP = 'INSERT' OR OLD.value IS DISTINCT FROM NEW.value) THEN
    PERFORM public.write_audit_log(
      'membership_end_changed', NULL, NULL,
      jsonb_build_object('from', CASE WHEN TG_OP = 'UPDATE' THEN OLD.value END, 'to', NEW.value)
    );
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_membership_end_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_membership_end_change ON public.site_settings;
CREATE TRIGGER trg_log_membership_end_change
AFTER INSERT OR UPDATE ON public.site_settings
FOR EACH ROW
WHEN (NEW.key = 'membership_end')
EXECUTE FUNCTION public.log_membership_end_change();

-- « Appliquer maintenant » : même fonction qu'en phase 15, avec en plus la trace du nombre d'adhérents modifiés
CREATE OR REPLACE FUNCTION public.set_membership_end(
  p_month int,
  p_day int,
  p_apply_to_active boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_affected int := 0;
  v_end date;
BEGIN
  IF NOT public.is_federation_admin() THEN
    RAISE EXCEPTION 'Réservé au super admin' USING ERRCODE = '42501';
  END IF;

  IF p_month IS NULL OR p_day IS NULL OR p_month NOT BETWEEN 1 AND 12 OR p_day < 1 THEN
    RAISE EXCEPTION 'Date invalide' USING ERRCODE = '22023';
  END IF;
  -- Année non bissextile de référence : le 29 février est exclu.
  IF p_day > EXTRACT(DAY FROM (make_date(2027, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day'))::int THEN
    RAISE EXCEPTION 'Ce jour n''existe pas dans ce mois' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES ('membership_end', lpad(p_month::text, 2, '0') || '-' || lpad(p_day::text, 2, '0'), now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;

  IF p_apply_to_active THEN
    v_end := public.membership_end_date();
    -- Seuls les adhérents actifs sont concernés ; un compte suspendu ou déjà expiré n'est pas rouvert,
    -- et le super admin (sans expiration) n'est jamais touché.
    UPDATE public.profiles
    SET valid_until = v_end
    WHERE NOT is_suspended AND valid_until >= current_date AND role <> 'admin_national';
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    PERFORM public.write_audit_log(
      'membership_end_applied', NULL, NULL,
      jsonb_build_object('count', v_affected, 'until', v_end)
    );
  END IF;

  RETURN v_affected;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_membership_end(int, int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_membership_end(int, int, boolean) TO authenticated;

-- Compte supprimé : le nom / l'email disparaît du journal (droit à l'effacement), l'action reste.
CREATE OR REPLACE FUNCTION public.anonymize_audit_log_on_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.admin_audit_log SET actor_id = NULL, actor_label = NULL WHERE actor_id = OLD.id;
  UPDATE public.admin_audit_log SET target_id = NULL, target_label = NULL WHERE target_id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anonymize_audit_log_on_profile_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_anonymize_audit_log ON public.profiles;
CREATE TRIGGER trg_anonymize_audit_log
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.anonymize_audit_log_on_profile_delete();

-- ============================================================
-- 2. Ordre des postes (atomique : la liste reçue devient l'ordre d'affichage)
-- ============================================================

CREATE OR REPLACE FUNCTION public.reorder_member_positions(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_federation_admin() THEN
    RAISE EXCEPTION 'Réservé au super admin' USING ERRCODE = '42501';
  END IF;

  UPDATE public.member_positions mp
  SET sort_order = t.ord * 10
  FROM unnest(p_ids) WITH ORDINALITY AS t(id, ord)
  WHERE mp.id = t.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_member_positions(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_member_positions(uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
