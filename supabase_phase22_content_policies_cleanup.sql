-- MIAGE Connection — Phase 22 : suppression des anciennes règles d'accès créées à la main sur associations, events et news.
-- Constaté par le test des droits (supabase_tests_rls.sql) : ces règles, antérieures aux phases 1 à 4, s'ADDITIONNAIENT
-- aux règles correctes et rendaient lisibles par tous :
--   - les associations non publiées        ("Associations sont visibles par tous", "Associations visibles par tous" : USING true)
--   - les actualités non publiées          ("Actualités visibles par tous" : USING true)
--   - les événements non publiés ET les événements réservés aux adhérents, même pour un visiteur ou un adhérent expiré
--                                          ("Événements visibles par tous" : is_published seul, sans regarder la visibilité)
-- Les trois autres règles supprimées font doublon avec les règles en place et ignoraient l'état de l'adhésion :
--   - "Admins can update their own association"       (déjà couvert par referent_update_own)
--   - "Admins nationaux peuvent gérer les événements" (déjà couvert par admin_full_access)
--   - "Admins nationaux peuvent tout gérer" (news)    (déjà couvert par admin_full_access)
--
-- Ré-exécutable. Les règles conservées :
--   associations : public_read_published, referent_read_own, referent_update_own, admin_full_access
--   events       : public_read_published, members_read_member_events, referent_manage_own, admin_full_access
--   news         : public_read_published, admin_full_access

DROP POLICY IF EXISTS "Associations sont visibles par tous" ON public.associations;
DROP POLICY IF EXISTS "Associations visibles par tous" ON public.associations;
DROP POLICY IF EXISTS "Admins can update their own association" ON public.associations;

DROP POLICY IF EXISTS "Événements visibles par tous" ON public.events;
DROP POLICY IF EXISTS "Admins nationaux peuvent gérer les événements" ON public.events;

DROP POLICY IF EXISTS "Actualités visibles par tous" ON public.news;
DROP POLICY IF EXISTS "Admins nationaux peuvent tout gérer" ON public.news;

NOTIFY pgrst, 'reload schema';

-- Contrôle 1 : doit afficher exactement 4 règles pour associations, 4 pour events et 2 pour news.
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('associations', 'events', 'news')
ORDER BY tablename, policyname;

-- Contrôle 2 : autres règles du schéma public encore ouvertes à « tout le monde » (USING true) ou au rôle « public ».
-- À relire : chacune doit être voulue (textes légaux, liste des MIAgistes ou des fournisseurs email publics, etc.).
SELECT tablename, policyname, cmd, roles::text, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR roles::text LIKE '%public%')
ORDER BY tablename, policyname;
