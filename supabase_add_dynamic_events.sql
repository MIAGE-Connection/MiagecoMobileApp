-- MIAGE Connection - Table événements dynamiques

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

CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);

-- Données d'exemple
INSERT INTO events (title, description, start_date, end_date, location) VALUES
  ('Hackathon MIAGE', '24h de code - Prix à gagner', '2026-06-15', '2026-06-15', 'PARIS'),
  ('Conférence Cloud', 'Experts du cloud computing', '2026-06-10', '2026-06-10', 'LYON'),
  ('Réunion régionale', 'Bilan et perspectives', '2026-06-05', '2026-06-05', 'NANTERRE');
