-- MIAGE Connection — Phase 1 : fondations données & lecture publique
-- Ré-exécutable sans erreur. Ne touche PAS aux tables `profiles`/`miagistes`
-- (annuaire adhérents) : leur mise sous RLS avec colonnes limitées arrive en
-- phase 4 (espace adhérent), pour ne pas casser l'annuaire MIAGistes existant
-- avant qu'une vue "colonnes publiques" ne soit prête.

-- ============================================================
-- 1. Colonne is_published sur toutes les tables de contenu
-- ============================================================

ALTER TABLE associations ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
ALTER TABLE admin_news ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- featured_events utilisait `is_active` : on le renomme en is_published pour
-- rester sur une convention unique dans toute l'app.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'featured_events' AND column_name = 'is_active'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'featured_events' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE featured_events RENAME COLUMN is_active TO is_published;
  END IF;
END $$;

ALTER TABLE featured_events ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- `events`/`featured_events` avaient déjà une colonne is_published/is_active
-- créée hors de ce script, avec `DEFAULT true` et sans NOT NULL : on aligne
-- sur la même convention que associations/admin_news (brouillon par défaut).
ALTER TABLE events ALTER COLUMN is_published SET DEFAULT false;
ALTER TABLE events ALTER COLUMN is_published SET NOT NULL;
ALTER TABLE featured_events ALTER COLUMN is_published SET DEFAULT false;
ALTER TABLE featured_events ALTER COLUMN is_published SET NOT NULL;

-- ============================================================
-- 2. Backfill : rien ne doit disparaître de ce qui est déjà visible
-- ============================================================

UPDATE associations SET is_published = true WHERE is_published = false;
UPDATE events SET is_published = true WHERE is_published = false;
UPDATE admin_news SET is_published = true WHERE is_published = false;
UPDATE featured_events SET is_published = true WHERE is_published = false;

-- ============================================================
-- 3. RLS — lecture publique uniquement (écritures admin en phase 3)
-- ============================================================

ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_published" ON associations;
CREATE POLICY "public_read_published" ON associations
  FOR SELECT TO anon, authenticated
  USING (is_published);

DROP POLICY IF EXISTS "public_read_published" ON events;
CREATE POLICY "public_read_published" ON events
  FOR SELECT TO anon, authenticated
  USING (is_published);

DROP POLICY IF EXISTS "public_read_published" ON admin_news;
CREATE POLICY "public_read_published" ON admin_news
  FOR SELECT TO anon, authenticated
  USING (is_published);

DROP POLICY IF EXISTS "public_read_published" ON featured_events;
CREATE POLICY "public_read_published" ON featured_events
  FOR SELECT TO anon, authenticated
  USING (is_published);

DROP POLICY IF EXISTS "public_read_published" ON news;
CREATE POLICY "public_read_published" ON news
  FOR SELECT TO anon, authenticated
  USING (is_published);

-- Remarque : RLS est activé sans policy d'écriture pour l'instant.
-- Tant qu'aucune policy INSERT/UPDATE/DELETE n'existe, Postgres refuse ces
-- écritures à `anon`/`authenticated` par défaut. Si le dashboard admin actuel
-- (créer/éditer une association, publier une actu) doit continuer à
-- fonctionner avant la phase 3, il faut soit :
--   a) garder ces écritures faites depuis le dashboard Supabase (rôle
--      service_role, qui contourne RLS), soit
--   b) ajouter temporairement une policy d'écriture large ici.
-- Vérifier après exécution que le dashboard admin de l'app fonctionne encore ;
-- sinon exécuter en complément (à retirer en phase 3 quand les vraies
-- policies de rôle arrivent) :
--
-- CREATE POLICY "authenticated_write_tmp" ON associations
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- (idem pour events / admin_news / featured_events si nécessaire)

NOTIFY pgrst, 'reload schema';
