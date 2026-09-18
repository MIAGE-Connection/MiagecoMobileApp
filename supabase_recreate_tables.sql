-- MIAGE Connection - Recréer toutes les tables pour les données dynamiques

-- Supprimer les tables existantes (optionnel, si vous voulez une réinitialisation)
-- DROP TABLE IF EXISTS events;
-- DROP TABLE IF EXISTS admin_news;
-- DROP TABLE IF EXISTS featured_events;

-- Créer la table events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer index pour events
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date DESC);

-- Insérer les données d'exemple pour events
DELETE FROM events;
INSERT INTO events (id, title, description, start_date, end_date, location, image_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Hackathon MIAGE', '24h de code - Prix à gagner', '2026-06-15', '2026-06-15', 'PARIS', NULL),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Conférence Cloud', 'Experts du cloud computing', '2026-06-10', '2026-06-10', 'LYON', NULL),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Réunion régionale', 'Bilan et perspectives', '2026-06-05', '2026-06-05', 'NANTERRE', NULL);

-- Créer la table featured_events
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

-- Créer index pour featured_events
CREATE INDEX IF NOT EXISTS idx_featured_events_active ON featured_events(is_active);

-- Insérer les données d'exemple pour featured_events
DELETE FROM featured_events;
INSERT INTO featured_events (id, title, description, start_date, end_date, location, ticket_url, stats, is_active) VALUES
  ('660e8400-e29b-41d4-a716-446655440001'::uuid, 'Congrès National MIAGE 2026', '3 jours - 18 universités - 600 MIAGistes réunis', '2026-11-21', '2026-11-23', 'MARSEILLE', 'https://miage-congress.fr', '600 MIAGistes attendus', true);

-- Créer la table admin_news
CREATE TABLE IF NOT EXISTS admin_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  icon_name TEXT DEFAULT 'newspaper-outline',
  url TEXT,
  order_index INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer index pour admin_news
CREATE INDEX IF NOT EXISTS idx_admin_news_published ON admin_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_news_order ON admin_news(order_index);

-- Insérer les données d'exemple pour admin_news
DELETE FROM admin_news;
INSERT INTO admin_news (id, title, description, category, icon_name, order_index) VALUES
  ('770e8400-e29b-41d4-a716-446655440001'::uuid, 'Plateforme d''apprentissage MIAGE', 'Accédez aux cours et ressources pédagogiques mises à jour', 'Apprentissage', 'school-outline', 1),
  ('770e8400-e29b-41d4-a716-446655440002'::uuid, 'Forum MIAGE Community', 'Discussions et échanges entre MIAGistes de la fédération', 'Communauté', 'chatbubbles-outline', 2),
  ('770e8400-e29b-41d4-a716-446655440003'::uuid, 'Offres d''emploi partenaires', 'Opportunités professionnelles pour les diplômés MIAGE', 'Carrière', 'briefcase-outline', 3),
  ('770e8400-e29b-41d4-a716-446655440004'::uuid, 'Bibliothèque numérique MIAGE', 'Accès aux livres et ressources numériques de la fédération', 'Documentation', 'library-outline', 4),
  ('770e8400-e29b-41d4-a716-446655440005'::uuid, 'Réseau partenaires MIAGE', 'Liste de nos partenaires académiques et entreprises', 'Réseau', 'handshake-outline', 5),
  ('770e8400-e29b-41d4-a716-446655440006'::uuid, 'Guide MIAGE 2026', 'Guide complet et actualisé pour les étudiants MIAGE', 'Documentation', 'document-outline', 0);
