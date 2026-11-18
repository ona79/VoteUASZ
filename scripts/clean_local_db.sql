-- Script de nettoyage de la base LOCALE uniquement (développement / démo).
-- Ne JAMAIS exécuter sur une base de production sans sauvegarde et validation explicite.
-- Supprime toutes les élections, données liées et comptes non-SUPER_ADMIN.

BEGIN;

-- Tables liées aux scrutins et votes
DELETE FROM campaign_posts;
DELETE FROM candidatures;
DELETE FROM complaints;
DELETE FROM ballots;
DELETE FROM voter_audit_logs;
DELETE FROM vote_otps;
DELETE FROM vote_tokens;

-- Tables de tokens d'authentification (si présentes)
DO $$
BEGIN
    IF to_regclass('public.refresh_tokens') IS NOT NULL THEN
        EXECUTE 'DELETE FROM refresh_tokens';
    END IF;
    IF to_regclass('public.password_reset_tokens') IS NOT NULL THEN
        EXECUTE 'DELETE FROM password_reset_tokens';
    END IF;
END $$;

-- Scrutins et comptes de test (conserve le SUPER_ADMIN)
DELETE FROM elections;
DELETE FROM users WHERE role <> 'SUPER_ADMIN';

COMMIT;
