-- MIAGE Connection — Phase 20 : « Terminer toutes les adhésions » (bouton du super admin).
-- Fin d'année : le super admin met fin d'un coup à l'adhésion de tous les adhérents actifs.
-- Chacun est basculé sur l'écran « Ton adhésion a expiré » et renouvelle en un tap
-- (la nouvelle date de fin est alors calculée avec le réglage de la phase 15).
-- Ré-exécutable. Prérequis : phases 15 et 18.
--
--  * Sont concernés : les comptes actifs (non suspendus, adhésion en cours), référents compris.
--  * Jamais concerné : le super admin (sans expiration).
--  * L'adhésion se termine tout de suite (date de fin = hier), pas ce soir.
--  * L'action est inscrite au journal des actions (phase 18).

-- 1. Le journal accepte la nouvelle action
ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'member_suspended', 'member_reactivated',
    'referent_appointed', 'referent_removed', 'role_changed',
    'membership_end_changed', 'membership_end_applied', 'membership_ended_all',
    'account_purge'
  ));

-- 2. Fonction réservée au super admin ; renvoie le nombre d'adhésions terminées
CREATE OR REPLACE FUNCTION public.end_all_memberships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_federation_admin() THEN
    RAISE EXCEPTION 'Réservé au super admin' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET valid_until = current_date - 1
  WHERE role <> 'admin_national'
    AND NOT is_suspended
    AND valid_until >= current_date;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.write_audit_log('membership_ended_all', NULL, NULL, jsonb_build_object('count', v_count));

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.end_all_memberships() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_all_memberships() TO authenticated;

NOTIFY pgrst, 'reload schema';
