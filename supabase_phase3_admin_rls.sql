-- MIAGE Connection — Phase 3 : admin à deux niveaux + RLS d'écriture
-- Ré-exécutable sans erreur.
--
-- Contexte / bug corrigé par ce script :
-- `profiles.role` avait `DEFAULT 'admin_association'`. Comme `ensure_my_profile()`
-- (phase 2) n'écrit jamais `role` et laisse Postgres appliquer le défaut de la
-- colonne, **tout nouveau membre OAuth devenait admin de son association par
-- défaut**. Ce script introduit un vrai rôle `member` (adhérent simple, sans
-- droit d'admin) comme défaut, et verrouille en base qui peut écrire quoi.

-- ============================================================
-- 0. Nettoyage des éventuelles policies temporaires de la phase 1
-- ============================================================

DROP POLICY IF EXISTS "authenticated_write_tmp" ON public.associations;
DROP POLICY IF EXISTS "authenticated_write_tmp" ON public.events;
DROP POLICY IF EXISTS "authenticated_write_tmp" ON public.admin_news;
DROP POLICY IF EXISTS "authenticated_write_tmp" ON public.featured_events;

-- ============================================================
-- 1. profiles.role : nouveau défaut, valeurs autorisées, RLS
-- ============================================================

UPDATE public.profiles SET role = 'member' WHERE role IS NULL;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('member', 'admin_association', 'admin_national'));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Fonctions de rôle (SECURITY DEFINER pour lire profiles sans
--    dépendre des policies RLS qu'on définit juste après)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_federation_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin_national' AND NOT is_suspended
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_federation_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_federation_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_asso_referent(p_asso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin_association'
      AND association_id = p_asso_id
      AND NOT is_suspended
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_asso_referent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_asso_referent(uuid) TO authenticated;

-- ============================================================
-- 3. Garde-fou anti auto-promotion : personne ne modifie ses propres
--    role / is_suspended / association_id / valid_until par un appel
--    direct à l'API — même un admin national. Seul un AUTRE admin,
--    ou une fonction interne (ensure_my_profile, exécutée par le
--    propriétaire de la fonction donc current_user <> 'authenticated'),
--    peut faire évoluer ces colonnes.
-- ============================================================

-- Volontairement SECURITY INVOKER (pas DEFINER) : ce trigger a besoin de voir
-- le VRAI current_user de l'appelant pour distinguer un appel client direct
-- ('authenticated') d'un appel interne via ensure_my_profile() (exécuté sous
-- le propriétaire de la fonction). En SECURITY DEFINER, current_user aurait
-- toujours été le propriétaire du trigger, rendant le garde-fou inopérant.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id OR NOT public.is_federation_admin() THEN
    NEW.role := OLD.role;
    NEW.is_suspended := OLD.is_suspended;
    NEW.association_id := OLD.association_id;
    NEW.valid_until := OLD.valid_until;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- ============================================================
-- 4. Policies profiles
-- ============================================================

DROP POLICY IF EXISTS "self_read" ON public.profiles;
CREATE POLICY "self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "admin_read_all" ON public.profiles;
CREATE POLICY "admin_read_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_federation_admin());

DROP POLICY IF EXISTS "referent_read_own_asso" ON public.profiles;
CREATE POLICY "referent_read_own_asso" ON public.profiles
  FOR SELECT TO authenticated
  USING (association_id IS NOT NULL AND public.is_asso_referent(association_id));

DROP POLICY IF EXISTS "self_update" ON public.profiles;
CREATE POLICY "self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_update_all" ON public.profiles;
CREATE POLICY "admin_update_all" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

-- Pas de policy INSERT/DELETE pour authenticated : la création passe
-- uniquement par ensure_my_profile() (SECURITY DEFINER), la suppression
-- de compte sera traitée en phase 6 (RGPD).

-- ============================================================
-- 5. Policies associations (lecture publique déjà posée en phase 1)
-- ============================================================

DROP POLICY IF EXISTS "admin_full_access" ON public.associations;
CREATE POLICY "admin_full_access" ON public.associations
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

DROP POLICY IF EXISTS "referent_read_own" ON public.associations;
CREATE POLICY "referent_read_own" ON public.associations
  FOR SELECT TO authenticated
  USING (public.is_asso_referent(id));

DROP POLICY IF EXISTS "referent_update_own" ON public.associations;
CREATE POLICY "referent_update_own" ON public.associations
  FOR UPDATE TO authenticated
  USING (public.is_asso_referent(id))
  WITH CHECK (public.is_asso_referent(id));

-- Pas d'INSERT/DELETE pour le référent : créer/retirer une association de la
-- fédération reste une décision de l'admin national.

-- ============================================================
-- 6. Policies events (peuvent être rattachés à une association ou
--    nationaux si association_id IS NULL)
-- ============================================================

DROP POLICY IF EXISTS "admin_full_access" ON public.events;
CREATE POLICY "admin_full_access" ON public.events
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

DROP POLICY IF EXISTS "referent_manage_own" ON public.events;
CREATE POLICY "referent_manage_own" ON public.events
  FOR ALL TO authenticated
  USING (association_id IS NOT NULL AND public.is_asso_referent(association_id))
  WITH CHECK (association_id IS NOT NULL AND public.is_asso_referent(association_id));

-- ============================================================
-- 7. Policies admin_news / featured_events (contenu national uniquement)
-- ============================================================

DROP POLICY IF EXISTS "admin_full_access" ON public.admin_news;
CREATE POLICY "admin_full_access" ON public.admin_news
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

DROP POLICY IF EXISTS "admin_full_access" ON public.featured_events;
CREATE POLICY "admin_full_access" ON public.featured_events
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

-- ============================================================
-- 8. allowed_domains : géré par l'admin national, visible en lecture
--    par le référent de l'association concernée
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_domains TO authenticated;

DROP POLICY IF EXISTS "admin_full_access" ON public.allowed_domains;
CREATE POLICY "admin_full_access" ON public.allowed_domains
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

DROP POLICY IF EXISTS "referent_read_own" ON public.allowed_domains;
CREATE POLICY "referent_read_own" ON public.allowed_domains
  FOR SELECT TO authenticated
  USING (public.is_asso_referent(asso_id));

-- ============================================================
-- 9. domain_audit_log : lecture seule (admin national : tout,
--    référent : son association). Écriture uniquement via le
--    trigger ci-dessous (jamais par un appel client direct).
-- ============================================================

GRANT SELECT ON public.domain_audit_log TO authenticated;

DROP POLICY IF EXISTS "admin_read_all" ON public.domain_audit_log;
CREATE POLICY "admin_read_all" ON public.domain_audit_log
  FOR SELECT TO authenticated
  USING (public.is_federation_admin());

DROP POLICY IF EXISTS "referent_read_own" ON public.domain_audit_log;
CREATE POLICY "referent_read_own" ON public.domain_audit_log
  FOR SELECT TO authenticated
  USING (public.is_asso_referent(asso_id));

CREATE OR REPLACE FUNCTION public.log_domain_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.domain_audit_log (domain, asso_id, action, actor_id, requested_by)
    VALUES (NEW.domain, NEW.asso_id, 'add', auth.uid(), NEW.requested_by);
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active AND NOT NEW.is_active THEN
    INSERT INTO public.domain_audit_log (domain, asso_id, action, actor_id, requested_by)
    VALUES (NEW.domain, NEW.asso_id, 'disable', auth.uid(), NEW.requested_by);
  ELSIF TG_OP = 'UPDATE' AND NOT OLD.is_active AND NEW.is_active THEN
    INSERT INTO public.domain_audit_log (domain, asso_id, action, actor_id, requested_by)
    VALUES (NEW.domain, NEW.asso_id, 'reactivate', auth.uid(), NEW.requested_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_domain_audit ON public.allowed_domains;
CREATE TRIGGER trg_log_domain_audit
AFTER INSERT OR UPDATE ON public.allowed_domains
FOR EACH ROW EXECUTE FUNCTION public.log_domain_audit();

NOTIFY pgrst, 'reload schema';
