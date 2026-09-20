-- MIAGE Connection — Phase 16 : postes prédéfinis (liste gérée par le super admin) avec badge coloré.
-- Jusqu'ici l'adhérent tapait son poste librement. Désormais :
--   * le super admin gère la liste des postes (libellé + couleur, une couleur par poste) ;
--   * l'adhérent choisit son poste dans cette liste (Mon profil) ;
--   * l'annuaire affiche un badge de la couleur du poste.
-- Ré-exécutable. Prérequis : phases 3, 4 et 10 (vue profiles_public_view).
--
-- L'ancien champ libre profiles.position_in_association est conservé : il sert de repli (badge gris)
-- pour les adhérents qui n'ont pas encore choisi dans la liste. Quand un adhérent choisit un poste,
-- l'ancien texte est vidé (pas de doublon).

-- 1. Table des postes
CREATE TABLE IF NOT EXISTS public.member_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_positions_label_len CHECK (char_length(btrim(label)) BETWEEN 2 AND 40),
  CONSTRAINT member_positions_color_fmt CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Un libellé et une couleur ne sont utilisés qu'une fois (badges tous différents)
CREATE UNIQUE INDEX IF NOT EXISTS member_positions_label_key ON public.member_positions (lower(btrim(label)));
CREATE UNIQUE INDEX IF NOT EXISTS member_positions_color_key ON public.member_positions (upper(color));

ALTER TABLE public.member_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read" ON public.member_positions;
CREATE POLICY "authenticated_read" ON public.member_positions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_full_access" ON public.member_positions;
CREATE POLICY "admin_full_access" ON public.member_positions
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

-- 2. Poste choisi par l'adhérent (si le poste est supprimé, l'adhérent se retrouve sans poste)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.member_positions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_position_id_idx ON public.profiles (position_id);

-- 3. On ne peut choisir qu'un poste actif (l'existence est déjà garantie par la clé étrangère).
--    Garder un poste ensuite désactivé reste possible : seul un CHANGEMENT est contrôlé.
CREATE OR REPLACE FUNCTION public.check_profile_position()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.position_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.position_id IS DISTINCT FROM OLD.position_id)
     AND NOT EXISTS (SELECT 1 FROM public.member_positions WHERE id = NEW.position_id AND is_active) THEN
    RAISE EXCEPTION 'Ce poste n''est plus disponible' USING ERRCODE = '22023';
  END IF;

  -- Poste choisi dans la liste : l'ancien texte libre n'a plus lieu d'être
  IF NEW.position_id IS NOT NULL THEN
    NEW.position_in_association := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_profile_position ON public.profiles;
CREATE TRIGGER trg_check_profile_position
BEFORE INSERT OR UPDATE OF position_id, position_in_association ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_profile_position();

-- 4. Postes proposés au départ (modifiables ensuite depuis l'app)
INSERT INTO public.member_positions (label, color, sort_order) VALUES
  ('Président·e',                '#C62828', 10),
  ('Vice-président·e',           '#AD1457', 20),
  ('Trésorier·ère',              '#B45309', 30),
  ('Secrétaire général·e',       '#4527A0', 40),
  ('Responsable communication',  '#0E7490', 50),
  ('Responsable événementiel',   '#C2410C', 60),
  ('Pôle SI',                   '#6A1B9A', 65),
  ('Responsable partenariats',   '#2E7D32', 70),
  ('Membre du bureau',           '#1565C0', 80),
  ('Membre',                     '#455A64', 90)
ON CONFLICT DO NOTHING;

-- 5. Reprise de l'existant : un texte libre identique (casse et espaces ignorés) à un poste de la liste
--    devient ce poste. Les autres textes restent affichés en gris jusqu'à ce que l'adhérent choisisse.
UPDATE public.profiles p
SET position_id = mp.id
FROM public.member_positions mp
WHERE p.position_id IS NULL
  AND p.position_in_association IS NOT NULL
  AND lower(btrim(p.position_in_association)) = lower(btrim(mp.label));

-- 6. Annuaire : le libellé remonte dans la même colonne (repli sur l'ancien texte) + la couleur.
--    Les colonnes existantes gardent leur ordre ; les nouvelles sont ajoutées à la fin.
--    Le super admin voit les adhérents actifs de TOUTES les associations (d'où le nom de l'association) ;
--    les autres continuent de ne voir que ceux de leur association.
CREATE OR REPLACE VIEW public.profiles_public_view AS
SELECT p.id, p.full_name,
       COALESCE(mp.label, p.position_in_association) AS position_in_association,
       p.association_id, p.graduation_year, p.contact_email,
       (p.role = 'admin_association') AS is_referent,
       mp.color AS position_color,
       a.name AS association_name
FROM public.profiles p
LEFT JOIN public.member_positions mp ON mp.id = p.position_id
LEFT JOIN public.associations a ON a.id = p.association_id
WHERE NOT p.is_suspended
  AND p.valid_until >= current_date
  AND (
    p.association_id = (SELECT association_id FROM public.profiles WHERE id = auth.uid())
    OR public.is_federation_admin()
  )
  AND public.is_active_member();

GRANT SELECT ON public.profiles_public_view TO authenticated;

NOTIFY pgrst, 'reload schema';
