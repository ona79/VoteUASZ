# Audit Technique — VoteUASZ

**Date de l'audit :** 13 novembre 2026  
**Périmètre :** Audit en lecture seule du dépôt `VoteUASZ` (Backend Spring Boot 3 / Java 21, Frontend Angular 17, PostgreSQL, WebSocket STOMP, Documentation & Déploiement) par rapport au cahier des charges.

---

## 1. Résumé Exécutif

### Score Global (sur 26 exigences)

| Statut | Nombre | Pourcentage |
|---|---|---|
| ✅ Conforme (prouvé dans le code et/ou les tests) | **16** | 61,5 % |
| ⚠️ Partiel ou fragile | **9** | 34,6 % |
| ❌ Absent / Non conforme | **1** | 3,8 % |
| **Total** | **26** | **100 %** |

> **Exécution des tests & build observés durant l'audit :**
> - **Backend (`mvn verify` avec JDK 21) :** `87` tests exécutés, `0` échec, `0` erreur, `0` ignoré. Couverture JaCoCo (45 classes) : **Instructions 70,02 %** (4119/5883), **Lignes 70,16 %** (903/1287), **Méthodes 61,24 %** (109/178), **Branches 51,23 %** (208/406).
> - **Frontend (`ng build --configuration production`) :** Build réussi, bundle initial **522,75 kB brut** (127,23 kB transféré), dépassant le budget de 500 kB de 22,75 kB. Les tests Karma (`ng test`) n'ont pas pu s'exécuter sur cette machine (binaire Google Chrome absent).

### Les 5 Manques les Plus Critiques

