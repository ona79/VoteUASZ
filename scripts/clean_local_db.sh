#!/usr/bin/env bash
# Script réservé au développement local : nettoie la base PostgreSQL du conteneur Docker voteuasz-postgres
# en conservant le compte SUPER_ADMIN.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/clean_local_db.sql"

if ! docker ps --format '{{.Names}}' | grep -q '^voteuasz-postgres$'; then
  echo "Erreur : le conteneur local voteuasz-postgres n'est pas démarré." >&2
  exit 1
fi

echo "Nettoyage de la base locale voteuasz_db..."
docker exec -i voteuasz-postgres psql -U "${POSTGRES_USER:-uasz_admin}" -d "${POSTGRES_DB:-voteuasz_db}" < "$SQL_FILE"

echo "État après nettoyage :"
docker exec voteuasz-postgres psql -U "${POSTGRES_USER:-uasz_admin}" -d "${POSTGRES_DB:-voteuasz_db}" -c "
SELECT role, count(*) FROM users GROUP BY role
UNION ALL
SELECT 'elections', count(*) FROM elections;
"
