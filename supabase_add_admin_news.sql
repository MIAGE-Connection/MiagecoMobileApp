-- MIAGE Connection - Actualités Admin (évolutions fédération)

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

CREATE INDEX IF NOT EXISTS idx_admin_news_published ON admin_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_news_order ON admin_news(order_index);

-- Données d'exemple
INSERT INTO admin_news (title, description, category, icon_name, order_index) VALUES
  ('Plateforme d''apprentissage MIAGE', 'Accédez aux cours et ressources pédagogiques mises à jour', 'Apprentissage', 'school-outline', 1),
  ('Forum MIAGE Community', 'Discussions et échanges entre MIAGistes de la fédération', 'Communauté', 'chatbubbles-outline', 2),
  ('Offres d''emploi partenaires', 'Opportunités professionnelles pour les diplômés MIAGE', 'Carrière', 'briefcase-outline', 3),
  ('Bibliothèque numérique MIAGE', 'Accès aux livres et ressources numériques de la fédération', 'Documentation', 'library-outline', 4),
  ('Réseau partenaires MIAGE', 'Liste de nos partenaires académiques et entreprises', 'Réseau', 'handshake-outline', 5),
  ('Guide MIAGE 2026', 'Guide complet et actualisé pour les étudiants MIAGE', 'Documentation', 'document-outline', 0);
