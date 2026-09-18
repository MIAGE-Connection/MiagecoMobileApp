-- MIAGE Connection — Phase 4 : espace adhérent
-- Ré-exécutable sans erreur.
--
-- Tout est fermé par défaut : un visiteur ou un membre dont l'adhésion a
-- expiré (is_active_member() = false) ne voit rien de ce qui suit.

-- ============================================================
-- 1. events.visibility : un événement peut être public ou réservé
--    aux adhérents actifs, indépendamment de is_published
-- ============================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_visibility_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'members'));

-- Remplace la policy de lecture publique posée en phase 1 UNIQUEMENT pour
-- `events` (les autres tables de contenu gardent leur policy d'origine) :
-- un événement 'members' n'est jamais renvoyé à anon / à un membre inactif.
DROP POLICY IF EXISTS "public_read_published" ON public.events;
CREATE POLICY "public_read_published" ON public.events
  FOR SELECT TO anon, authenticated
  USING (is_published AND visibility = 'public');

DROP POLICY IF EXISTS "members_read_member_events" ON public.events;
CREATE POLICY "members_read_member_events" ON public.events
  FOR SELECT TO authenticated
  USING (is_published AND visibility = 'members' AND public.is_active_member());

-- ============================================================
-- 2. member_documents : documents internes (fédération ou une asso)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.member_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asso_id uuid REFERENCES public.associations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  category text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_documents TO authenticated;

-- asso_id NULL = document fédéral, visible par tout adhérent actif.
-- asso_id renseigné = document interne réservé aux adhérents de cette asso.
DROP POLICY IF EXISTS "members_read" ON public.member_documents;
CREATE POLICY "members_read" ON public.member_documents
  FOR SELECT TO authenticated
  USING (
    public.is_active_member()
    AND (
      asso_id IS NULL
      OR asso_id = (SELECT association_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "admin_full_access" ON public.member_documents;
CREATE POLICY "admin_full_access" ON public.member_documents
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

DROP POLICY IF EXISTS "referent_manage_own" ON public.member_documents;
CREATE POLICY "referent_manage_own" ON public.member_documents
  FOR ALL TO authenticated
  USING (asso_id IS NOT NULL AND public.is_asso_referent(asso_id))
  WITH CHECK (asso_id IS NOT NULL AND public.is_asso_referent(asso_id));

-- ============================================================
-- 3. announcements : annonces (fédération ou une asso)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asso_id uuid REFERENCES public.associations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

DROP POLICY IF EXISTS "members_read" ON public.announcements;
CREATE POLICY "members_read" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    is_published
    AND public.is_active_member()
    AND (
      asso_id IS NULL
      OR asso_id = (SELECT association_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "admin_full_access" ON public.announcements;
CREATE POLICY "admin_full_access" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_federation_admin())
  WITH CHECK (public.is_federation_admin());

DROP POLICY IF EXISTS "referent_manage_own" ON public.announcements;
CREATE POLICY "referent_manage_own" ON public.announcements
  FOR ALL TO authenticated
  USING (asso_id IS NOT NULL AND public.is_asso_referent(asso_id))
  WITH CHECK (asso_id IS NOT NULL AND public.is_asso_referent(asso_id));

-- ============================================================
-- 4. Annuaire adhérents : vue à colonnes limitées, scopée à sa
--    propre association. Volontairement PAS security_invoker : la vue
--    tourne avec les privilèges de son propriétaire (bypass RLS sur
--    `profiles`) et applique elle-même le filtre "même association +
--    adhérent actif", exactement comme les fonctions is_*() ci-dessus.
-- ============================================================

CREATE OR REPLACE VIEW public.profiles_public_view AS
SELECT p.id, p.full_name, p.position_in_association, p.association_id, p.graduation_year
FROM public.profiles p
WHERE NOT p.is_suspended
  AND p.valid_until >= current_date
  AND p.association_id = (SELECT association_id FROM public.profiles WHERE id = auth.uid())
  AND public.is_active_member();

GRANT SELECT ON public.profiles_public_view TO authenticated;

NOTIFY pgrst, 'reload schema';
