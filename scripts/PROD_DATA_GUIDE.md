# Guide de migration des données en PRODUCTION (Phase 7)

> **IMPORTANT :** Ce guide n'a PAS été exécuté. Ne l'exécutez qu'après validation explicite (« go production »).

## 1. Sauvegarde préalable de la base de production (Render PostgreSQL)
Récupérez l'URL externe PostgreSQL depuis le dashboard Render (`voteuasz-db` -> *External Database URL*), puis lancez :
```bash
pg_dump "$PROD_DATABASE_URL" -Fc -f "backups/voteuasz_prod_backup_$(date +%Y%m%d_%H%M%S).dump"
```

## 2. Nettoyage des données de test (en conservant le SUPER_ADMIN)
```bash
psql "$PROD_DATABASE_URL" -f scripts/clean_local_db.sql
```
*(Ce script supprime `campaign_posts`, `candidatures`, `complaints`, `ballots`, `voter_audit_logs`, `vote_otps`, `vote_tokens`, `refresh_tokens`, `password_reset_tokens`, `elections`, et `users WHERE role <> 'SUPER_ADMIN'`.)*

## 3. Import des comptes via l'interface Admin (ou API)
1. Connectez-vous sur `https://vote-uasz-frontend.vercel.app/login` avec le compte `SUPER_ADMIN` de production.
2. Dans `/admin` -> **Import CSV**, importez le fichier CSV officiel des électeurs, candidats et membres de commission (en vérifiant que `DEFAULT_ELECTEUR_PASSWORD` et `DEFAULT_CANDIDAT_PASSWORD` sont bien configurés sur Render).

## 4. Création des scrutins et vérification
1. Créez les scrutins dans `/admin` et faites avancer leur statut via les boutons d'état (machine à états).
2. Vérifiez les candidatures dans `/commission`, les publications dans `/candidat`, et l'audit SHA-256 dans `/admin`.
