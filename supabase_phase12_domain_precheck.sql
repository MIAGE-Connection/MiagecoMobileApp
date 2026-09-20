-- MIAGE Connection — Phase 12 : contrôle du domaine AVANT la connexion Google.
-- L'app demande d'abord l'adresse email, appelle cette fonction, et n'ouvre l'écran
-- d'autorisation Google que si le domaine est autorisé : une personne d'un domaine
-- refusé ne partage donc jamais ses informations. Ré-exécutable.
--
-- La fonction ne renvoie qu'un booléen (jamais la liste des domaines ni l'association).

CREATE OR REPLACE FUNCTION public.is_email_domain_allowed(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_domains d
    WHERE d.is_active
      AND d.domain = lower(substring(trim(p_email) FROM '@([^@]+)$'))
  );
$$;

-- Appelable avant toute connexion (donc par « anon »).
REVOKE EXECUTE ON FUNCTION public.is_email_domain_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_email_domain_allowed(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
