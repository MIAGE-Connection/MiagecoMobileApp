-- MIAGE Connection — Phase 17 : suivi propre des demandes de suppression de compte.
-- Avant : la demande disparaissait avec le compte (aucune preuve de réponse sous un mois), l'adhérent pouvait
-- la renvoyer plusieurs fois et ne pouvait pas la retirer.
-- Maintenant :
--   * statuts : pending (en attente) / processed (compte supprimé) / cancelled (annulée) ;
--   * une seule demande en attente par personne ;
--   * l'adhérent peut annuler sa demande ; le super admin aussi (« à la demande de l'adhérent ») ;
--   * la demande est conservée après la suppression du compte, SANS lien vers la personne (dates + statut
--     seulement) et passe automatiquement à « processed » quand le compte est supprimé dans Supabase ;
--   * création et annulation passent par des fonctions contrôlées (plus d'écriture directe sur la table).
-- Ré-exécutable. Prérequis : phases 3, 6 et 10.
--
-- ⚠ Ne pas relancer la phase 10 après celle-ci : elle remettrait la clé étrangère en CASCADE
--   (la demande disparaîtrait de nouveau avec le compte).

-- 1. Colonnes, statuts, lien vers la personne facultatif
ALTER TABLE public.account_deletion_requests ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.account_deletion_requests ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.account_deletion_requests ADD COLUMN IF NOT EXISTS cancelled_by text;

ALTER TABLE public.account_deletion_requests DROP CONSTRAINT IF EXISTS account_deletion_requests_status_check;
ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_status_check CHECK (status IN ('pending', 'processed', 'cancelled'));

ALTER TABLE public.account_deletion_requests DROP CONSTRAINT IF EXISTS account_deletion_requests_cancelled_by_check;
ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_cancelled_by_check CHECK (cancelled_by IS NULL OR cancelled_by IN ('member', 'admin'));

-- Suppression du compte : la demande reste, détachée de la personne
ALTER TABLE public.account_deletion_requests DROP CONSTRAINT IF EXISTS account_deletion_requests_user_id_fkey;
ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Une seule demande en attente par personne (on garde la plus ancienne s'il y a déjà des doublons)
DELETE FROM public.account_deletion_requests a
USING public.account_deletion_requests b
WHERE a.status = 'pending' AND b.status = 'pending'
  AND a.user_id = b.user_id
  AND (a.requested_at, a.id) > (b.requested_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_one_pending
  ON public.account_deletion_requests (user_id) WHERE status = 'pending';

-- 3. Compte supprimé (Authentication > Users, ou toute autre voie) : la demande en attente passe à
--    « traitée » et perd son lien avec la personne. Aucune donnée personnelle ne reste dans la trace.
CREATE OR REPLACE FUNCTION public.close_deletion_request_on_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.account_deletion_requests
  SET status = 'processed', processed_at = now(), user_id = NULL
  WHERE user_id = OLD.id AND status = 'pending';
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_deletion_request_on_profile_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_close_deletion_request ON public.profiles;
CREATE TRIGGER trg_close_deletion_request
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.close_deletion_request_on_profile_delete();

-- 4. Plus d'écriture directe : lecture seule (l'adhérent lit la sienne, le super admin lit tout)
DROP POLICY IF EXISTS "self_insert_own" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "admin_update" ON public.account_deletion_requests;
REVOKE INSERT, UPDATE, DELETE ON public.account_deletion_requests FROM authenticated, anon;
GRANT SELECT ON public.account_deletion_requests TO authenticated;

-- 5. Demander la suppression de son compte (renvoie la date de la demande ; sans effet si une demande est déjà en cours)
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requested_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.account_deletion_requests (user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) WHERE status = 'pending' DO NOTHING;

  SELECT requested_at INTO v_requested_at
  FROM public.account_deletion_requests
  WHERE user_id = auth.uid() AND status = 'pending';

  RETURN v_requested_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- 6. L'adhérent retire sa propre demande (uniquement « en attente » → « annulée »)
CREATE OR REPLACE FUNCTION public.cancel_my_deletion_request()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  UPDATE public.account_deletion_requests
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'member'
  WHERE user_id = auth.uid() AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_my_deletion_request() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_deletion_request() TO authenticated;

-- 7. Le super admin annule une demande (l'adhérent l'a contacté pour la retirer)
CREATE OR REPLACE FUNCTION public.cancel_deletion_request(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_federation_admin() THEN
    RAISE EXCEPTION 'Réservé au super admin' USING ERRCODE = '42501';
  END IF;

  UPDATE public.account_deletion_requests
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin'
  WHERE id = p_id AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_deletion_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_deletion_request(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