1. **Aucun déploiement cloud effectif ni CI/CD (#20 — ❌) :** Aucune URL de production dans `README.md`, aucun fichier de configuration cloud (`render.yaml`, `railway.json`, `vercel.json`, `fly.toml`), et aucun workflow CI/CD (`.github/workflows/` absent).
2. **Service Worker explicitement désactivé en production (#14 — ⚠️) :** Bien que `@angular/service-worker` et `ngsw-config.json` soient présents, `frontend/src/app/app.config.ts` (ligne 81) configure `provideServiceWorker('ngsw-worker.js', { enabled: false })`, rendant le mode offline totalement inactif.
3. **Contrôles temporels et de périmètre manquants lors du vote (#4 / Sécurité — ⚠️) :** `VotingService.submitVote()` et `requestOtp()` ne vérifient pas `dateDebut`/`dateFin` (seul `statut == VOTE_OUVERT` est contrôlé) et `submitVote()` ne vérifie ni que `voteToken.getElection().getId().equals(electionId)` ni `eligibilityService.isEligible()`.
4. **Exposition publique des résultats et des candidatures non validées (#11 / #5 — ⚠️) :** `SecurityConfig.java` (ligne 61) autorise en `permitAll()` les routes `GET /api/v1/results/**` (même pendant le vote) et `GET /api/v1/candidacies/**` (exposant les dossiers `PENDING`/`REJECTED` et leurs motifs de rejet).
5. **Corrélation temporelle possible en base entre électeur et bulletin (#6 / #23 — ⚠️) :** `Ballot` (`createdAt`) et `VoterAuditLog` (`votedAt`) sont persistés dans la même transaction séquentielle, et `Ballot.candidatureId` est stocké en clair en base en parallèle de `encryptedPayload`.

---

## 2. Vérification Détaillée du Cahier des Charges

### Section A — Fonctionnel

| # | Exigence | Statut | Preuve (fichiers + classes/méthodes) | Ce qui manque ou pose problème |
|---|---|---|---|---|
| 1 | Configuration d'élection : type (`DELEGUE`, `DUFR`, `VICE_RECTEUR`), collège électoral, dates ouverture/clôture, candidatures | ⚠️ | `TypeElection.java` ; `Election.java` (`type`, `dateDebut`, `dateFin`, `targetUfr`, `targetFiliere`, `targetNiveau`) ; `ElectionController.createElection()` ; `ElectionService.createElection()` ; `AdminDashboardComponent` | Pas de `@Valid` sur `ElectionController.createElection()`, aucune validation Jakarta sur `ElectionDto.java`, pas de vérification `dateDebut < dateFin`, pas d'endpoint de modification/suppression en phase `CONFIGURATION`. |
| 2 | Gestion des candidatures : dépôt de dossier (photo, programme, CV), validation par l'administration, liste officielle | ✅ | `Candidature.java` (`photoUrl`, `programmePdf`, `cvUrl`, `statut`, `motifRejet`) ; `CandidacyController.java` (`submitCandidacy`, `validateCandidacy`, `getApprovedCandidacies`) ; `CandidacyService.java` ; `CandidateDashboardComponent` ; `CommissionDashboardComponent` | Dépôt via URLs texte (pas d'upload multipart binaire) et absence de `@Valid` sur `CandidatureDto`. |
| 3 | Campagne électorale : espace de publication (texte, affiche, vidéo) par candidat | ✅ | `CampaignPost.java` (`titre`, `contenu`, `afficheUrl`, `videoEmbedUrl`) ; `CampaignController.java` ; `CampaignService.createCampaignPost()` (vérifie titulaire/admin, statut `APPROVED`, bloque après `VOTE_OUVERT` ou `dateFin`) ; `CandidateDashboardComponent` ; `ElectionDetailComponent` | Une seule publication active par candidature (écrasement de l'existante dans `CampaignService.java:57-65`). |
| 4 | Vote sécurisé : OTP par e-mail/SMS à chaque vote, token unique anti-double-vote, vote chiffré côté serveur | ⚠️ | `VoteController.java` ; `VotingService.java` (`requestOtp`, `verifyOtpAndGenerateToken`, `submitVote`) ; `VoteOTP.java` ; `VoteToken.java` ; `CryptoService.java` (AES-256-GCM) ; `OtpEmailService.java` | **OTP par e-mail uniquement** (aucun service SMS implémenté malgré `User.telephone`). `Ballot.candidatureId` est stocké en clair en base en plus de `encryptedPayload`. `submitVote()` ne vérifie pas `voteToken.election.id == electionId`. |
| 5 | Résultats en temps réel : dashboard live via WebSocket, graphiques de dépouillement, publication officielle | ⚠️ | `WebSocketConfig.java` (`/ws`, `/topic`) ; `VotingService.submitVote()` & `ElectionService.changeStatus()` (`SimpMessagingTemplate.convertAndSend`) ; `ResultsController.getLiveResults()` ; `WebSocketService` (`websocket.service.ts`) ; `ElectionDetailComponent.ngOnInit()` | `chart.js` (`^4.5.1`) est dans `frontend/package.json` mais **inutilisé** dans le code (barres HTML/CSS uniquement). `/api/v1/results/**` est `permitAll()` sans restriction selon le statut de l'élection. |
| 6 | Audit : log complet (horodatage, hash du vote, SANS identité du votant), rapport d'audit téléchargeable | ⚠️ | `VoterAuditLog.java` (`votedAt`, `ipHash`) ; `Ballot.java` (`ballotHash`) ; `AuditService.java` (`getAuditReport`, `generateAuditCsv`) ; `AuditController.java` (`GET /{electionId}`, `GET /{electionId}/export-csv`) | `ipHash` est calculé sur `"USER_IP_" + user.getId()` et non sur l'adresse IP réelle. En base, `Ballot.createdAt` et `VoterAuditLog.votedAt` restent corrélables par horodatage. |
| 7 | Réclamations post-élection : formulaire de contestation avec délai légal | ✅ | `Complaint.java` ; `ComplaintController.java` (`submitComplaint`, `resolveComplaint`, `getComplaintsByElection`, `getMyComplaints`) ; `ComplaintService.java` (`DELAI_LEGAL_HEURES = 48L`) ; `ComplaintComponent` (`complaint.component.ts`) ; `ComplaintControllerTest.java` (8 tests) | Le blocage des 48 h ne s'applique que si `statut == CLOTURE` ; un dépôt avant clôture reste autorisé. |
| 8 | Rôles : Super-admin électoral, Commission électorale, Candidat, Électeur (étudiant / personnel / enseignant) | ✅ | `Role.java` (`SUPER_ADMIN`, `COMMISSION_ELECTORALE`, `CANDIDAT`, `ELECTEUR`) ; `TypeElecteur.java` (`ETUDIANT`, `ENSEIGNANT`, `PATS`) ; `User.java` ; `SecurityConfig.java` ; `auth.guard.ts` | Ras. |
| 9 | Workflow d'élection avec transitions d'état contrôlées (`CONFIGURATION → CAMPAGNE → VOTE_OUVERT → DEPOUILLEMENT → PUBLICATION → CLOTURE`) | ✅ | `ElectionStatus.java` ; `ElectionStateMachine.java` (`canTransition`, `validateTransition`) ; `ElectionService.changeStatus()` ; `ElectionStateMachineTest.java` (14 tests) | Ras. |
| 10 | Vérification d'éligibilité dynamique selon le type d'élection | ✅ | `EligibilityService.java` (`isEligible`, `isEligibleForDelegue`, `isEligibleForDufr`, `getIneligibilityReason`) ; `VotingService.requestOtp()` ; `EligibilityServiceTest.java` (13 tests) | `ElectionService.isUserEligible()` duplique cette logique (sans vérifier `ETUDIANT` pour `DELEGUE`) et `VotingService.submitVote()` ne re-vérifie pas l'éligibilité. |

---

### Section B — Contraintes Transversales

| # | Exigence | Statut | Preuve (fichiers + classes/méthodes) | Ce qui manque ou pose problème |
|---|---|---|---|---|
| 11 | Auth JWT avec gestion des rôles (et autorisation effective sur chaque endpoint) | ⚠️ | `JwtTokenProvider.java` ; `JwtAuthenticationFilter.java` ; `SecurityConfig.java` ; `@PreAuthorize` sur les contrôleurs (`ElectionController`, `CandidacyController`, `CampaignController`, `ComplaintController`, `AuditController`, `AdminUserController`) | `SecurityConfig.java:61` expose en `permitAll()` `/api/v1/results/**` et `/api/v1/candidacies/**` (incluant candidatures `PENDING`/`REJECTED`). |
| 12 | API REST documentée Swagger / OpenAPI 3.0 | ⚠️ | `springdoc-openapi-starter-webmvc-ui:2.3.0` (`backend/pom.xml:88`) ; `application.yml:59-63` (`/api-docs`, `/swagger-ui.html`) ; `docs/openapi.yaml` (240 lignes, OpenAPI 3.0.3) | Aucune annotation `@Tag` / `@Operation` dans les contrôleurs Java. `docs/openapi.yaml` est désynchronisé du code (ex: `/auth/login` indique `matricule` au lieu de `matriculeOrEmail`). |
| 13 | Mobile-first / responsive | ✅ | `frontend/src/styles.css` (TailwindCSS, `.uasz-header-mobile`, `.uasz-sidebar-desktop` `hidden md:flex`, `.uasz-btn-primary` `w-full md:w-auto`) ; `frontend/src/index.html` (`viewport`) ; `NavbarComponent` ; `ElectionListComponent` ; `ElectionDetailComponent` | Ras. |
| 14 | Mode offline partiel (Service Worker) | ⚠️ | `@angular/service-worker` (`frontend/package.json:21`) ; `frontend/ngsw-config.json` (71 lignes, cache assets + API) ; `frontend/angular.json:48` (`"serviceWorker": "ngsw-config.json"`) ; `frontend/src/manifest.webmanifest` | **Service Worker désactivé dans le code :** `frontend/src/app/app.config.ts:81` définit `enabled: false` au lieu de `!isDevMode()`. Le mode offline est donc inopérant en production. |

---

### Section C — Livrables

| # | Exigence | Statut | Preuve (fichiers + classes/méthodes) | Ce qui manque ou pose problème |
|---|---|---|---|---|
| 15 | Code versionné avec branches `feature` / `develop` / `main` | ✅ | `git branch -a` : `main`, `remotes/origin/develop`, `remotes/origin/feature/corrections-conformite` ; historique `git log` structuré | Dossier local non suivi `VoteUASZ/` présent à la racine du workspace. |
| 16 | `README.md` détaillé (installation, variables d'environnement, démarrage local) | ✅ | `README.md` (398 lignes) + `.env.example` (14 lignes) : prérequis, Docker Compose, mode dev séparé, comptes de démo, sécurité, tests | Le README annonce 84 tests alors que `mvn verify` en exécute 87. |
| 17 | Diagrammes UML (cas d'utilisation, classes, séquences) | ✅ | `docs/UML/use-case-diagram.md` (62 lignes), `docs/UML/class-diagram.md` (162 lignes), `docs/UML/sequence-vote-securise.md` (59 lignes), `docs/UML/README.md` (93 lignes) | Ras. |
| 18 | Collection Postman ou `openapi.yaml` / `swagger.json` | ✅ | `docs/openapi.yaml` (240 lignes, OpenAPI 3.0.3) + `/api-docs` SpringDoc | Désynchronisation mineure de certains schémas (`LoginRequest.matriculeOrEmail` vs `matricule`). |
| 19 | Tests unitaires (≥ 60 % de couverture) + tests d'intégration | ✅ | `mvn verify` (JDK 21) : **87 tests, 0 échec, 0 erreur**. JaCoCo (45 classes) : **Instructions 70,02 %**, **Lignes 70,16 %**, **Méthodes 61,24 %**, **Branches 51,23 %**. Inclut `@SpringBootTest` (`FullElectionWorkflowIntegrationTest`, `ConcurrentVoteTest`, `UserDeactivationIntegrationTest`, etc.) | Côté Angular, seulement 2 fichiers de test (`app.component.spec.ts`, `election-filter.component.spec.ts`) et `ng test` non exécutable sans binaire Chrome local. |
| 20 | Déploiement sur cloud gratuit (config Render/Railway/Vercel/Netlify/Fly.io, Dockerfile, CI/CD, URL dans le README) | ❌ | `Dockerfile` (multi-stage), `docker-compose.yml`, `application-prod.yml`, section guide dans `README.md` | **Aucune configuration cloud** (`render.yaml`, `railway.json`, `vercel.json`, `netlify.toml`, `fly.toml` absents), **aucun pipeline CI/CD** (`.github/workflows/` absent), et **aucune URL de déploiement live** dans `README.md`. |

---

### Section D — Critères de Réussite

| # | Exigence | Statut | Preuve (fichiers + classes/méthodes) | Ce qui manque ou pose problème |
|---|---|---|---|---|
| 21 | Un compte ne vote qu'une fois par élection + test automatisé anti-double-vote (contrainte unique BDD + vérif applicative + concurrence) | ✅ | `VoterAuditLog.java:9-11` (`@UniqueConstraint(columnNames = {"user_id", "election_id"})`) ; `VotingService.requestOtp():56` et `submitVote():160` (`existsByUserIdAndElectionId`) ; `AntiDoubleVoteTest.java` (4 tests) ; `ConcurrentVoteTest.java` (test multi-thread `ExecutorService` + vérification rollback sans bulletin orphelin) | Ras. |
| 22 | Résultats live sans rechargement (WebSocket branché backend ET Angular) | ✅ | Backend : `WebSocketConfig.java` (`/ws`, `/topic`), `VotingService.submitVote():199` & `ElectionService.changeStatus():70` (`convertAndSend("/topic/results/" + id, ...)`). Frontend : `WebSocketService` (`websocket.service.ts`) + `ElectionDetailComponent.ngOnInit():786-789` | Warning de build Angular sur `@stomp/stompjs` (CommonJS). |
| 23 | Log d'audit complet, exportable, et AUCUN lien possible entre un électeur et son vote | ⚠️ | `Ballot.java` sans `user_id` ; `VoterAuditLog.java` sans `ballot_id` ; `AuditController.java` (`getAuditReport`, `exportAuditCsv`) ; `AuditService.generateAuditCsv()` (affiche `BULLETIN,N/A,<hash>`) | **Corrélation temporelle en base :** `Ballot.createdAt` et `VoterAuditLog.votedAt` sont insérés dans la même transaction (`VotingService.submitVote():176-191`) avec des timestamps identiques à la milliseconde près et des IDs séquentiels. |
| 24 | OTP qui expire à 5 min + token de vote à usage unique invalidé après usage (+ tests) | ✅ | `VoteOTP.java:49-56` (`plusMinutes(5)`, `isExpired()`) ; `VotingService.verifyOtpAndGenerateToken()` (`otp.setUsed(true)`, `attemptsCount >= 5`) ; `VotingService.submitVote()` (`findByTokenHashAndUsedFalse`, `voteToken.setUsed(true)`) ; `AntiDoubleVoteTest.java`, `VoteControllerTest.java`, `OtpCooldownAndQuotaTest.java`, `OtpBruteForceTest.java`, `OtpResendLoopTest.java` | Ras. |
| 25 | Interface utilisable sur smartphone en 3G (taille des bundles, lazy loading, images optimisées) | ⚠️ | Lazy loading des routes dans `app.routes.ts` (`admin`, `commission`, `candidat`, `reclamations`). `ng build --configuration production` : **Initial 522,75 kB brut / 127,23 kB transféré**. | **Budget 500 kB dépassé** (+22,75 kB). Images PNG non optimisées dans `frontend/src/assets/` (`logo.png` 493 KB + `logo_vote_uasz.PNG` 493 KB en doublon + `logo_uasz.png` 202 KB = ~1,2 MB). Aucun `loading="lazy"` sur les images. Police Google Fonts `@import` bloquante dans `styles.css`. |
| 26 | Rapport PDF officiel des résultats généré automatiquement à la clôture du scrutin | ✅ | `ElectionService.changeStatus():76-92` génère automatiquement `reports/pv_election_<id>.pdf` lors du passage à `ElectionStatus.CLOTURE` via `PdfReportService.generateElectionPdfReport()` (OpenPDF). `ResultsController.exportPdfReport()` expose le téléchargement PDF. | Ras. |

---

## 3. Failles de Sécurité (Audit Complémentaire)

### Critique

1. **Absence de contrôle des dates `dateDebut` / `dateFin` lors du vote (`VotingService.java:48, 155`) :**
   `requestOtp()` et `submitVote()` vérifient uniquement `election.getStatut() != ElectionStatus.VOTE_OUVERT`. Un électeur peut donc voter en dehors de la fenêtre temporelle prévue (`dateDebut`..`dateFin`) si l'administrateur n'a pas encore déclenché manuellement la transition vers `DEPOUILLEMENT`.
2. **Token de vote non lié à l'élection ni re-vérifié sur l'éligibilité dans `submitVote()` (`VotingService.java:144-169`) :**
   `submitVote(tokenHash, electionId, candidatureId)` ne vérifie pas que `voteToken.getElection().getId().equals(electionId)` et ne re-vérifie pas `eligibilityService.isEligible(user, election)`. Un électeur éligible à une élection A pourrait obtenir un `voteToken` sur A et soumettre son bulletin sur une élection B.

### Haute

3. **Endpoints de résultats et candidatures trop permissifs (`SecurityConfig.java:61`) :**
   `GET /api/v1/results/**` (incluant `/export-pdf`) et `GET /api/v1/candidacies/**` sont en `permitAll()`. Cela permet à tout utilisateur anonyme de consulter les résultats partiels pendant le scrutin et de lire les candidatures `PENDING`/`REJECTED` (avec `motifRejet`).
4. **Stockage en clair de `candidatureId` dans `Ballot` et corrélation temporelle (`Ballot.java:25`, `VotingService.java:176-191`) :**
   `Ballot` stocke `candidatureId` en clair pour le comptage SQL `GROUP BY` tout en chiffrant `encryptedPayload` en AES-256-GCM. De plus, l'insertion simultanée de `Ballot` et `VoterAuditLog` dans la même transaction permet, en cas d'accès à la base de données, de relier un électeur à son bulletin par horodatage et ordre d'ID.
5. **Absence de rate limiting HTTP par adresse IP :**
   Le verrouillage anti-brute-force sur `/login` (`AuthController.java:74-86`, 5 échecs → blocage 5 min) et sur l'OTP (`VotingService.java:60-73, 101-121`, 5 essais / cooldown 60s / 5 OTP par heure) est uniquement par compte utilisateur. Une attaque par IP sur plusieurs comptes (ou visant à verrouiller des comptes ciblés) n'est pas freinée.
6. **Validation des entrées insuffisante sur les contrôleurs de gestion :**
   `ElectionController.createElection`, `CandidacyController.submitCandidacy`, `CampaignController.createPost` et `ComplaintController.submitComplaint` n'utilisent pas `@Valid` et leurs DTOs (`ElectionDto`, `CandidatureDto`) n'ont pas d'annotations Jakarta Validation (`@NotBlank`, `@NotNull`, validation d'URLs sûres `http(s)://` pour `photoUrl`/`videoEmbedUrl`/`programmePdf`).

### Moyenne

7. **Identifiants de démonstration en dur dans `DataInitializer.java` :**
   `DataInitializer` (`@Profile("!test")`) crée `ADMIN001` (`AdminSecure2026!`), `COMM001`, `CAND202301`, `20230001` au démarrage, y compris sous le profil `prod` s'il n'est pas restreint à `@Profile("dev")`.
8. **Logs de sécurité verbeux en production (`application-prod.yml:21-25`, `JwtAuthenticationFilter.java:38`) :**
   `logging.level.org.springframework.security: DEBUG` est activé dans `application-prod.yml`, et `JwtAuthenticationFilter` logge en `INFO` les 20 premiers caractères de chaque token JWT.
9. **Console H2 et `frameOptions().disable()` (`application.yml:20-23`, `SecurityConfig.java:96`) :**
   `frameOptions` est désactivé globalement pour H2 (désactivé en `prod` côté H2, mais `X-Frame-Options` reste désactivé).
10. **Clé AES dérivée sans sel (`CryptoService.java:105-110`) :**
    `CryptoService` utilise correctement `AES/GCM/NoPadding` avec IV aléatoire de 12 octets et tag 128 bits, mais dérive la clé via un simple `SHA-256` sans vérification de longueur minimale de `CRYPTO_SECRET` au démarrage. *(Note : aucun secret réel JWT/AES n'est commité dans le dépôt ; `.env` n'est pas suivi par Git).*

---

## 4. Plan d'Action Priorisé Avant Soutenance

Du plus bloquant au moins bloquant (estimation d'effort : **S** < 2 h, **M** 2–6 h, **L** > 6 h) :

| Priorité | Action corrective | Exigence / Faille | Effort |
|---|---|---|---|
| **1 (Bloquant)** | **Activer le Service Worker en production** : remplacer `enabled: false` par `enabled: !isDevMode()` dans `frontend/src/app/app.config.ts:81` et tester le cache offline. | #14 | **S** |
| **2 (Bloquant)** | **Déployer sur cloud gratuit + config + URL dans README** : ajouter la config (ex. `render.yaml` + `vercel.json`), un workflow CI minimal (`.github/workflows/ci.yml` pour `mvn test` + `ng build`), et documenter l'URL publique dans `README.md`. | #20 | **M** |
| **3 (Bloquant)** | **Sécuriser `VotingService.submitVote()` et `requestOtp()`** : vérifier `voteToken.getElection().getId().equals(electionId)`, re-vérifier `eligibilityService.isEligible()`, et contrôler la fenêtre temporelle `dateDebut <= now <= dateFin`. | #4 / Sécurité Critique | **S** |
| **4 (Haute)** | **Restreindre `SecurityConfig.java:61`** : retirer `/api/v1/results/**` et `/api/v1/candidacies/election/{id}` (non approuvées) du `permitAll()`, et conditionner l'accès aux résultats au statut (`DEPOUILLEMENT`/`PUBLICATION`/`CLOTURE`) ou aux rôles `SUPER_ADMIN`/`COMMISSION_ELECTORALE`. | #11 / #5 / Sécurité Haute | **S** |
| **5 (Haute)** | **Renforcer l'anonymat en base et l'audit** : supprimer `Ballot.createdAt` (ou décaler/arrondir les timestamps), calculer `VoterAuditLog.ipHash` sur l'IP réelle (`HttpServletRequest`), et ne pas exposer `candidatureId` en clair si le déchiffrement au dépouillement est requis. | #6 / #23 / Sécurité Haute | **M** |
| **6 (Haute)** | **Ajouter `@Valid` et la validation des DTOs** (`ElectionDto`, `CandidatureDto`, `CampaignPostDto`, `ComplaintDto`), vérifier `dateDebut < dateFin` et valider le schéma `https://` des URLs. | #1 / Sécurité Haute | **S** |
| **7 (Moyenne)** | **Optimiser le frontend pour la 3G** : supprimer le doublon `logo.png`/`logo_vote_uasz.PNG`, compresser/convertir les logos en WebP, passer sous le budget de 500 kB, et ajouter `loading="lazy"` sur les images. | #25 | **S** |
| **8 (Moyenne)** | **Restreindre `DataInitializer` au profil `dev` (`@Profile("!test & !prod")`)** et passer `logging.level.org.springframework.security` à `WARN`/`INFO` dans `application-prod.yml`. | Sécurité Moyenne | **S** |
| **9 (Moyenne)** | **Brancher Chart.js** dans `ElectionDetailComponent` pour les graphiques de dépouillement (ou retirer la dépendance inutilisée de `package.json`). | #5 | **S** |
| **10 (Faible)** | **Synchroniser `docs/openapi.yaml`** (ex: `matriculeOrEmail`) et ajouter `@Tag`/`@Operation` sur les contrôleurs ; implémenter un service SMS (ou retirer la mention SMS du cahier des charges si hors périmètre) ; nettoyer le dossier non suivi `VoteUASZ/`. | #12 / #4 / #15 | **M** |

