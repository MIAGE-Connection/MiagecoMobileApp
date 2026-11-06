-- MIAGE Connection — Test des droits (RLS) avec de faux comptes. À lancer dans l'éditeur SQL de Supabase.
--
-- Ce que ça fait : crée 7 faux comptes (super admin, admin d'asso, 4 adhérents dont un expiré et un suspendu,
-- un adhérent d'une autre association), puis rejoue ~170 actions EN SE FAISANT PASSER POUR CHACUN d'eux,
-- exactement comme le ferait l'app avec leur session. Chaque ligne du rapport dit si l'accès a bien été
-- accordé ou refusé comme prévu.
--
-- SANS DANGER : tout se passe dans une seule transaction qui est ANNULÉE à la fin (le script se termine
-- volontairement par une « erreur » qui contient le rapport). Aucun faux compte, aucune donnée, aucun changement
-- n'est conservé. Il ne touche jamais aux vrais comptes : chaque action vise uniquement les faux comptes.
--
-- Comment lire le résultat : Supabase affiche « ERROR: … RAPPORT DES TESTS DE DROITS … ». C'est NORMAL, c'est le rapport.
--   ✘ = un accès n'est pas comme prévu (à corriger)      ✔ = conforme
-- Si tu vois une autre erreur AVANT le rapport, c'est la création des faux comptes qui a échoué : envoie-la-moi.
--
-- Modes des tests : t = la requête doit renvoyer « vrai » ; x = la requête doit être REFUSÉE (erreur) ;
--                   tz = « vrai » ou refusée, les deux conviennent (accès interdit ou table vide).
-- Un « refus » n'est accepté que si c'est un vrai refus d'accès (droit manquant, règle de sécurité) : une autre
-- erreur (table ou colonne inconnue…) est signalée comme échec, pour qu'un test ne puisse pas réussir par accident.
-- Prérequis : phases 1 à 20 lancées.

DO $rls$
DECLARE
  tests jsonb := $json$[
    ["ANON","Visiteur sans compte : ne voit aucun profil","SELECT count(*) = 0 FROM public.profiles","tz"],
    ["ANON","Visiteur sans compte : ne voit aucun document adhérent","SELECT count(*) = 0 FROM public.member_documents","tz"],
    ["ANON","Visiteur sans compte : ne voit pas le journal des actions","SELECT count(*) = 0 FROM public.admin_audit_log","tz"],
    ["ANON","Visiteur sans compte : ne voit pas les demandes de suppression","SELECT count(*) = 0 FROM public.account_deletion_requests","tz"],
    ["ANON","Visiteur sans compte : ne voit pas les jetons de notification","SELECT count(*) = 0 FROM public.push_tokens","tz"],
    ["ANON","Visiteur sans compte : ne peut pas créer de poste","INSERT INTO public.member_positions (label, color) VALUES ('zz-anon', '#0A0B0F')","x"],
    ["ANON","Visiteur sans compte : ne peut pas terminer les adhésions","SELECT public.end_all_memberships()","x"],
    ["ANON","Visiteur sans compte : ne peut pas demander la suppression d'un compte","SELECT public.request_account_deletion()","x"],
    ["ANON","Visiteur : voit un événement public publié (contrôle)","SELECT count(*) = 1 FROM public.events WHERE id = '{EVP}'","t"],
    ["ANON","Visiteur : ne voit pas un événement non publié","SELECT count(*) = 0 FROM public.events WHERE id = '{EVU}'","t"],
    ["ANON","Visiteur : ne voit pas un événement réservé aux adhérents","SELECT count(*) = 0 FROM public.events WHERE id = '{EVM}'","t"],
    ["ANON","Visiteur : ne voit pas une association non publiée","SELECT count(*) = 0 FROM public.associations WHERE id = '{AC}'","t"],
    ["ANON","Visiteur : ne voit pas une actualité non publiée","SELECT count(*) = 0 FROM public.news WHERE id = '{NEWU}'","t"],
    ["ANON","Visiteur : ne voit pas une actualité admin non publiée","SELECT count(*) = 0 FROM public.admin_news WHERE id = '{ADMU}'","t"],
    ["ANON","Visiteur : ne voit pas un événement à la une non publié","SELECT count(*) = 0 FROM public.featured_events WHERE id = '{FEAU}'","t"],
    ["ANON","Visiteur : ne voit pas la liste des MIAgistes","SELECT count(*) = 0 FROM public.miagistes","tz"],
    ["ANON","Visiteur : ne voit pas l'historique des notifications","SELECT count(*) = 0 FROM public.notification_history","tz"],
    ["ANON","Visiteur : ne voit pas les notifications programmées","SELECT count(*) = 0 FROM public.scheduled_notifications","tz"],
    ["ANON","Visiteur : voit les textes légaux (contrôle)","SELECT count(*) >= 3 FROM public.legal_documents","t"],

    ["MA","Adhérent : voit son propre profil (contrôle)","SELECT count(*) = 1 FROM public.profiles","t"],
    ["MA","Adhérent : est reconnu comme actif (contrôle)","SELECT public.is_active_member()","t"],
    ["MA","Adhérent : ne voit pas le profil d'un adhérent d'une autre association","SELECT count(*) = 0 FROM public.profiles WHERE id = '{MB}'","t"],
    ["MA","Annuaire : voit les adhérents actifs de son association (contrôle)","SELECT count(*) = 3 FROM public.profiles_public_view WHERE id IN ('{MA}','{MA2}','{RA}')","t"],
    ["MA","Annuaire : ne voit aucune autre association","SELECT count(*) = 0 FROM public.profiles_public_view WHERE association_id <> '{AA}'","t"],
    ["MA","Annuaire : ne voit ni les expirés, ni les suspendus, ni l'autre association","SELECT count(*) = 0 FROM public.profiles_public_view WHERE id IN ('{EA}','{SU}','{MB}')","t"],
    ["MA","Profil : ne peut pas se donner le rôle super admin","WITH u AS (UPDATE public.profiles SET role = 'admin_national' WHERE id = '{MA}' RETURNING role) SELECT count(*) = 1 AND bool_and(role = 'member') FROM u","t"],
    ["MA","Profil : ne peut pas changer d'association","WITH u AS (UPDATE public.profiles SET association_id = '{AB}' WHERE id = '{MA}' RETURNING association_id) SELECT count(*) = 1 AND bool_and(association_id = '{AA}') FROM u","t"],
    ["MA","Profil : ne peut pas prolonger sa propre adhésion","WITH u AS (UPDATE public.profiles SET valid_until = DATE '2999-12-31' WHERE id = '{MA}' RETURNING valid_until) SELECT count(*) = 1 AND bool_and(valid_until < DATE '2999-12-31') FROM u","t"],
    ["MA","Profil : ne peut pas modifier le profil d'un adhérent d'une autre association","WITH u AS (UPDATE public.profiles SET full_name = 'hack' WHERE id = '{MB}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["MA","Profil : ne peut pas modifier le profil d'un collègue de son association","WITH u AS (UPDATE public.profiles SET full_name = 'hack' WHERE id = '{MA2}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["MA","Profil : ne peut pas le supprimer directement","WITH d AS (DELETE FROM public.profiles WHERE id = '{MA}' RETURNING 1) SELECT count(*) = 0 FROM d","tz"],
    ["MA","Profil : ne peut pas créer un profil","INSERT INTO public.profiles (id, email) VALUES (gen_random_uuid(), 'x@rls-a.test')","x"],
    ["MA","Poste : peut choisir un poste actif","WITH u AS (UPDATE public.profiles SET position_id = '{POS}' WHERE id = '{MA}' RETURNING position_id) SELECT count(*) = 1 AND bool_and(position_id = '{POS}') FROM u","t"],
    ["MA","Poste : ne peut pas choisir un poste désactivé","UPDATE public.profiles SET position_id = '{POSOFF}' WHERE id = '{MA}'","x"],
    ["MA","Postes : peut lire la liste (contrôle)","SELECT count(*) >= 1 FROM public.member_positions","t"],
    ["MA","Postes : ne peut pas en créer","INSERT INTO public.member_positions (label, color) VALUES ('zz-hack', '#0A0B0E')","x"],
    ["MA","Postes : ne peut pas en modifier","WITH u AS (UPDATE public.member_positions SET label = 'hack' WHERE id = '{POS}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["MA","Documents : voit ceux de son association et de la fédération","SELECT count(*) = 2 FROM public.member_documents WHERE id IN ('{DOCA}','{DOCG}')","t"],
    ["MA","Documents : ne voit pas ceux d'une autre association","SELECT count(*) = 0 FROM public.member_documents WHERE id = '{DOCB}'","t"],
    ["MA","Documents : ne peut pas en ajouter","INSERT INTO public.member_documents (asso_id, title, file_url) VALUES ('{AA}', 'x', 'https://x.test')","x"],
    ["MA","Annonces : voit celles de son association, pas celles d'une autre","SELECT (SELECT count(*) FROM public.announcements WHERE id = '{ANA}') = 1 AND (SELECT count(*) FROM public.announcements WHERE id = '{ANB}') = 0","t"],
    ["MA","Journal des actions : invisible","SELECT count(*) = 0 FROM public.admin_audit_log","tz"],
    ["MA","Journal des domaines : invisible","SELECT count(*) = 0 FROM public.domain_audit_log","tz"],
    ["MA","Domaines autorisés : invisibles","SELECT count(*) = 0 FROM public.allowed_domains","tz"],
    ["MA","Configuration interne : inaccessible","SELECT count(*) = 0 FROM public.internal_config","tz"],
    ["MA","Réglages : ne peut pas modifier la date de fin d'adhésion","WITH u AS (UPDATE public.site_settings SET value = '01-01' WHERE key = 'membership_end' RETURNING 1) SELECT count(*) = 0 FROM u","tz"],
    ["MA","Réglages : ne peut pas en créer","INSERT INTO public.site_settings (key, value) VALUES ('zz-hack', 'x')","x"],
    ["MA","Associations : ne peut pas modifier une fiche","WITH u AS (UPDATE public.associations SET name = 'hack' WHERE id = '{AA}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["MA","Jetons de notification : ne voit pas ceux des autres","SELECT count(*) = 0 FROM public.push_tokens WHERE user_id <> '{MA}'","t"],
    ["MA","Préférences de notification : ne voit pas celles des autres","SELECT count(*) = 0 FROM public.notification_preferences WHERE user_id <> '{MA}'","t"],
    ["MA","« Ça m'intéresse » : ne voit pas ceux des autres","SELECT count(*) = 0 FROM public.event_interests WHERE user_id <> '{MA}'","t"],
    ["MA","Suppression de compte : aucune demande visible au départ","SELECT count(*) = 0 FROM public.account_deletion_requests","t"],
    ["MA","Suppression de compte : peut faire sa demande","SELECT public.request_account_deletion() IS NOT NULL","t"],
    ["MA","Suppression de compte : voit sa demande, pas celle des autres","SELECT count(*) = 1 FROM public.account_deletion_requests","t"],
    ["MA","Suppression de compte : ne peut pas annuler la demande d'un autre","SELECT public.cancel_deletion_request('{DRB}')","x"],
    ["MA","Suppression de compte : peut annuler sa propre demande","SELECT public.cancel_my_deletion_request()","t"],
    ["MA","Fonction réservée : terminer toutes les adhésions","SELECT public.end_all_memberships()","x"],
    ["MA","Fonction réservée : changer la date de fin d'adhésion","SELECT public.set_membership_end(1, 1, false)","x"],
    ["MA","Fonction réservée : ordre des postes","SELECT public.reorder_member_positions(ARRAY['{POS}']::uuid[])","x"],
    ["MA","Fonction réservée : nommer un admin d'asso","SELECT public.assign_referent('{MA2}')","x"],
    ["MA","Fonction interne : écrire dans le journal","SELECT public.write_audit_log('role_changed', NULL, NULL, '{}'::jsonb)","x"],
    ["MA","Fonction interne : purge des données","SELECT public.purge_expired_data(true)","x"],
    ["MA","Fonction interne : rappels d'adhésion","SELECT public.send_membership_reminders()","x"],
    ["MA","Contenu : voit un événement réservé aux adhérents (contrôle)","SELECT count(*) = 1 FROM public.events WHERE id = '{EVM}'","t"],
    ["MA","Contenu : ne voit pas un événement non publié","SELECT count(*) = 0 FROM public.events WHERE id = '{EVU}'","t"],
    ["MA","Contenu : ne voit pas une association non publiée","SELECT count(*) = 0 FROM public.associations WHERE id = '{AC}'","t"],
    ["MA","Contenu : ne voit pas une actualité non publiée","SELECT count(*) = 0 FROM public.news WHERE id = '{NEWU}'","t"],
    ["MA","Contenu : ne voit pas une actualité admin non publiée","SELECT count(*) = 0 FROM public.admin_news WHERE id = '{ADMU}'","t"],
    ["MA","Contenu : ne voit pas un événement à la une non publié","SELECT count(*) = 0 FROM public.featured_events WHERE id = '{FEAU}'","t"],
    ["MA","Contenu : ne peut pas créer d'actualité","INSERT INTO public.news (title) VALUES ('hack')","x"],
    ["MA","Contenu : ne peut pas créer d'événement","INSERT INTO public.events (title, start_date) VALUES ('hack', now())","x"],
    ["MA","Contenu : ne peut pas créer d'actualité admin","INSERT INTO public.admin_news (title, description) VALUES ('h', 'h')","x"],
    ["MA","Contenu : ne peut pas créer d'événement à la une","INSERT INTO public.featured_events (title) VALUES ('h')","x"],
    ["MA","Contenu : ne peut pas créer d'association","INSERT INTO public.associations (name) VALUES ('hack')","x"],
    ["MA","Contenu : ne peut pas modifier une actualité","WITH u AS (UPDATE public.news SET title = 'hack' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["MA","Contenu : ne peut pas modifier un événement","WITH u AS (UPDATE public.events SET title = 'hack' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["MA","Contenu : ne peut pas supprimer un événement","WITH d AS (DELETE FROM public.events RETURNING 1) SELECT count(*) = 0 FROM d","tz"],
    ["MA","Notifications : voit l'historique des notifications envoyées (contrôle)","SELECT count(*) >= 1 FROM public.notification_history WHERE id = '{NH}'","t"],
    ["MA","Notifications : ne peut pas écrire dans l'historique","INSERT INTO public.notification_history (title, body) VALUES ('h', 'h')","x"],
    ["MA","Notifications : ne voit pas les notifications programmées","SELECT count(*) = 0 FROM public.scheduled_notifications","tz"],
    ["MA","Notifications : ne voit pas l'historique technique d'envoi","SELECT count(*) = 0 FROM public.notification_send_log","tz"],
    ["MA","Notifications : ne voit pas les modèles","SELECT count(*) = 0 FROM public.notification_templates","tz"],
    ["MA","Notifications : ne peut pas enregistrer un jeton pour un autre compte","INSERT INTO public.push_tokens (user_id, expo_push_token) VALUES ('{MB}', 'ExponentPushToken[hack]')","x"],
    ["MA","Notifications : ne peut pas modifier les préférences d'un autre","WITH u AS (UPDATE public.notification_preferences SET announcements = false WHERE user_id = '{MB}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["MA","« Ça m'intéresse » : ne peut pas le poser au nom d'un autre","INSERT INTO public.event_interests (event_id, user_id) VALUES ('{EVP}', '{MB}')","x"],
    ["MA","MIAgistes : voit la liste (contrôle)","SELECT count(*) >= 1 FROM public.miagistes WHERE id = '{MIA}'","t"],
    ["MA","MIAgistes : ne peut pas en ajouter","INSERT INTO public.miagistes (full_name) VALUES ('hack')","x"],
    ["MA","Textes légaux : ne peut pas les modifier","WITH u AS (UPDATE public.legal_documents SET content = 'hack' RETURNING 1) SELECT count(*) = 0 FROM u","tz"],
    ["MA","Fournisseurs email publics : ne peut pas en ajouter","INSERT INTO public.public_email_providers (domain) VALUES ('zz-hack.test')","x"],
    ["MA","Stockage : ne peut pas envoyer de fichier dans le dossier des associations","INSERT INTO storage.objects (bucket_id, name) VALUES ('associations', '{AC}/hack.webp')","x"],

    ["RA","Admin d'asso : est reconnu comme actif (contrôle)","SELECT public.is_active_member()","t"],
    ["RA","Admin d'asso : voit les profils de son association, même expirés ou suspendus","SELECT count(*) >= 6 FROM public.profiles WHERE association_id = '{AA}'","t"],
    ["RA","Admin d'asso : ne voit aucun profil d'une autre association","SELECT count(*) = 0 FROM public.profiles WHERE association_id = '{AB}'","t"],
    ["RA","Annuaire : ne voit que son association","SELECT count(*) = 0 FROM public.profiles_public_view WHERE association_id <> '{AA}'","t"],
    ["RA","Profil : ne peut pas se donner le rôle super admin","WITH u AS (UPDATE public.profiles SET role = 'admin_national' WHERE id = '{RA}' RETURNING role) SELECT count(*) = 1 AND bool_and(role = 'admin_association') FROM u","t"],
    ["RA","Ne peut pas suspendre un adhérent","WITH u AS (UPDATE public.profiles SET is_suspended = true WHERE id = '{MA2}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["RA","Ne peut pas changer directement le rôle d'un adhérent","WITH u AS (UPDATE public.profiles SET role = 'admin_association' WHERE id = '{MA2}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["RA","Ne peut pas prolonger l'adhésion d'un adhérent","WITH u AS (UPDATE public.profiles SET valid_until = DATE '2999-12-31' WHERE id = '{MA2}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["RA","Journal des actions : invisible","SELECT count(*) = 0 FROM public.admin_audit_log","tz"],
    ["RA","Suppression de compte : ne voit pas les demandes des autres","SELECT count(*) = 0 FROM public.account_deletion_requests","t"],
    ["RA","Documents : ne peut pas en ajouter (réservé au super admin)","INSERT INTO public.member_documents (asso_id, title, file_url) VALUES ('{AA}', 'x', 'https://x.test')","x"],
    ["RA","Documents : ne voit pas ceux d'une autre association","SELECT count(*) = 0 FROM public.member_documents WHERE id = '{DOCB}'","t"],
    ["RA","Annonces : peut en créer pour son association","WITH i AS (INSERT INTO public.announcements (asso_id, title, body) VALUES ('{AA}', 't', 'b') RETURNING 1) SELECT count(*) = 1 FROM i","t"],
    ["RA","Annonces : ne peut pas en créer pour une autre association","INSERT INTO public.announcements (asso_id, title, body) VALUES ('{AB}', 't', 'b')","x"],
    ["RA","Fonction réservée au super admin : terminer toutes les adhésions","SELECT public.end_all_memberships()","x"],
    ["RA","Fonction réservée au super admin : date de fin d'adhésion","SELECT public.set_membership_end(1, 1, false)","x"],
    ["RA","Fonction réservée au super admin : ordre des postes","SELECT public.reorder_member_positions(ARRAY['{POS}']::uuid[])","x"],
    ["RA","Fonction réservée au super admin : annuler une demande de suppression","SELECT public.cancel_deletion_request('{DRB}')","x"],
    ["RA","Ne peut pas nommer admin un adhérent d'une autre association","SELECT public.assign_referent('{MB}')","x"],
    ["RA","Contenu : peut créer un événement pour son association","WITH i AS (INSERT INTO public.events (title, start_date, association_id) VALUES ('ZZ', now(), '{AA}') RETURNING 1) SELECT count(*) = 1 FROM i","t"],
    ["RA","Contenu : ne peut pas créer un événement pour une autre association","INSERT INTO public.events (title, start_date, association_id) VALUES ('h', now(), '{AB}')","x"],
    ["RA","Contenu : ne peut pas créer d'actualité","INSERT INTO public.news (title) VALUES ('hack')","x"],
    ["RA","Contenu : ne peut pas créer d'actualité admin","INSERT INTO public.admin_news (title, description) VALUES ('h', 'h')","x"],
    ["RA","Contenu : ne peut pas créer d'événement à la une","INSERT INTO public.featured_events (title) VALUES ('h')","x"],
    ["RA","Association : peut modifier la description de la sienne","WITH u AS (UPDATE public.associations SET description = 'ok' WHERE id = '{AA}' RETURNING 1) SELECT count(*) = 1 FROM u","t"],
    ["RA","Association : ne peut pas modifier celle d'une autre","WITH u AS (UPDATE public.associations SET description = 'hack' WHERE id = '{AB}' RETURNING 1) SELECT count(*) = 0 FROM u","t"],
    ["RA","Association : ne peut pas changer le nom ni la publication de la sienne","WITH u AS (UPDATE public.associations SET name = 'hack', is_published = false WHERE id = '{AA}' RETURNING name, is_published) SELECT count(*) = 1 AND bool_and(name = 'ZZ-TEST A' AND is_published) FROM u","t"],
    ["RA","Notifications : ne voit pas les notifications programmées","SELECT count(*) = 0 FROM public.scheduled_notifications","tz"],
    ["RA","Domaines : ne peut pas en ajouter","INSERT INTO public.allowed_domains (domain, asso_id) VALUES ('zz-hack.test', '{AA}')","x"],
    ["RA","Peut passer son rôle à un adhérent actif de son association","SELECT true FROM (SELECT public.assign_referent('{MA2}')) s","t"],
    ["RA","Après le transfert : il redevient adhérent simple","SELECT role = 'member' FROM public.profiles WHERE id = '{RA}'","t"],

    ["SA","Super admin : est reconnu (contrôle)","SELECT public.is_federation_admin()","t"],
    ["SA","Super admin : voit tous les profils (contrôle)","SELECT count(*) >= 7 FROM public.profiles","t"],
    ["SA","Annuaire : voit toutes les associations","SELECT count(*) = 1 FROM public.profiles_public_view WHERE id = '{MB}'","t"],
    ["SA","Journal des actions : visible (contrôle)","SELECT count(*) >= 1 FROM public.admin_audit_log","t"],
    ["SA","Le transfert de rôle a bien été écrit au journal","SELECT count(*) >= 1 FROM public.admin_audit_log WHERE action = 'referent_appointed' AND target_id = '{MA2}'","t"],
    ["SA","Voit les demandes de suppression (contrôle)","SELECT count(*) = 1 FROM public.account_deletion_requests WHERE id = '{DRB}'","t"],
    ["SA","Peut modifier un profil","WITH u AS (UPDATE public.profiles SET full_name = 'ok' WHERE id = '{MB}' RETURNING 1) SELECT count(*) = 1 FROM u","t"],
    ["SA","Peut annuler une demande de suppression","SELECT public.cancel_deletion_request('{DRB}')","t"],
    ["SA","Ne peut pas écrire directement dans le journal","INSERT INTO public.admin_audit_log (action) VALUES ('role_changed')","x"],
    ["SA","Ne peut pas modifier le journal","WITH u AS (UPDATE public.admin_audit_log SET actor_label = 'x' RETURNING 1) SELECT count(*) = 0 FROM u","tz"],
    ["SA","Ne peut pas effacer le journal","WITH d AS (DELETE FROM public.admin_audit_log RETURNING 1) SELECT count(*) = 0 FROM d","tz"],
    ["SA","Voit un événement non publié (contrôle)","SELECT count(*) = 1 FROM public.events WHERE id = '{EVU}'","t"],
    ["SA","Voit une association non publiée (contrôle)","SELECT count(*) = 1 FROM public.associations WHERE id = '{AC}'","t"],
    ["SA","Voit les notifications programmées (contrôle)","SELECT count(*) >= 1 FROM public.scheduled_notifications WHERE id = '{SCH}'","t"],

    ["MB","Autre association : voit uniquement la sienne dans l'annuaire","SELECT count(*) = 0 FROM public.profiles_public_view WHERE association_id <> '{AB}'","t"],
    ["MB","Autre association : ne voit rien de l'association A dans l'annuaire","SELECT count(*) = 0 FROM public.profiles_public_view WHERE id IN ('{MA}','{MA2}','{RA}','{SA}')","t"],
    ["MB","Documents : voit les siens et ceux de la fédération, pas ceux de A","SELECT (SELECT count(*) FROM public.member_documents WHERE id IN ('{DOCB}','{DOCG}')) = 2 AND (SELECT count(*) FROM public.member_documents WHERE id = '{DOCA}') = 0","t"],
    ["MB","Annonces : voit celles de B, pas celles de A","SELECT (SELECT count(*) FROM public.announcements WHERE id = '{ANB}') = 1 AND (SELECT count(*) FROM public.announcements WHERE id = '{ANA}') = 0","t"],
    ["MB","Jeton de notification : voit le sien seulement","SELECT count(*) = 1 FROM public.push_tokens","t"],
    ["MB","Préférences de notification : voit les siennes seulement","SELECT count(*) = 1 FROM public.notification_preferences","t"],
    ["MB","« Ça m'intéresse » : voit les siens seulement","SELECT count(*) = 1 FROM public.event_interests","t"],
    ["MB","Suppression de compte : voit sa propre demande","SELECT count(*) = 1 FROM public.account_deletion_requests WHERE id = '{DRB}'","t"],

    ["EA","Adhérent expiré : n'est plus reconnu comme actif","SELECT NOT public.is_active_member()","t"],
    ["EA","Adhérent expiré : voit encore son profil (pour renouveler)","SELECT count(*) = 1 FROM public.profiles","t"],
    ["EA","Adhérent expiré : annuaire fermé","SELECT count(*) = 0 FROM public.profiles_public_view","t"],
    ["EA","Adhérent expiré : documents fermés","SELECT count(*) = 0 FROM public.member_documents","t"],
    ["EA","Adhérent expiré : annonces fermées","SELECT count(*) = 0 FROM public.announcements","t"],
    ["EA","Adhérent expiré : ne peut pas prolonger lui-même son adhésion","WITH u AS (UPDATE public.profiles SET valid_until = DATE '2999-12-31' WHERE id = '{EA}' RETURNING valid_until) SELECT count(*) = 1 AND bool_and(valid_until < DATE '2999-12-31') FROM u","t"],
    ["EA","Adhérent expiré : historique des notifications fermé","SELECT count(*) = 0 FROM public.notification_history","t"],
    ["EA","Adhérent expiré : liste des MIAgistes fermée","SELECT count(*) = 0 FROM public.miagistes","t"],
    ["EA","Adhérent expiré : événements réservés aux adhérents fermés","SELECT count(*) = 0 FROM public.events WHERE id = '{EVM}'","t"],
    ["EA","Adhérent expiré : ne peut pas marquer « Ça m'intéresse »","INSERT INTO public.event_interests (event_id, user_id) VALUES ('{EVP}', '{EA}')","x"],
    ["EA","Adhérent expiré : peut renouveler (son domaine est autorisé)","SELECT (public.ensure_my_profile()).valid_until >= current_date","t"],
    ["EA","Après le renouvellement : de nouveau actif","SELECT public.is_active_member()","t"],

    ["SU","Adhérent suspendu : n'est pas reconnu comme actif","SELECT NOT public.is_active_member()","t"],
    ["SU","Adhérent suspendu : annuaire fermé","SELECT count(*) = 0 FROM public.profiles_public_view","t"],
    ["SU","Adhérent suspendu : documents fermés","SELECT count(*) = 0 FROM public.member_documents","t"],
    ["SU","Adhérent suspendu : ne peut pas se réactiver lui-même","WITH u AS (UPDATE public.profiles SET is_suspended = false WHERE id = '{SU}' RETURNING is_suspended) SELECT count(*) = 1 AND bool_and(is_suspended) FROM u","t"],
    ["SU","Adhérent suspendu : le renouvellement ne le réactive pas","SELECT (public.ensure_my_profile()).is_suspended","t"],
    ["SU","Adhérent suspendu : toujours pas actif après renouvellement","SELECT NOT public.is_active_member()","t"]
  ]$json$;

  ukeys text[] := ARRAY['SA','RA','MA','MA2','EA','SU','MB'];
  uroles text[] := ARRAY['admin_national','admin_association','member','member','member','member','member'];
  ids jsonb := '{}'::jsonb;
  v_aa uuid; v_ab uuid; v_uid uuid; v_id uuid;
  v_cgu text;
  v_pos uuid; v_posoff uuid; v_event uuid; v_ac uuid;
  i int; n int;
  t_user text; t_desc text; t_query text; t_mode text;
  kv record;
  ok boolean; detail text;
  total int := 0; fails int := 0;
  bad text := ''; good text := '';
BEGIN
  -- ============================================================
  -- 1. Faux comptes et fausses données (tout est annulé à la fin)
  -- ============================================================
  SELECT version INTO v_cgu FROM public.legal_documents WHERE key = 'cgu';

  INSERT INTO public.associations (name, is_published, is_federated) VALUES ('ZZ-TEST A', true, true) RETURNING id INTO v_aa;
  INSERT INTO public.associations (name, is_published, is_federated) VALUES ('ZZ-TEST B', true, true) RETURNING id INTO v_ab;
  INSERT INTO public.allowed_domains (domain, asso_id, is_active) VALUES ('rls-a.test', v_aa, true);
  INSERT INTO public.allowed_domains (domain, asso_id, is_active) VALUES ('rls-b.test', v_ab, true);
  ids := ids || jsonb_build_object('AA', v_aa, 'AB', v_ab);

  FOR i IN 1 .. array_length(ukeys, 1) LOOP
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'rls-' || lower(ukeys[i]) || '@' || CASE WHEN ukeys[i] = 'MB' THEN 'rls-b.test' ELSE 'rls-a.test' END,
            now(), now());
    INSERT INTO public.profiles (id, email, full_name, association_id, role, valid_until, is_suspended, cgu_accepted_version)
    VALUES (v_uid,
            'rls-' || lower(ukeys[i]) || '@' || CASE WHEN ukeys[i] = 'MB' THEN 'rls-b.test' ELSE 'rls-a.test' END,
            'Test ' || ukeys[i],
            CASE WHEN ukeys[i] = 'MB' THEN v_ab ELSE v_aa END,
            uroles[i],
            CASE ukeys[i] WHEN 'SA' THEN DATE '2999-12-31' WHEN 'EA' THEN current_date - 1 ELSE current_date + 200 END,
            ukeys[i] = 'SU',
            v_cgu);
    ids := ids || jsonb_build_object(ukeys[i], v_uid);
  END LOOP;

  SELECT id INTO v_pos FROM public.member_positions WHERE is_active LIMIT 1;
  IF v_pos IS NULL THEN
    INSERT INTO public.member_positions (label, color, is_active) VALUES ('zz-test-actif', '#0A0B0C', true) RETURNING id INTO v_pos;
  END IF;
  INSERT INTO public.member_positions (label, color, is_active) VALUES ('zz-test-desactive', '#0A0B0D', false) RETURNING id INTO v_posoff;
  ids := ids || jsonb_build_object('POS', v_pos, 'POSOFF', v_posoff);

  INSERT INTO public.member_documents (asso_id, title, file_url) VALUES (v_aa, 'ZZ doc A', 'https://x.test') RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('DOCA', v_id);
  INSERT INTO public.member_documents (asso_id, title, file_url) VALUES (v_ab, 'ZZ doc B', 'https://x.test') RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('DOCB', v_id);
  INSERT INTO public.member_documents (asso_id, title, file_url) VALUES (NULL, 'ZZ doc fédération', 'https://x.test') RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('DOCG', v_id);

  INSERT INTO public.announcements (asso_id, title, body, is_published) VALUES (v_aa, 'ZZ annonce A', 'x', true) RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('ANA', v_id);
  INSERT INTO public.announcements (asso_id, title, body, is_published) VALUES (v_ab, 'ZZ annonce B', 'x', true) RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('ANB', v_id);

  INSERT INTO public.admin_audit_log (action) VALUES ('role_changed');
  INSERT INTO public.account_deletion_requests (user_id) VALUES ((ids->>'MB')::uuid) RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('DRB', v_id);
  INSERT INTO public.push_tokens (user_id, expo_push_token) VALUES ((ids->>'MB')::uuid, 'ExponentPushToken[rls-test-mb]');
  INSERT INTO public.notification_preferences (user_id) VALUES ((ids->>'MB')::uuid);
  INSERT INTO public.events (title, start_date, is_published) VALUES ('ZZ événement', now() + INTERVAL '1 day', true) RETURNING id INTO v_event;
  ids := ids || jsonb_build_object('EVP', v_event);
  INSERT INTO public.event_interests (event_id, user_id) VALUES (v_event, (ids->>'MB')::uuid);

  -- Contenus non publiés / réservés : ce que les visiteurs et adhérents ne doivent pas voir
  INSERT INTO public.associations (name, is_published) VALUES ('ZZ-TEST C (non publiée)', false) RETURNING id INTO v_ac;
  ids := ids || jsonb_build_object('AC', v_ac);
  INSERT INTO public.events (title, start_date, is_published) VALUES ('ZZ événement non publié', now() + INTERVAL '2 day', false) RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('EVU', v_id);
  INSERT INTO public.events (title, start_date, is_published, visibility) VALUES ('ZZ événement adhérents', now() + INTERVAL '3 day', true, 'members') RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('EVM', v_id);
  INSERT INTO public.news (title, is_published) VALUES ('ZZ actualité non publiée', false) RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('NEWU', v_id);
  INSERT INTO public.admin_news (title, description, is_published) VALUES ('ZZ actu admin non publiée', 'x', false) RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('ADMU', v_id);
  INSERT INTO public.featured_events (title, is_published) VALUES ('ZZ à la une non publié', false) RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('FEAU', v_id);
  INSERT INTO public.scheduled_notifications (title, body, send_at) VALUES ('ZZ programmée', 'x', now() + INTERVAL '5 day') RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('SCH', v_id);
  INSERT INTO public.notification_history (title, body) VALUES ('ZZ historique', 'x') RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('NH', v_id);
  INSERT INTO public.miagistes (full_name) VALUES ('ZZ miagiste') RETURNING id INTO v_id;
  ids := ids || jsonb_build_object('MIA', v_id);

  -- ============================================================
  -- 2. Les tests : chaque requête est exécutée avec l'identité du faux compte
  -- ============================================================
  n := jsonb_array_length(tests);
  FOR i IN 0 .. n - 1 LOOP
    t_user := tests->i->>0;
    t_desc := tests->i->>1;
    t_query := tests->i->>2;
    t_mode := tests->i->>3;

    FOR kv IN SELECT key, value FROM jsonb_each_text(ids) LOOP
      t_query := replace(t_query, '{' || kv.key || '}', kv.value);
    END LOOP;

    IF t_user = 'ANON' THEN
      EXECUTE 'SET LOCAL ROLE anon';
      PERFORM set_config('request.jwt.claims', '', true);
      PERFORM set_config('request.jwt.claim.sub', '', true);
    ELSE
      EXECUTE 'SET LOCAL ROLE authenticated';
      PERFORM set_config('request.jwt.claims',
        jsonb_build_object('sub', ids->>t_user, 'role', 'authenticated')::text, true);
      PERFORM set_config('request.jwt.claim.sub', ids->>t_user, true);
    END IF;

    ok := NULL;
    detail := '';
    BEGIN
      IF t_mode = 'x' THEN
        EXECUTE t_query;
        ok := false;
        detail := 'aurait dû être REFUSÉ';
      ELSE
        EXECUTE t_query INTO ok;
        IF ok IS NULL THEN
          ok := false;
          detail := 'aucun résultat';
        ELSIF NOT ok THEN
          detail := 'résultat inattendu';
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Un refus n'est valable que s'il s'agit d'un vrai refus d'accès (droit manquant, règle de sécurité,
      -- fonction qui refuse). Toute autre erreur (table absente, colonne inconnue...) fausserait le test : échec.
      IF t_mode IN ('x', 'tz') AND SQLSTATE IN ('42501', 'P0001', '22023', '23514') THEN
        ok := true;
        detail := 'refusé (' || SQLSTATE || ')';
      ELSE
        ok := false;
        detail := 'erreur inattendue [' || SQLSTATE || '] : ' || left(SQLERRM, 110);
      END IF;
    END;

    EXECUTE 'RESET ROLE';

    total := total + 1;
    IF ok THEN
      good := good || E'\n  ✔ [' || t_user || '] ' || t_desc;
    ELSE
      fails := fails + 1;
      bad := bad || E'\n  ✘ [' || t_user || '] ' || t_desc || ' — ' || detail;
    END IF;
  END LOOP;

  -- ============================================================
  -- 3. Rapport : l'« erreur » finale annule TOUT ce qui a été créé ci-dessus
  -- ============================================================
  RAISE EXCEPTION E'RAPPORT DES TESTS DE DROITS — % tests, % échec(s). (Rien n''est conservé : cette erreur est normale.)\n\nÉCHECS :%\n\nRÉUSSIS :%',
    total, fails, CASE WHEN fails = 0 THEN E'\n  aucun' ELSE bad END, good;
END
$rls$;
