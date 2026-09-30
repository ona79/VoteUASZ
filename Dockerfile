# Multi-stage Dockerfile pour la plateforme VoteUASZ

# === STAGE 1 : Compilation Frontend Angular ===
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --quiet
COPY frontend/ ./
RUN npm run build -- --configuration=production

# === STAGE 2 : Compilation Backend Spring Boot ===
FROM maven:3.9-eclipse-temurin-21-alpine AS build-backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B
COPY backend/src ./src
RUN mvn package -DskipTests

# === STAGE 3 : Image de Production Finale ===
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Variable d'environnement pour la production
ENV SPRING_PROFILES_ACTIVE=prod
ENV PORT=8080
ENV SERVER_PORT=${PORT}

COPY --from=build-backend /app/backend/target/*.jar app.jar
COPY --from=build-frontend /app/frontend/dist/voteuasz-frontend/browser ./static

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-${SERVER_PORT:-8080}} -jar app.jar"]

