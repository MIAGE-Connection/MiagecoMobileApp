-- MIAGE Connection — Phase 21 : nettoyage des règles d'accès de la table profiles.
-- Constaté par le test des droits (supabase_tests_rls.sql) : un adhérent, même expiré, pouvait LIRE les profils
-- d'autres personnes (y compris d'autres associations). Cause probable : une ancienne règle créée à la main dans
-- le tableau de bord avant la phase 3, que la phase 3 ne supprimait pas (elle ne retirait que ses propres règles).
-- Les règles de lecture s'ADDITIONNENT : une seule règle trop large suffit à tout ouvrir.
--
-- Ce script supprime TOUTES les règles de profiles, puis recrée uniquement les 5 prévues (mêmes définitions
-- qu'en phase 3). Il est atomique (un seul bloc) et ré-exécutable.
--
--   self_read              : chacun lit son propre profil
--   admin_read_all         : le super admin lit tous les profils
--   referent_read_own_asso : l'admin d'asso lit les profils de son association
--   self_update            : chacun modifie son propre profil (les champs sensibles restent protégés par le trigger)
--   admin_update_all       : le super admin modifie tous les profils
--
-- L'annuaire des adhérents ne passe PAS par cette table : il utilise la vue profiles_public_view (colonnes limitées).

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    RAISE NOTICE 'Règle supprimée : %', pol.policyname;
    EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
  END LOOP;

  EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';

  EXECUTE $p$CREATE POLICY "self_read" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid())$p$;

  EXECUTE $p$CREATE POLICY "admin_read_all" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_federation_admin())$p$;

  EXECUTE $p$CREATE POLICY "referent_read_own_asso" ON public.profiles
    FOR SELECT TO authenticated
    USING (association_id IS NOT NULL AND public.is_asso_referent(association_id))$p$;

  EXECUTE $p$CREATE POLICY "self_update" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid())$p$;

  EXECUTE $p$CREATE POLICY "admin_update_all" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_federation_admin())
    WITH CHECK (public.is_federation_admin())$p$;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- Contrôle : doit afficher exactement les 5 règles ci-dessus, et aucune autre.
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
