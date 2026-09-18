-- Diagnostic: Vérifier si les tables existent et contiennent des données

-- Vérifier la table events
SELECT 'TABLE: events' as check_type;
SELECT COUNT(*) as event_count FROM events;
SELECT * FROM events LIMIT 5;

-- Vérifier la table admin_news
SELECT 'TABLE: admin_news' as check_type;
SELECT COUNT(*) as news_count FROM admin_news;
SELECT * FROM admin_news LIMIT 5;

-- Vérifier la table featured_events
SELECT 'TABLE: featured_events' as check_type;
SELECT COUNT(*) as featured_count FROM featured_events;
SELECT * FROM featured_events LIMIT 5;

-- Vérifier les colonnes de chaque table
SELECT 'COLUMNS: events' as check_type;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events';

SELECT 'COLUMNS: admin_news' as check_type;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_news';

SELECT 'COLUMNS: featured_events' as check_type;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'featured_events';
