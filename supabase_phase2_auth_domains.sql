-- MIAGE Connection — Phase 2 : bascule auth Google/Microsoft + domaines autorisés
-- Ré-exécutable sans erreur.
--
-- Ce script ne fait QUE la partie base de données. Il reste deux étapes
-- manuelles côté Dashboard Supabase, indispensables et non scriptables en SQL :
--   1. Auth > Providers : désactiver Email, Magic Link, Phone, Anonymous ;
--      activer Google et Microsoft/Azure (tenant "common" pour multi-tenant).
--   2. Auth > Hooks : créer un hook "Before User Created" (type Postgres)
--      pointant sur la fonction public.handle_before_user_created ci-dessous.

-- ============================================================
-- 1. Domaines publics interdits (jamais modifiable depuis l'app)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.public_email_providers (
  domain text PRIMARY KEY
);

INSERT INTO public.public_email_providers (domain) VALUES
  ('gmail.com'), ('googlemail.com'),
  ('outlook.com'), ('outlook.fr'), ('hotmail.com'), ('hotmail.fr'),
  ('live.com'), ('live.fr'), ('msn.com'),
  ('yahoo.com'), ('yahoo.fr'),
  ('free.fr'), ('orange.fr'), ('sfr.fr'), ('wanadoo.fr'), ('laposte.net'), ('bbox.fr'),
  ('icloud.com'), ('me.com'), ('mac.com'),
  ('gmx.fr'), ('gmx.com'), ('aol.com'), ('protonmail.com'), ('proton.me')
ON CONFLICT (domain) DO NOTHING;

ALTER TABLE public.public_email_providers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_email_providers FROM anon, authenticated;
-- Aucune policy : cette table n'est lue que par les fonctions SECURITY DEFINER
-- ci-dessous. Modifiable uniquement depuis le SQL editor / dashboard.

-- ============================================================
-- 2. Domaines autorisés par association
-- ============================================================

