-- MIAGE Connection — Phase 13 : un référent ne peut plus modifier le nom, la visibilité
-- ou le statut fédéré de son association en appelant la base directement.
-- (La policy "referent_update_own" autorisait TOUTES les colonnes ; l'écran verrouillait
-- seulement le nom côté interface.) Le référent garde la main sur : description, contact,
-- ville, adresse, site, Instagram, logo, compteurs. Le super admin garde tous les droits.
-- Ré-exécutable. Même principe que protect_profile_fields (phase 3).

CREATE OR REPLACE FUNCTION public.protect_association_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Appels internes (fonctions SECURITY DEFINER, ex. compteur de domaines) : autorisés.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_federation_admin() THEN
    NEW.name := OLD.name;
    NEW.is_published := OLD.is_published;
    NEW.is_federated := OLD.is_federated;
    NEW.domain_count := OLD.domain_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_association_fields ON public.associations;
CREATE TRIGGER trg_protect_association_fields
  BEFORE UPDATE ON public.associations
  FOR EACH ROW EXECUTE FUNCTION public.protect_association_fields();

NOTIFY pgrst, 'reload schema';
