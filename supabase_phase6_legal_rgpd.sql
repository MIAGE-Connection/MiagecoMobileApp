-- MIAGE Connection — Phase 6 : contenu légal administrable + RGPD
-- Ré-exécutable sans erreur.

-- ============================================================
-- 1. legal_documents : CGU / confidentialité / mentions légales,
--    versionnés, éditables par l'admin national, lecture publique.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  key text PRIMARY KEY,
  version text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_key_check;
ALTER TABLE public.legal_documents
  ADD CONSTRAINT legal_documents_key_check CHECK (key IN ('cgu', 'confidentialite', 'mentions_legales'));

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;

DROP POLICY IF EXISTS "public_read" ON public.legal_documents;
CREATE POLICY "public_read" ON public.legal_documents
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write" ON public.legal_documents;
CREATE POLICY "admin_write" ON public.legal_documents
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

-- Contenu initial (v1.0). Modifiable ensuite directement en SQL par l'admin
-- national (UPDATE ... SET content = ..., version = ... WHERE key = ...).
INSERT INTO public.legal_documents (key, version, title, content) VALUES
(
  'mentions_legales',
  '1.0',
  'Mentions légales',
  E'Éditeur de l\'application\n\nL\'application MIAGE Connection est éditée par MIAGE Connection, association loi 1901 déclarée.\n\nSiège social : FAGE, 5 rue Frédérick Lemaître, 75020 Paris\nSIREN : 793 110 073\nSIRET : 793 110 073 00012\nIdentifiant RNA : W695003003\nContact : bureau@miage-connection.fr\n\nResponsable de la publication : le Président de MIAGE Connection.\n\nHébergement et sous-traitants techniques\n\n- Base de données et authentification : Supabase (Supabase Inc.)\n- Connexion : Google et Microsoft (authentification déléguée, aucun mot de passe géré par MIAGE Connection)\n- Notifications push : Expo (Expo Technologies) et Google Firebase Cloud Messaging\n- Distribution de l\'application : Google Play Store / Apple App Store\n\nPour toute question relative à l\'application, contacte bureau@miage-connection.fr.'
),
(
  'confidentialite',
  '1.0',
  'Politique de confidentialité',
  E'Cette politique explique quelles données sont collectées via l\'application MIAGE Connection et pourquoi.\n\nDonnées collectées\n\n- Ton nom et ton adresse email (fournis par Google ou Microsoft lors de la connexion)\n- Ton association d\'appartenance (déduite de ton adresse email)\n- Les informations de profil que tu renseignes toi-même (poste dans l\'association, année de promotion, email de contact)\n- Un identifiant technique de notification (token push) si tu actives les notifications\n- Tes préférences de notification\n\nPourquoi ces données sont collectées\n\nElles permettent de te rattacher à ton association, de te donner accès à l\'espace adhérent, et de t\'envoyer des notifications si tu le souhaites. Aucune donnée n\'est vendue ni partagée à des fins commerciales.\n\nQui a accès à tes données\n\n- Toi-même, dans l\'app\n- Le référent de ton association et l\'administration nationale de MIAGE Connection, dans le cadre de la gestion de la fédération\n- Les sous-traitants techniques listés dans les mentions légales (Supabase, Google, Microsoft, Expo/Firebase), uniquement pour faire fonctionner l\'app\n\nCombien de temps tes données sont conservées\n\nTant que ton compte est actif. Tu peux demander la suppression de ton compte à tout moment depuis l\'app.\n\nTes droits\n\nConformément au RGPD, tu peux à tout moment consulter, exporter ou demander la suppression de tes données depuis la section "Mes données" de l\'application, ou en écrivant à bureau@miage-connection.fr.'
),
(
  'cgu',
  '1.0',
  'Conditions générales d''utilisation',
  E'En utilisant l\'application MIAGE Connection, tu acceptes les présentes conditions.\n\nObjet\n\nL\'application MIAGE Connection est réservée aux étudiant·e·s et diplômé·e·s des associations fédérées MIAGE Connection. Elle donne accès à un espace adhérent (annuaire, documents, agenda fédéral, annonces) sous réserve de disposer d\'une adresse email rattachée à une association fédérée active.\n\nCompte et accès\n\nLa connexion se fait exclusivement via Google ou Microsoft, avec une adresse email professionnelle/étudiante reconnue par une association fédérée. MIAGE Connection ne gère aucun mot de passe. L\'accès à l\'espace adhérent est automatiquement suspendu si ton adresse n\'est plus rattachée à une association active, ou à l\'expiration de ta période d\'adhésion.\n\nComportement attendu\n\nTu t\'engages à ne pas usurper l\'identité d\'un tiers, à ne pas diffuser de contenu illicite, injurieux ou portant atteinte aux droits d\'autrui, et à utiliser l\'annuaire des adhérents uniquement dans un cadre associatif et respectueux.\n\nDonnées personnelles\n\nLe traitement de tes données personnelles est décrit dans la politique de confidentialité, accessible depuis l\'application.\n\nResponsabilité\n\nMIAGE Connection s\'efforce d\'assurer la disponibilité et l\'exactitude des informations diffusées, sans garantie de continuité de service. MIAGE Connection ne saurait être tenue responsable d\'un usage détourné de l\'application par un tiers.\n\nModification des CGU\n\nCes conditions peuvent être mises à jour. En cas de changement substantiel, une nouvelle acceptation te sera demandée lors de ta prochaine connexion.\n\nContact : bureau@miage-connection.fr'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. Acceptation des CGU par chaque adhérent
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cgu_accepted_version text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cgu_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.accept_cgu()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_version text;
BEGIN
  SELECT version INTO v_current_version FROM public.legal_documents WHERE key = 'cgu';
  IF v_current_version IS NULL THEN
    RAISE EXCEPTION 'Aucune version de CGU configurée' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
    SET cgu_accepted_version = v_current_version, cgu_accepted_at = now()
    WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_cgu() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_cgu() TO authenticated;

-- ============================================================
-- 3. is_active_member() : ajout du contrôle CGU (remplace la version
--    "permissive" de la phase 2 — même signature, comportement étendu).
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
  v_cgu_accepted_version text;
  v_current_cgu_version text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN false;
  END IF;
  v_domain := lower(split_part(v_email, '@', 2));

  SELECT is_suspended, valid_until, cgu_accepted_version
    INTO v_is_suspended, v_valid_until, v_cgu_accepted_version
  FROM public.profiles WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_is_suspended OR v_valid_until IS NULL OR v_valid_until < current_date THEN
    RETURN false;
  END IF;

  SELECT version INTO v_current_cgu_version FROM public.legal_documents WHERE key = 'cgu';
  IF v_current_cgu_version IS NOT NULL AND v_cgu_accepted_version IS DISTINCT FROM v_current_cgu_version THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.allowed_domains
    WHERE domain = v_domain AND is_active
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated;

-- ============================================================
-- 4. Export des données personnelles (RGPD, droit d'accès/portabilité)
-- ============================================================

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile jsonb;
  v_tokens jsonb;
  v_prefs jsonb;
BEGIN
  SELECT to_jsonb(p) - 'association_id' || jsonb_build_object('association_name', a.name)
    INTO v_profile
  FROM public.profiles p
  LEFT JOIN public.associations a ON a.id = p.association_id
  WHERE p.id = auth.uid();

  SELECT coalesce(jsonb_agg(to_jsonb(t) - 'user_id'), '[]'::jsonb) INTO v_tokens
  FROM public.push_tokens t WHERE t.user_id = auth.uid();

  SELECT to_jsonb(np) - 'user_id' INTO v_prefs
  FROM public.notification_preferences np WHERE np.user_id = auth.uid();

  RETURN jsonb_build_object(
    'profile', v_profile,
    'push_tokens', v_tokens,
    'notification_preferences', coalesce(v_prefs, '{}'::jsonb),
    'exported_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

-- ============================================================
-- 5. Demande de suppression de compte (traitement manuel par l'admin
--    national pour l'instant : la suppression réelle d'un compte auth
--    nécessite la service_role key, pas exposée côté client).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz
);

ALTER TABLE public.account_deletion_requests DROP CONSTRAINT IF EXISTS account_deletion_requests_status_check;
ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_status_check CHECK (status IN ('pending', 'processed'));

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT UPDATE ON public.account_deletion_requests TO authenticated;

DROP POLICY IF EXISTS "self_read_own" ON public.account_deletion_requests;
CREATE POLICY "self_read_own" ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_federation_admin());

DROP POLICY IF EXISTS "self_insert_own" ON public.account_deletion_requests;
CREATE POLICY "self_insert_own" ON public.account_deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_update" ON public.account_deletion_requests;
CREATE POLICY "admin_update" ON public.account_deletion_requests
  FOR UPDATE TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

NOTIFY pgrst, 'reload schema';
