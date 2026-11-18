-- ============================================================================
-- Script ponctuel de migration : Changement de mot de passe forcé
-- ============================================================================
-- ORDRE D'EXÉCUTION EN PRODUCTION (Render) :
--   1. Déployer d'abord le nouveau backend (Spring Boot + Hibernate ddl-auto: update)
--      afin que la colonne `must_change_password` (BOOLEAN NOT NULL DEFAULT false)
--      soit créée sur la table `users`.
--   2. Tester le flux sur un compte neuf importé par CSV (must_change_password = true).
--   3. Exécuter ensuite l'UPDATE ci-dessous sur la base PostgreSQL de production.
-- ============================================================================

-- 1. Mise à jour idempotente pour les comptes ELECTEUR et CANDIDAT existants
UPDATE users
SET must_change_password = true
WHERE role IN ('ELECTEUR', 'CANDIDAT')
  AND must_change_password = false;

-- 2. Requête de vérification (comptage par rôle et état de must_change_password)
SELECT role, must_change_password, COUNT(*) AS total
FROM users
GROUP BY role, must_change_password
ORDER BY role, must_change_password;

-- 3. Requête de retour arrière (rollback) si nécessaire
-- UPDATE users
-- SET must_change_password = false
-- WHERE role IN ('ELECTEUR', 'CANDIDAT');
