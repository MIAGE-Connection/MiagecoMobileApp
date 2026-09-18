-- MIAGE Connection - Ajouter champs membres et nombre d'événements du mandat

ALTER TABLE associations ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 0;
ALTER TABLE associations ADD COLUMN IF NOT EXISTS mandate_events_count INTEGER DEFAULT 0;

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_associations_members_count ON associations(members_count);
