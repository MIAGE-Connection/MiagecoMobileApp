-- MIAGE Connection — Phase 7 : référent unique + transfert, liste des MIAGistes privée
-- Ré-exécutable sans erreur.

-- ============================================================
-- 1. Un seul référent par association
-- ============================================================

DO $$
DECLARE
  dup text;
BEGIN
  SELECT string_agg(a.name, ', ') INTO dup
  FROM public.associations a
  WHERE (
    SELECT count(*) FROM public.profiles p
    WHERE p.association_id = a.id AND p.role = 'admin_association'
  ) > 1;

  IF dup IS NOT NULL THEN
    RAISE EXCEPTION
      'Plusieurs référents pour : %. Repasse les surnuméraires en role = ''member'' puis relance ce script.', dup;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_referent_per_association
  ON public.profiles (association_id)
  WHERE role = 'admin_association';

-- ============================================================
-- 2. assign_referent : nomme un membre référent de son association
--    et retire le rôle à l'ancien référent, en une seule transaction.
--    - le référent actuel peut passer la main à un membre de SON asso
--    - l'admin fédération peut le faire pour n'importe quelle asso
--    Le trigger protect_profile_fields laisse passer : la fonction est
--    SECURITY DEFINER (current_user <> 'authenticated').
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_referent(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_asso uuid;
  v_role text;
  v_suspended boolean;
  v_valid_until date;
BEGIN
  SELECT association_id, role, is_suspended, valid_until
    INTO v_asso, v_role, v_suspended, v_valid_until
  FROM public.profiles
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membre introuvable';
  END IF;
  IF v_asso IS NULL THEN
    RAISE EXCEPTION 'Ce membre n''est rattaché à aucune association';
  END IF;
  IF v_role = 'admin_national' THEN
    RAISE EXCEPTION 'Un admin fédération ne peut pas devenir référent';
  END IF;
  IF v_role = 'admin_association' THEN
    RAISE EXCEPTION 'Ce membre est déjà référent';
  END IF;
  IF v_suspended OR v_valid_until IS NULL OR v_valid_until < current_date THEN
    RAISE EXCEPTION 'Ce membre n''est pas un adhérent actif';
  END IF;

  IF NOT (public.is_federation_admin() OR public.is_asso_referent(v_asso)) THEN
    RAISE EXCEPTION 'Action réservée à l''admin fédération ou au référent de cette association';
  END IF;

  UPDATE public.profiles
     SET role = 'member'
   WHERE association_id = v_asso AND role = 'admin_association';

  UPDATE public.profiles
     SET role = 'admin_association'
   WHERE id = p_member_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_referent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_referent(uuid) TO authenticated;

-- ============================================================
-- 3. Liste des MIAGistes : réservée aux adhérents actifs (compte requis)
--    On repart d'un état propre en supprimant les anciennes policies
--    (dont une éventuelle lecture publique), puis on pose les nouvelles.
-- ============================================================

DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.miagistes') IS NULL THEN
    RETURN;
  END IF;

  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'miagistes'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.miagistes', pol.policyname);
  END LOOP;

  EXECUTE 'ALTER TABLE public.miagistes ENABLE ROW LEVEL SECURITY';
  EXECUTE 'REVOKE ALL ON public.miagistes FROM anon';

  EXECUTE $p$CREATE POLICY "members_read" ON public.miagistes
             FOR SELECT TO authenticated USING (public.is_active_member())$p$;
  EXECUTE $p$CREATE POLICY "admin_full_access" ON public.miagistes
             FOR ALL TO authenticated
             USING (public.is_federation_admin())
             WITH CHECK (public.is_federation_admin())$p$;
END $$;

NOTIFY pgrst, 'reload schema';
