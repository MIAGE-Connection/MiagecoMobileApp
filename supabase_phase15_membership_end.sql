-- MIAGE Connection — Phase 15 : date de fin d'adhésion configurable par le super admin.
-- Jusqu'ici la fin d'adhésion était figée au 31 août dans le code. Elle devient un réglage
-- (jour + mois, répété chaque année) stocké dans site_settings, clé « membership_end » (format MM-JJ).
-- Ré-exécutable. Prérequis : phases 2, 3 et 9.
--
--  * membership_end_date()  : prochaine occurrence de la date réglée, à partir d'aujourd'hui
--                             (aujourd'hui compris : se connecter le jour J donne une adhésion valable ce jour-là).
--  * ensure_my_profile()    : utilise ce réglage au lieu du 31 août en dur. Comportement inchangé tant
--                             que le réglage vaut 08-31.
--  * set_membership_end()   : réservé au super admin ; enregistre le réglage et, si demandé, l'applique
--                             tout de suite aux adhérents actifs (jamais à une date passée : personne
--                             n'est expiré du jour au lendemain par ce réglage).
--
-- Le SUPER ADMIN (admin_national) n'est jamais soumis à l'expiration ni au renouvellement : sa date de
-- fin est fixée en 2999 à chaque connexion, et « appliquer maintenant » ne la modifie pas.

-- 1. Valeur par défaut = comportement actuel
INSERT INTO public.site_settings (key, value) VALUES ('membership_end', '08-31')
ON CONFLICT (key) DO NOTHING;

-- 2. Prochaine date de fin (robuste : une valeur invalide retombe sur le 31 août ; le 29 février devient le 28)
CREATE OR REPLACE FUNCTION public.membership_end_date(p_from date DEFAULT current_date)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_raw text;
  v_month int := 8;
  v_day int := 31;
  v_year int := EXTRACT(YEAR FROM p_from)::int;
  v_candidate date;
BEGIN
  SELECT value INTO v_raw FROM public.site_settings WHERE key = 'membership_end';

  IF v_raw ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' THEN
    v_month := split_part(v_raw, '-', 1)::int;
    v_day := split_part(v_raw, '-', 2)::int;
    IF v_month = 2 AND v_day > 28 THEN v_day := 28; END IF;
  END IF;

  BEGIN
    v_candidate := make_date(v_year, v_month, v_day);
  EXCEPTION WHEN OTHERS THEN
    -- Jour inexistant dans ce mois (ex. 31 avril) : retour au 31 août.
    v_month := 8;
    v_day := 31;
    v_candidate := make_date(v_year, 8, 31);
  END;

  IF v_candidate < p_from THEN
    v_candidate := make_date(v_year + 1, v_month, v_day);
  END IF;
  RETURN v_candidate;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.membership_end_date(date) FROM PUBLIC, anon, authenticated;

-- 3. ensure_my_profile() : seule la ligne du calcul de valid_until change
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_domain text;
  v_asso_id uuid;
  v_valid_until date;
  v_role text;
  v_profile public.profiles;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié' USING ERRCODE = '42501';
  END IF;
  v_domain := lower(split_part(v_email, '@', 2));

  SELECT asso_id INTO v_asso_id
  FROM public.allowed_domains
  WHERE domain = v_domain AND is_active;

  IF v_asso_id IS NULL THEN
    RAISE EXCEPTION 'Aucune association fédérée ne correspond à ce domaine' USING ERRCODE = '42501';
  END IF;

  v_valid_until := public.membership_end_date();

  -- Le super admin n'a pas d'année d'adhésion : sa date reste très lointaine, donc il n'expire jamais.
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role = 'admin_national' THEN
    v_valid_until := DATE '2999-12-31';
  END IF;

  -- N'écrit jamais role/is_suspended : ils gardent leur valeur par défaut
  -- (ou leur valeur existante lors d'un renouvellement) pour qu'un adhérent
  -- ne puisse jamais s'auto-promouvoir via cette RPC.
  INSERT INTO public.profiles (id, email, association_id, valid_until)
  VALUES (auth.uid(), v_email, v_asso_id, v_valid_until)
  ON CONFLICT (id) DO UPDATE
    SET association_id = EXCLUDED.association_id,
        valid_until = EXCLUDED.valid_until,
        email = EXCLUDED.email
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- 4. Réglage par le super admin (+ application immédiate optionnelle). Renvoie le nombre d'adhérents modifiés.
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
  END IF;

  RETURN v_affected;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_membership_end(int, int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_membership_end(int, int, boolean) TO authenticated;

-- 5. Super admins déjà existants : plus d'expiration dès maintenant (sans attendre leur prochaine connexion)
UPDATE public.profiles
SET valid_until = DATE '2999-12-31'
WHERE role = 'admin_national' AND (valid_until IS NULL OR valid_until < DATE '2999-12-31');

NOTIFY pgrst, 'reload schema';