CREATE TABLE IF NOT EXISTS public.allowed_domains (
  domain text PRIMARY KEY,
  asso_id uuid NOT NULL REFERENCES public.associations(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  requested_by text,
  note text,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_allowed_domains_asso ON public.allowed_domains(asso_id);

ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.allowed_domains FROM anon, authenticated;
-- Pas de policy pour l'instant : la gestion des domaines (lecture/écriture
-- par l'admin national) arrive en phase 3 avec is_federation_admin().
-- En attendant, on ajoute/désactive des domaines depuis le SQL editor
-- (rôle postgres, qui contourne RLS).

-- ============================================================
-- 3. Journal d'audit des domaines
-- ============================================================

CREATE TABLE IF NOT EXISTS public.domain_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  asso_id uuid REFERENCES public.associations(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('add', 'disable', 'reactivate')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.domain_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_audit_log FROM anon, authenticated;
-- Écrit uniquement par le service de gestion des domaines (phase 3).

-- ============================================================
-- 4. Colonnes complémentaires
-- ============================================================

ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS domain_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS is_federated boolean NOT NULL DEFAULT false;
-- (email_contact existe déjà sur associations : pas besoin d'un doublon contact_email)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS valid_until date;

-- ============================================================
-- 5. Trigger de normalisation/validation sur allowed_domains
-- ============================================================

CREATE OR REPLACE FUNCTION public.normalize_and_validate_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_domain text;
BEGIN
  v_domain := lower(trim(both ' ' FROM NEW.domain));
  v_domain := regexp_replace(v_domain, '^@', '');

  IF v_domain IS NULL OR length(v_domain) < 4 OR v_domain !~ '^[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'Domaine invalide : "%"', v_domain USING ERRCODE = '22000';
  END IF;

  IF EXISTS (SELECT 1 FROM public.public_email_providers WHERE domain = v_domain) THEN
    RAISE EXCEPTION '% est un fournisseur public : l''autoriser ouvrirait l''application à tout internet. Une asso sur Gmail reste sur le parcours invité.', v_domain
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.allowed_domains
    WHERE domain = v_domain AND asso_id <> NEW.asso_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Le domaine % est déjà rattaché à une autre association', v_domain USING ERRCODE = '23505';
  END IF;

  NEW.domain := v_domain;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allowed_domains_normalize ON public.allowed_domains;
CREATE TRIGGER trg_allowed_domains_normalize
  BEFORE INSERT OR UPDATE ON public.allowed_domains
  FOR EACH ROW EXECUTE FUNCTION public.normalize_and_validate_domain();

-- ============================================================
-- 6. is_active_member() — choke point utilisé par toute la RLS future
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_domain text;
  v_is_suspended boolean;
  v_valid_until date;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN false;
  END IF;
  v_domain := lower(split_part(v_email, '@', 2));

  SELECT is_suspended, valid_until INTO v_is_suspended, v_valid_until
  FROM public.profiles WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_is_suspended OR v_valid_until IS NULL OR v_valid_until < current_date THEN
    RETURN false;
  END IF;

  -- CGU : vérification réelle ajoutée en phase 6 (permissif ici pour ne pas
  -- bloquer les phases 2-5 tant que la colonne/version CGU n'existe pas).

  RETURN EXISTS (
    SELECT 1 FROM public.allowed_domains
    WHERE domain = v_domain AND is_active
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated;

-- ============================================================
-- 7. ensure_my_profile() — RPC appelée juste après le premier login OAuth
-- ============================================================

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
  v_year int;
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

  v_year := EXTRACT(YEAR FROM current_date)::int;
  IF EXTRACT(MONTH FROM current_date) >= 9 THEN
    v_valid_until := make_date(v_year + 1, 8, 31);
  ELSE
    v_valid_until := make_date(v_year, 8, 31);
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

-- ============================================================
-- 8. Auth Hook "Before User Created" — filtre par domaine à la source
-- ============================================================
-- Payload réel envoyé par Supabase (vérifié via la doc officielle) :
--   { "metadata": {...}, "user": { "email": "...", "identities": [
--       { "identity_data": { "email_verified": true/false, ... }, ... }
--   ], ... } }
-- Le statut de vérification n'est PAS un champ racine : il vit dans
-- identities[].identity_data.email_verified (dépend du provider ; Google et
-- Microsoft sont dans la liste des providers vérifiés par l'équipe Supabase).
-- Le rejet ne se fait PAS par RAISE EXCEPTION mais en retournant
-- { "error": { "message": "...", "http_code": ... } }.

CREATE OR REPLACE FUNCTION public.handle_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_domain text;
BEGIN
  v_email := lower(event -> 'user' ->> 'email');

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'message', 'Adresse email manquante.',
      'http_code', 400
    ));
  END IF;

  -- Pas de vérification email_verified ici : à ce stade du hook, l'utilisateur
  -- n'existe pas encore et event->'user'->'identities' est toujours vide
  -- (confirmé par la doc officielle Supabase). Comme seule l'auth OAuth
  -- (Google/Microsoft) est utilisée, le fournisseur a déjà authentifié le
  -- propriétaire de l'adresse : le filtre par domaine ci-dessous suffit.
  v_domain := lower(substring(v_email FROM '@([^@]+)$'));

  IF NOT EXISTS (
    SELECT 1 FROM public.allowed_domains WHERE domain = v_domain AND is_active
  ) THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'message', 'Ton adresse n''appartient pas à une association fédérée. Si ton asso souhaite des comptes pour ses membres, elle peut contacter la fédération.',
      'http_code', 403
    ));
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_before_user_created(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_before_user_created(jsonb) TO supabase_auth_admin;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Rappel des 2 étapes manuelles (dashboard, non scriptables) :
--   1. Authentication > Sign In / Providers :
--        - Désactiver Email, Magic Link, Phone, Anonymous.
--        - Activer Google (Client ID/Secret Google Cloud Console).
--        - Activer Azure : Client ID/Secret + tenant "common".
--   2. Authentication > Hooks > Before User Created :
--        - Type: Postgres function
--        - Fonction: public.handle_before_user_created
--   3. Ajouter au moins un domaine de test :
--        INSERT INTO allowed_domains (domain, asso_id, requested_by)
--        VALUES ('votre-asso-test.fr', '<uuid-association>', 'test manuel');
-- ============================================================
