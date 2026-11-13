<div align="center">

<img src="./frontend/src/assets/logo_vote_uasz.webp" alt="Logo VoteUASZ" width="110" />

# VoteUASZ — Plateforme d'Élections Universitaires

**Système de vote électronique sécurisé, chiffré de bout en bout (AES-256) et mobile-first, développé pour l'Université Assane Seck de Ziguinchor (UASZ).**

[![VoteUASZ CI](https://github.com/ona79/VoteUASZ/actions/workflows/ci.yml/badge.svg)](https://github.com/ona79/VoteUASZ/actions/workflows/ci.yml)
[![Frontend Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vote-uasz-frontend.vercel.app)
[![Backend Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=black)](https://voteuasz-backend-r5cn.onrender.com/api/v1/elections)

![Java 21](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?logo=springboot&logoColor=white)
![Angular 17](https://img.shields.io/badge/Angular-17-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker&logoColor=white)

<br/>

**[🌐 Accéder à la plateforme](https://vote-uasz-frontend.vercel.app)** · **[⚡ API Backend](https://voteuasz-backend-r5cn.onrender.com/api/v1/elections)** · **[📘 Spécification OpenAPI](./docs/openapi.yaml)**

</div>

---

## Table des Matières

- [À Propos du Projet](#à-propos-du-projet)
- [Fonctionnalités](#fonctionnalités)
- [Architecture Technique](#architecture-technique)
- [Structure du Projet](#structure-du-projet)
- [Démarrage Rapide](#démarrage-rapide)
- [Comptes de Démonstration](#comptes-de-démonstration)
- [Design System](#design-system)
- [Sécurité](#sécurité)
- [Tests](#tests)
- [Déploiement Cloud](#déploiement-cloud)
- [Structure des Branches Git](#structure-des-branches-git)
- [Documentation](#documentation)

---

## À Propos du Projet

**VoteUASZ** est une application web de vote électronique sécurisée développée dans le cadre du projet académique de Semestre 6 à l'**Université Assane Seck de Ziguinchor (UASZ)**.

Elle permet à l'université d'organiser toutes ses élections internes (Délégués de classe, Directeurs d'UFR, Vice-Recteur) dans un environnement numérique sécurisé, transparent et vérifiable, accessible depuis n'importe quel appareil.

> **L'anonymat du suffrage est garanti par dissociation cryptographique totale** entre l'identité de l'électeur et le contenu de son bulletin (chiffrement AES-256).

---

## Fonctionnalités

### Par Rôle Utilisateur

| Rôle | Fonctionnalités |
|---|---|
| **Super-Admin** | Import CSV des comptes, création d'élections, supervision globale, transitions d'états, audit cryptographique (UC5), validation des candidatures (UC7) |
| **Commission Électorale** | Validation / rejet des candidatures, dépouillement, génération de PV officiel PDF, traitement des réclamations post-électorales |
| **Candidat** | Dépôt de dossier (photo, programme PDF, CV — nom récupéré automatiquement depuis le compte authentifié), publication de campagne avec vidéo YouTube / Vimeo, soumission de réclamations |
| **Electeur** | Consultation des élections éligibles, vote OTP sécurisé, résultats en temps réel, soumission de réclamations post-électorales |

### Fonctionnalités Clés

- **Authentification pré-provisionnée** — Aucune inscription libre ; les comptes sont importés via CSV par l'administrateur
- **Eligibilité dynamique** — Restriction automatique par UFR, Filière et Niveau selon le type d'élection
- **Machine à états électorale** — Workflow strict : `CONFIGURATION → CAMPAGNE → VOTE_OUVERT → DEPOUILLEMENT → PUBLICATION → CLOTURE`
- **Vote OTP en 3 étapes** — Code email → VoteToken unique → Bulletin chiffré AES-256
- **Résultats live WebSocket** — Diffusion STOMP automatique pendant le dépouillement
- **Procès-Verbal PDF** — Génération automatique de documents officiels (OpenPDF), téléchargement authentifié via JWT
- **Audit cryptographique (UC5)** — Journal d'émargement anonymisé + empreintes SHA-256 des bulletins, exportable en CSV
- **Réclamations post-électorales** — Soumission par les électeurs et candidats, traitement par la commission
- **Notifications in-app** — Système de toasts et modales remplaçant les `alert()` natifs

---

## Architecture Technique

### Stack

| Couche | Technologies |
|---|---|
| **Backend** | Java 21 · Spring Boot 3 · Spring Security (JWT) · Spring Data JPA · WebSocket STOMP · OpenPDF |
| **Frontend** | Angular 17 Standalone · RxJS · TailwindCSS · Lucide Angular (SVG) · Chart.js · STOMP.js |
| **Base de Données** | PostgreSQL 16 · H2 (tests unitaires) |
| **Infrastructure** | Docker · Docker Compose · Mailhog (SMTP local) |

### Diagramme d'Architecture

```
┌──────────────────────────────────────────┐
│           Navigateur / Mobile            │
│     Angular 17 SPA  (port 4200)          │
│  Login · Dashboard · Vote · Résultats   │
└────────────────┬─────────────────────────┘
                 │  HTTP/REST + WebSocket (STOMP)
┌────────────────▼─────────────────────────┐
│       Spring Boot API  (port 8080)       │
│  JWT · Machine à États · AES-256 · STOMP │
└──────────┬──────────────────┬────────────┘
           │                  │
┌──────────▼───────┐ ┌────────▼──────────────┐
│  PostgreSQL 16   │ │  Mailhog SMTP (8025)  │
│  port interne 5432│ │  Visualisation OTP    │
│  exposé → 5540   │ │                       │
└──────────────────┘ └───────────────────────┘
```

---

## Structure du Projet

```
VoteUASZ/
│
├── backend/                            # Application Spring Boot
│   └── src/main/java/
│       ├── config/                     # Security, JWT, WebSocket, CORS
│       ├── controller/                 # REST Controllers
│       ├── service/                    # Logique métier (Eligibilité, Crypto, Import...)
│       ├── entity/                     # Entités JPA (Election, User, Ballot, VoteToken...)
│       └── repository/                 # Spring Data JPA Repositories
│
├── frontend/                           # Application Angular 17
│   └── src/app/
│       ├── components/
│       │   ├── login/                  # Page de connexion responsive
│       │   ├── navbar/                 # Navigation (icônes Lucide SVG)
│       │   ├── admin-dashboard/        # Super-Admin (audit, candidatures, élections)
│       │   ├── commission-dashboard/   # Commission Electorale (validations, réclamations)
│       │   ├── candidate-dashboard/    # Espace Candidat
│       │   ├── election-list/          # Liste des élections avec filtres
│       │   ├── election-detail/        # Détail + Workflow vote OTP
│       │   ├── shared/election-filter/ # Composant filtre réutilisable
│       │   └── notification-container/ # Toasts + Modales
│       ├── services/                   # auth · election · vote · websocket · notification · complaint · candidacy
│       ├── guards/                     # authGuard · roleGuard
│       ├── interceptors/               # jwt.interceptor (injection JWT + gestion session expirée)
│       ├── environments/               # Configuration dev / prod (apiUrl, wsUrl)
│       └── models/                     # Interfaces TypeScript
│
├── docs/
│   ├── UML/                            # Diagrammes de conception (Mermaid)
│   └── openapi.yaml                    # Spécification REST API (OpenAPI 3.0)
│
├── .env.example                        # Modèle des variables d'environnement (versionné)
├── docker-compose.yml                  # PostgreSQL + Mailhog + Backend
├── Dockerfile                          # Multi-stage build (Angular + Maven → JRE 21 Alpine)
├── render.yaml                         # Blueprint Render (Backend Docker + PostgreSQL)
└── vercel.json                         # Configuration Vercel (SPA Angular + proxy /api)
```

---

## Démarrage Rapide

### Prérequis

| Outil | Version minimale |
|---|---|
| Docker & Docker Compose | Dernière version stable |
| Java JDK *(dev uniquement)* | 21+ |
| Node.js & npm *(dev uniquement)* | 20+ / 10+ |
| Maven *(dev uniquement)* | 3.9+ |

---

### Option A — Docker Compose (Recommandé)

Lance l'application complète en une seule commande :

```bash
git clone https://github.com/ona79/VoteUASZ.git
cd VoteUASZ
cp .env.example .env              # Crée votre fichier d'environnement local
docker compose up --build
```

| Service | URL |
|---|---|
| Application Web (API + Frontend) | http://localhost:8080 |
| Mailhog — Visualisation des OTP | http://localhost:8025 |
| PostgreSQL (connexion externe — DBeaver, pgAdmin...) | `localhost:5540` |

> Ouvrez http://localhost:8025 pendant un vote pour voir les codes OTP arriver en temps réel.

---

### Option B — Mode Développement (Frontend + Backend séparés)

<details>
<summary>Voir les instructions détaillées</summary>

**Etape 1 — Lancer uniquement l'infrastructure**
```bash
docker compose up postgres mailhog
```

**Etape 2 — Backend Spring Boot**
```bash
cd backend
mvn spring-boot:run
# API disponible sur http://localhost:8080/api
```

**Etape 3 — Frontend Angular**
```bash
cd frontend
npm install
npm start
# Application disponible sur http://localhost:4200
```

</details>

---

## Comptes de Démonstration

> Ces comptes sont initialisés automatiquement au premier démarrage via `DataInitializer`.

| Rôle | Identifiant | Mot de Passe |
|---|---|---|
| Super-Admin Electoral | `ADMIN001` | `AdminSecure2026!` |
| Commission Electorale | `COMM001` | `CommSecure2026!` |
| Candidat | `CAND202301` | `CandSecure2026!` |
| Electeur (Etudiant L3) | `20230001` | `ElecteurSecure2026!` |

---

## Design System

L'interface suit une charte graphique **mobile-first** cohérente sur tous les écrans.

### Palette & Typographie

| Elément | Valeur |
|---|---|
| Couleur principale | `#047857` (Vert UASZ emerald-700) |
| Couleur secondaire | `#065f46` (vert foncé, dégradé) |
| Liens | `#1d4ed8` (bleu) |
| Typographie | Inter (Google Fonts — 300 à 800) |
| Border-radius inputs/boutons | `12px` (`rounded-xl`) |
| Border-radius headers hero | `28px` bas uniquement |

### Icônes

Toutes les icônes utilisent **Lucide Angular** (`lucide-angular@0.390.0`) — SVG monochromes, traits fins, rendu identique sur Windows / macOS / Linux. Aucun emoji natif n'est utilisé dans l'interface.

### Système de Notifications

<details>
<summary>Voir les exemples d'utilisation</summary>

```typescript
// Toasts (disparaissent automatiquement)
this.notificationService.showSuccess('Import réussi — 42 électeurs ajoutés.');
this.notificationService.showError('Connexion échouée', 'Erreur réseau');
this.notificationService.showWarning('La session expire dans 5 minutes.');
this.notificationService.showInfo('Les résultats ont été mis à jour.');

// Modale Prompt (retourne Promise<string | null>)
const raison = await this.notificationService.prompt(
  'Rejet de candidature',
  'Veuillez indiquer le motif de rejet :',
  'Ex : Dossier incomplet...',
  'Rejeter'
);
if (raison === null) return; // Annulation propre (Echap, clic extérieur, Annuler)
```

**Positionnement responsive :**
- Mobile : toasts en haut de l'écran (évite la Bottom Tab Bar)
- Desktop : toasts en bas à droite

</details>

---

## Sécurité

| Mécanisme | Implémentation |
|---|---|
| **Authentification** | JWT signé HS256, expiration configurable |
| **Chiffrement des bulletins** | AES-256-GCM avec dérivation de clé PBKDF2WithHmacSHA256 (`CRYPTO_SECRET` >= 32 caractères) |
| **Hachage des OTP** | BCrypt (code aléatoire 6 chiffres valable 5 min) — acheminement par **e-mail uniquement** (`SMS` = extension future, non implémenté) |
| **Anti-double vote** | `VoteToken` à usage unique lié à l'élection + contrainte unique `(user_id, election_id)` sur `voter_audit_logs` |
| **Anonymat du suffrage** | `Ballot` identifié par UUID aléatoire sans `user_id` ni `createdAt` ; `VoterAuditLog.votedAt` arrondi à l'heure et `ipHash` calculé sur l'IP réelle salée (`AUDIT_IP_SALT`). *Note d'architecture :* `Ballot.candidatureId` est conservé en colonne pour permettre le dépouillement SQL `GROUP BY` en temps réel sans déchiffrer tous les bulletins à chaque vote, la dissociation totale étant garantie par l'absence de lien direct ou temporel avec `VoterAuditLog`. |
| **Rate limiting IP** | 20 requêtes/minute/IP sur `/api/v1/auth/login`, `/api/v1/vote/request-otp`, `/api/v1/vote/verify-otp` (HTTP 429) |
| **Contrôle d'accès routes** | `authGuard` (authentification) + `roleGuard(roles[])` (autorisation) |
| **Injection JWT automatique** | `jwt.interceptor` — injection du Bearer token sur toutes les requêtes HTTP |
| **Téléchargements authentifiés** | Export CSV et PDF via `HttpClient` avec token JWT (pas de `window.open`) |
| **Validité OTP** | 5 minutes, usage unique, invalidé après consommation |
| **Anti-brute-force login** | Verrouillage du compte après 5 tentatives échouées consécutives (5 minutes) |
| **Anti-brute-force OTP** | Invalidation du token après 5 tentatives de code incorrectes |
| **Quota et cooldown OTP** | Minimum 60 secondes entre deux demandes de code, maximum 5 demandes par heure |
| **Révocation de session** | Un compte désactivé perd immédiatement l'accès, même avec un token JWT encore valide |
| **Restriction CORS** | Liste fermée d'origines autorisées, aucune politique wildcard (`*`) |
| **Mot de passe électeurs CSV** | Configurable via `DEFAULT_ELECTEUR_PASSWORD` (variable d'environnement) — jamais écrit en clair dans le code |
| **Traçabilité comptes à privilèges** | Création de comptes SUPER_ADMIN et COMMISSION_ELECTORALE via CSV tracée en logs WARN avec matricule et opérateur |

---

## Tests

### Backend — JUnit 5 / Mockito / SpringBootTest

```bash
cd backend
mvn test
```

**Résultats actuels : 104 tests backend — 0 échec — 0 erreur** *(+ 7 tests ajoutés sur les lots A à D, couverture JaCoCo > 74 %)*

| Suite de Tests | Nombre de tests | Ce qui est testé |
|---|---|---|
| `EligibilityServiceTest` | 13 | Critères dynamiques d'éligibilité (UFR, Filière, Niveau) |
| `ElectionStateMachineTest` | 14 | Respect strict des transitions d'états électoraux |
| `CryptoServiceTest` | 7 | Intégrité du chiffrement AES-256 et du hachage SHA-256 |
| `UserImportServiceTest` | 5 | Import CSV, gestion des doublons et erreurs de format |
| `AntiDoubleVoteTest` | 4 | Unicité du suffrage et sécurité temporelle des OTP |
| `AuthControllerTest` | 6 | Authentification, brute-force, compte désactivé |
| `VoteControllerTest` | 8 | Flux complet OTP, cooldown, quota, double vote |
| `ComplaintControllerTest` | 8 | Soumission et traitement des réclamations par rôle |
| `CampaignControllerTest` | 2 | Publication de campagne candidat |
| `ElectionControllerTest` | 3 | Création et gestion d'élections |
| `OtpCooldownAndQuotaTest` | 3 | Cooldown 60s et quota horaire des demandes OTP |
| `OtpResendLoopTest` | *(intégration)* | Boucle de renvoi OTP avec Spring Boot Test |
| `UserDeactivationIntegrationTest` | 1 | Révocation de session sur compte désactivé |
| `SuperAdminCsvImportTest` | 3 | Import CSV de comptes à privilèges avec traçabilité |
| `FullElectionWorkflowIntegrationTest` | *(intégration)* | Test bout-en-bout `@SpringBootTest` |

### Frontend — Angular (Karma / Jasmine)

```bash
cd frontend
npm test
```

---

## Déploiement Cloud

> **URL de démo (Production) :**
> - **Frontend (Vercel)** : https://vote-uasz-frontend.vercel.app
> - **Backend API (Render)** : https://voteuasz-backend-r5cn.onrender.com

Les fichiers d'infrastructure fournis à la racine permettent un déploiement gratuit en quelques minutes :
- [`render.yaml`](./render.yaml) — Blueprint Render (Web Service Docker + PostgreSQL managé gratuit)
- [`vercel.json`](./vercel.json) — Configuration Vercel pour la SPA Angular (rewrites API & routing HTML5)
- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — Pipeline CI GitHub Actions (`mvn verify` JDK 21 + `ng build --configuration production`)

### Backend & PostgreSQL — Render (Blueprint)

<details>
<summary>Voir le guide de déploiement</summary>

1. Connectez ce dépôt sur [Render](https://render.com) via **New → Blueprint** (`render.yaml` est détecté automatiquement)
2. Render provisionne `voteuasz-db` (PostgreSQL) et `voteuasz-backend` (Docker)
3. Renseignez les variables marquées `sync: false` dans l'interface Render :

| Variable | Description |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` (défini dans `render.yaml`) |
| `SPRING_DATASOURCE_HOST` / `PORT` / `DB` | Injectés automatiquement depuis `voteuasz-db` (`application-prod.yml` construit l'URL `jdbc:postgresql://...`) |
| `SPRING_DATASOURCE_USERNAME` | Injecté automatiquement depuis `voteuasz-db` |
| `SPRING_DATASOURCE_PASSWORD` | Injecté automatiquement depuis `voteuasz-db` |
| `JWT_SECRET` | Généré automatiquement par Render (clé >= 256 bits) |
| `CRYPTO_SECRET` | Généré automatiquement par Render (>= 32 caractères, chiffrement AES-256 des bulletins) |
| `AUDIT_IP_SALT` | Généré automatiquement par Render (sel pour le hachage des IP dans le journal d'émargement) |
| `DEFAULT_ELECTEUR_PASSWORD` | `sync: false` — Mot de passe attribué aux électeurs importés via CSV (12+ car., fort) |
| `DEFAULT_CANDIDAT_PASSWORD` | `sync: false` — Mot de passe attribué aux candidats importés via CSV (12+ car., fort) |
| `ALLOWED_ORIGINS` | `sync: false` — URL Vercel du frontend (ex : `https://vote-uasz-frontend.vercel.app`) |
| `SPRING_MAIL_HOST` | `sync: false` — Hôte SMTP de production (ex : `smtp-relay.brevo.com` ou `smtp.gmail.com`) |
| `SPRING_MAIL_PORT` | `587` |
| `SPRING_MAIL_USERNAME` | `sync: false` — Adresse email d'envoi / compte SMTP |
| `SPRING_MAIL_PASSWORD` | `sync: false` — Mot de passe / clé API SMTP |
| `ADMIN_MATRICULE` | `sync: false` — Matricule du premier SUPER_ADMIN (ex : `ADM001`) |
| `ADMIN_EMAIL` | `sync: false` — Email du premier SUPER_ADMIN (ex : `admin@voteuasz.sn`) |
| `ADMIN_PASSWORD` | `sync: false` — Mot de passe initial (12+ car., 1 maj, 1 min, 1 chiffre, 1 symbole) |

> **⚠️ Premier SUPER_ADMIN** : Au tout premier démarrage, si aucun `SUPER_ADMIN` n'existe en base, l'application crée automatiquement un compte à partir de `ADMIN_MATRICULE`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`. **Si ces variables sont absentes, l'application refuse de démarrer.** Après la première connexion, changez le mot de passe via votre profil. Les variables `ADMIN_*` peuvent ensuite être supprimées sur Render (elles seront ignorées aux redémarrages suivants).

> **Note** : `CRYPTO_SECRET_KEY` a été supprimé. Utilisez uniquement `CRYPTO_SECRET`.

</details>

### Frontend Angular — Vercel

<details>
<summary>Voir le guide de déploiement</summary>

1. Importez le dépôt sur [Vercel](https://vercel.com) en conservant le **Root Directory** à la racine `.` (qui contient `vercel.json`) et le preset **Other**
2. Vérifiez que l'URL Render du backend est renseignée dans `vercel.json` (`/api/(.*)`) et dans `frontend/src/environments/environment.prod.ts` (`wsUrl` en `wss://...`)
3. Déployez : Vercel exécute `cd frontend && npm ci && npx ng build --configuration production` et publie `frontend/dist/voteuasz-frontend/browser`
4. Renseignez l'URL Vercel obtenue dans `ALLOWED_ORIGINS` sur Render

</details>

---

## Structure des Branches Git

Ce dépôt suit une organisation de branches conforme au cahier des charges du projet :

| Branche | Rôle |
|---|---|
| `main` | Code de production stable — ne reçoit que des merges depuis `develop` |
| `develop` | Branche d'intégration — reçoit les merges des branches `feature/*` |
| `feature/*` | Branches de développement thématiques (ex : `feature/corrections-conformite`) |

Le flux de travail standard est : `feature/* → develop → main`.

---

## Documentation

| Document | Description |
|---|---|
| [`docs/UML/class-diagram.md`](./docs/UML/class-diagram.md) | Diagramme de classes des entités JPA |
| [`docs/UML/use-case-diagram.md`](./docs/UML/use-case-diagram.md) | Diagramme de cas d'utilisation par rôle |
| [`docs/UML/sequence-vote-securise.md`](./docs/UML/sequence-vote-securise.md) | Séquence complète du vote OTP (3 étapes) |
| [`docs/openapi.yaml`](./docs/openapi.yaml) | Spécification REST API OpenAPI 3.0 |

---

<div align="center">

Projet académique réalisé dans le cadre du **Semestre 6**

**Université Assane Seck de Ziguinchor (UASZ)** · 2026

</div>
