-- MIAGE Connection — Phase 8 : lien « Programme » de l'événement à la une
-- Ré-exécutable sans erreur.

ALTER TABLE public.featured_events ADD COLUMN IF NOT EXISTS program_url text;

NOTIFY pgrst, 'reload schema';
