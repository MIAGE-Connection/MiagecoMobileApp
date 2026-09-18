-- MIAGE Connection - Ajouter table événement principal

CREATE TABLE IF NOT EXISTS featured_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  ticket_url TEXT,
  image_url TEXT,
  stats TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_featured_events_active ON featured_events(is_active);

-- Données d'exemple
INSERT INTO featured_events (title, description, start_date, end_date, location, ticket_url, stats, is_active) VALUES
  ('Congrès National MIAGE 2026', '3 jours - 18 universités - 600 MIAGistes réunis', '2026-11-21', '2026-11-23', 'MARSEILLE', 'https://miage-congress.fr', '600 MIAGistes attendus', true);
