#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=================================================="
echo "    Démarrage de l'environnement VoteUASZ"
echo "=================================================="

# Charger les variables depuis .env si présent
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 1. Vérifier si Docker est allumé, sinon le lancer
if ! docker ps >/dev/null 2>&1; then
  echo "🐳 Docker Desktop n'est pas démarré. Lancement en cours..."
  open -a Docker
  while ! docker ps >/dev/null 2>&1; do
    sleep 2
  done
  echo "✅ Docker est prêt."
fi

# 2. Démarrer les services conteneurisés nécessaires (postgres + mailhog)
echo "🐘 Démarrage de PostgreSQL (5540) et Mailhog (8025)..."
docker compose up -d postgres mailhog

# 3. Libérer le port 8080 s'il est déjà occupé par un ancien processus
EXISTING_PID=$(lsof -ti :8080)
if [ -n "$EXISTING_PID" ]; then
  echo "⚠️  Le port 8080 était déjà utilisé (PID: $EXISTING_PID). Libération du port..."
  kill -9 $EXISTING_PID 2>/dev/null
  sleep 1
fi

# 4. Configurer Java 21 (requis pour le backend)
if [ -z "$JAVA_HOME" ] || [[ "$("$JAVA_HOME/bin/java" -version 2>&1)" != *"21."* ]]; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || echo "/opt/homebrew/Cellar/openjdk@21/21.0.12.1/libexec/openjdk.jdk/Contents/Home")"
fi
echo "☕ Utilisation de Java : $("$JAVA_HOME/bin/java" -version 2>&1 | head -n 1)"

# 5. Configurer et lancer Spring Boot
cd "$PROJECT_DIR/backend"
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5540/${POSTGRES_DB:-voteuasz_db}"
export SPRING_DATASOURCE_USERNAME="${POSTGRES_USER:-uasz_admin}"
export SPRING_DATASOURCE_PASSWORD="${POSTGRES_PASSWORD:-votre_mot_de_passe_postgres_securise_ici}"
export JWT_SECRET="${JWT_SECRET:-x9obszleDZpUrUHnesE8CHp9GItX9jrBGnS1nGN7awc=}"
export CRYPTO_SECRET="${CRYPTO_SECRET:-votre_cle_secrete_aes_256_bits}"
export PORT=8080
export SERVER_PORT=8080

echo "🚀 Lancement du Backend VoteUASZ sur http://localhost:8080 ..."
mvn spring-boot:run


