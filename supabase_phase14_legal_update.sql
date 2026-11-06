-- MIAGE Connection — Phase 14 : mise à jour des textes légaux (audit final).
-- À RELIRE ET VALIDER par l'association avant exécution : ce sont ses textes juridiques.
-- Ré-exécutable. Corrections apportées :
--   * Politique de confidentialité : ajout du responsable de traitement, des bases légales, de la
--     VISIBILITÉ DE L'ANNUAIRE pour les autres adhérents (absente jusque-là), des « Ça m'intéresse »,
--     des jeux (scores locaux uniquement), du droit de réclamation auprès de la CNIL.
--   * CGU : ajout des jeux, de la propriété intellectuelle, de la suppression de compte, du droit applicable.
--   * Mentions légales : Microsoft retiré (connexion Google uniquement pour l'instant).
--
-- ⚠ Passer les CGU en 1.1 redemande leur acceptation à TOUS les adhérents à leur prochaine connexion
--   (c'est le mécanisme prévu). Pour ne pas le faire, garde `version = '1.0'` dans le bloc CGU.
--
-- Durée de conservation : 3 ans après la fin de la dernière adhésion (durée usuelle pour la gestion d'adhérents
-- d'une association ; le RGPD n'impose pas de chiffre précis). Elle est APPLIQUÉE automatiquement par la
-- tâche mensuelle de la phase 19 : ne pas changer le chiffre du texte sans changer la phase 19.
--
-- Non couvert ici, à décider par l'association (je ne peux pas l'inventer) :
--   * la région d'hébergement Supabase et les transferts hors UE (Google, Expo/Firebase) ;
--   * un éventuel délégué à la protection des données.

UPDATE public.legal_documents
SET version = '1.1',
    updated_at = now(),
    content = $txt$Cette politique explique quelles données sont collectées via l'application MIAGE Connection, pourquoi, et qui peut les voir.

Responsable du traitement

MIAGE Connection, association loi 1901 (coordonnées dans les mentions légales). Contact : bureau@miage-connection.fr.

Données collectées

- Ton nom et ton adresse email (fournis par Google lors de la connexion)
- Ton association d'appartenance et la date de fin de ta période d'adhésion (déduites de ton adresse email)
- Les informations de profil que tu renseignes toi-même (poste dans l'association, année de promotion, email de contact)
- Un identifiant technique de notification (token push) si tu actives les notifications, et tes préférences de notification
- Les événements que tu marques « Ça m'intéresse » (les organisateurs ne voient que des totaux, jamais qui a répondu)
- L'acceptation des CGU (version et date)

Pourquoi ces données sont collectées

Elles permettent de te rattacher à ton association, de te donner accès à l'espace adhérent, d'organiser les événements et de t'envoyer des notifications si tu le souhaites. Aucune donnée n'est vendue ni partagée à des fins commerciales.

Bases légales : l'exécution des CGU (accès à l'espace adhérent), l'intérêt légitime de l'association à gérer sa fédération, et ton consentement pour les notifications, que tu peux retirer à tout moment dans les réglages.

Qui voit quoi

- Toi-même, dans l'app.
- Les autres adhérents actifs de ton association : dans l'annuaire, ils voient ton nom, ton poste, ton année de promotion et l'email de contact que tu as choisi de renseigner. Ton adresse de connexion n'est jamais affichée.
- L'admin de l'asso de ton association et l'administration nationale de MIAGE Connection, dans le cadre de la gestion de la fédération.
- Les sous-traitants techniques listés dans les mentions légales (Supabase, Google, Expo/Firebase), uniquement pour faire fonctionner l'app.

Les événements publiés en accès public et les informations des associations (nom, ville, contact) sont visibles par tout le monde, sans compte.

Jeux

Les jeux (Memory, Snake, Taquin) fonctionnent sans compte. Tes scores et records sont enregistrés uniquement sur ton téléphone et ne sont envoyés nulle part.

Combien de temps tes données sont conservées

Tant que ton compte est actif, puis au maximum 3 ans après la fin de ta dernière période d'adhésion si tu ne la renouvelles pas : ton compte et tes données sont alors supprimés automatiquement. Tu peux aussi demander la suppression de ton compte à tout moment depuis l'application ; elle est traitée sous un mois.

Le journal des actions d'administration (par exemple la suspension d'un compte ou la nomination d'un admin d'asso) est conservé 1 an, et l'historique technique d'envoi des notifications 90 jours. Le journal est anonymisé dès que le compte concerné est supprimé.

Tes droits

Conformément au RGPD, tu peux à tout moment consulter, exporter ou demander la suppression de tes données depuis la section « Mes données » de l'application, ou en écrivant à bureau@miage-connection.fr. Tu peux aussi demander la rectification de tes données ou t'opposer à leur traitement. Si tu estimes que tes droits ne sont pas respectés, tu peux introduire une réclamation auprès de la CNIL (www.cnil.fr).$txt$
WHERE key = 'confidentialite';

UPDATE public.legal_documents
SET version = '1.1',
    updated_at = now(),
    content = $txt$En utilisant l'application MIAGE Connection, tu acceptes les présentes conditions.

Objet

L'application MIAGE Connection est réservée aux étudiant·e·s et diplômé·e·s des associations fédérées MIAGE Connection pour son espace adhérent (annuaire, documents, notifications), sous réserve de disposer d'une adresse email rattachée à une association fédérée active. Les informations publiques (actualités, événements, associations) et les jeux sont accessibles à tous, sans compte.

Compte et accès

La connexion se fait exclusivement via Google, avec une adresse email professionnelle/étudiante reconnue par une association fédérée. MIAGE Connection ne gère aucun mot de passe. L'accès à l'espace adhérent est automatiquement suspendu si ton adresse n'est plus rattachée à une association active, ou à l'expiration de ta période d'adhésion.

Comportement attendu

Tu t'engages à ne pas usurper l'identité d'un tiers, à ne pas diffuser de contenu illicite, injurieux ou portant atteinte aux droits d'autrui, et à utiliser l'annuaire des adhérents uniquement dans un cadre associatif et respectueux.

Jeux et contenus

Les jeux proposés sont gratuits et sans enjeu financier ; les scores restent sur ton téléphone. Les logos et marques affichés appartiennent à leurs titulaires respectifs et ne peuvent être réutilisés sans leur accord.

Données personnelles

Le traitement de tes données personnelles est décrit dans la politique de confidentialité, accessible depuis l'application.

Suppression du compte

Tu peux demander la suppression de ton compte à tout moment depuis l'application. MIAGE Connection peut suspendre un accès en cas de non-respect des présentes conditions.

Responsabilité

MIAGE Connection s'efforce d'assurer la disponibilité et l'exactitude des informations diffusées, sans garantie de continuité de service. MIAGE Connection ne saurait être tenue responsable d'un usage détourné de l'application par un tiers.

Modification des CGU

Ces conditions peuvent être mises à jour. En cas de changement substantiel, une nouvelle acceptation te sera demandée lors de ta prochaine connexion.

Droit applicable

Les présentes conditions sont soumises au droit français.

Contact : bureau@miage-connection.fr$txt$
WHERE key = 'cgu';

UPDATE public.legal_documents
SET version = '1.1',
    updated_at = now(),
    content = replace(content, 'Connexion : Google et Microsoft', 'Connexion : Google')
WHERE key = 'mentions_legales';
