# Rapport des Corrections — VoteUASZ

**Branche :** `feature/corrections-audit` (créée depuis `develop`, synchronisée avec `main`)  
**Référence :** [AUDIT_VOTEUASZ.md](./AUDIT_VOTEUASZ.md)  
**Date :** 13 novembre 2026

---

## Résumé des vérifications finales

- **Backend (`mvn verify` avec JDK 21) :** **104 tests exécutés, 0 échec, 0 erreur, 0 ignoré** *(87 existants + 17 nouveaux tests)*.
- **Couverture JaCoCo (backend) :**
  - Instructions : **74,30 %** (4965 / 6682)
  - Lignes : **74,48 %** (1112 / 1493)
  - Méthodes : **70,19 %** (146 / 208)
  - Branches : **57,12 %** (293 / 513)
- **Frontend (`ng build --configuration production`) :** Build réussi, bundle initial **418,56 kB brut** (**107,30 kB** transféré), sous le budget de 500 kB.
- **Tests Angular (`ng test`) :** 7 nouveaux tests ajoutés (`websocket.service.spec.ts` et `election-detail.component.spec.ts`), `karma.conf.js` configuré avec `ChromeHeadlessNoSandbox` (`--no-sandbox`), non exécutés localement faute de binaire Chrome/Firefox sur cette machine.

---

## Tableau récapitulatif des 25 corrections

| # | Correction | Statut | Fichiers | Tests |
|---|---|---|---|---|
| 1 | Fenêtre temporelle du vote (`dateDebut <= now <= dateFin` + `VOTE_OUVERT`) dans `requestOtp()` et `submitVote()` | fait | `backend/src/main/java/sn/uasz/vote/service/VotingService.java` | `VoteWindowAndTokenBindingTest` (3 tests) |
| 2 | Vérification `voteToken.election == electionId` et ré-éligibilité dans `submitVote()` | fait | `backend/src/main/java/sn/uasz/vote/service/VotingService.java` | `VoteWindowAndTokenBindingTest` (2 tests) |
| 3 | Suppression de la duplication `ElectionService.isUserEligible()` (centralisation sur `EligibilityService`) | fait | `backend/src/main/java/sn/uasz/vote/service/ElectionService.java` | `EligibilityServiceTest` (13 tests) |
| 4 | Tests dédiés vote hors dates, token d'une élection A sur B, inéligibilité au submit | fait | `backend/src/test/java/sn/uasz/vote/VoteWindowAndTokenBindingTest.java` | `VoteWindowAndTokenBindingTest` (6 tests) |
| 5 | Retrait de `/results/**` et `/candidacies/**` du `permitAll()`, contrôle résultats par phase/rôle (REST + STOMP `/topic/results/*`), filtrage `APPROVED` candidatures, adaptation frontend | fait | `SecurityConfig.java`, `ResultsController.java`, `WebSocketConfig.java`, `CandidacyController.java`, `CandidacyService.java`, `websocket.service.ts`, `election-detail.component.ts` | `AccessValidationAndRateLimitTest` (2 tests) |
| 6 | `@Valid` + annotations Jakarta (`@NotBlank`, `@NotNull`, `@Size`, `@Pattern` `http/https`), `dateDebut < dateFin`, JSON 400 structuré dans `@RestControllerAdvice` | fait | `ElectionDto.java`, `CandidatureDto.java`, `CampaignPostDto.java`, `ComplaintDto.java`, `ElectionController.java`, `CandidacyController.java`, `CampaignController.java`, `ComplaintController.java`, `ElectionService.java`, `GlobalExceptionHandler.java` | `AccessValidationAndRateLimitTest` (`validation_rejectsInvalidDtosAndDates`) |
| 7 | Endpoints `PUT` et `DELETE /api/v1/elections/{id}` autorisés uniquement en phase `CONFIGURATION` | fait | `ElectionController.java`, `ElectionService.java`, `SecurityConfig.java` | `AccessValidationAndRateLimitTest` (`updateAndDeleteElection_onlyInConfiguration`) |
| 8 | Rate limiting par IP (20 req/min/IP, HTTP 429 JSON) sur `/auth/login`, `/vote/request-otp`, `/vote/verify-otp` | fait | `RateLimitingFilter.java`, `SecurityConfig.java` | `AccessValidationAndRateLimitTest` (`rateLimiting_returns429After20RequestsPerMinute`) |
| 9 | Réclamations autorisées uniquement en `PUBLICATION` ou `CLOTURE` et dans les 48 h après `dateFin` | fait | `ComplaintService.java` | `AccessValidationAndRateLimitTest` (`complaints_onlyAllowedAfterPublicationOrClotureWithin48h`) |
| 10 | `Ballot` : suppression de `createdAt` et clé primaire `UUID` aléatoire | fait | `Ballot.java`, `BallotRepository.java` | `AnonymityAndCryptoAuditTest` (2 tests) |
| 11 | `VoterAuditLog` : `votedAt` arrondi à l'heure (`ChronoUnit.HOURS`) et `ipHash` calculé sur IP réelle (`HttpServletRequest`) salée via `AUDIT_IP_SALT` | fait | `VoterAuditLog.java`, `VotingService.java`, `VoteController.java`, `application.yml` | `AnonymityAndCryptoAuditTest` (`submitVote_usesUuidBallotRoundedVotedAtAndSaltedRealIpHash`) |
| 12 | Conservation de `Ballot.candidatureId` documentée (README + présent rapport) et test de dissociation du schéma BDD | fait | `README.md`, `CORRECTIONS_VOTEUASZ.md` | `AnonymityAndCryptoAuditTest` (`schemaDissociation_noDirectLinkBetweenVoterAndBallot`) |
| 13 | `CryptoService` : refus de démarrage si `CRYPTO_SECRET < 32` chars (`@PostConstruct`) et dérivation PBKDF2WithHmacSHA256 | fait | `CryptoService.java` | `AnonymityAndCryptoAuditTest` (`cryptoService_rejectsShortKeyAndDerivesPbkdf2`), `CryptoServiceTest` (7 tests) |
| 14 | `DataInitializer` restreint au profil `dev` (`@Profile("dev")`) | fait | `DataInitializer.java` | `SecurityHygieneTest` (`dataInitializer_restrictedToDevProfile`) |
| 15 | `application-prod.yml` : logs `spring.security` à `WARN` ; `JwtAuthenticationFilter` sans affichage de morceau de JWT | fait | `application-prod.yml`, `JwtAuthenticationFilter.java` | `mvn verify` (compilation + exécution) |
| 16 | `SecurityConfig` : `X-Frame-Options: DENY` hors `dev`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` | fait | `SecurityConfig.java` | `SecurityHygieneTest` (`securityHeaders_presentInNonDevProfile`) |
| 17 | Service Worker activé (`enabled: !isDevMode()`), suppression du script de désinscription dans `index.html`, vérification `ngsw-config.json` | fait | `frontend/src/app/app.config.ts`, `frontend/src/index.html` | `ng build --configuration production` |
| 18 | Chart.js branché dans `ElectionDetailComponent` (barres + camembert, mise à jour live WebSocket, barres HTML conservées en secours) | fait | `frontend/src/app/components/election-detail/election-detail.component.ts` | `election-detail.component.spec.ts` |
| 19 | Optimisation 3G : logos WebP (`9.8 KB` et `13 KB`), suppression `logo.png`, `loading="lazy"`, `preconnect` Google Fonts, lazy loading routes (`418.56 kB` initial < 500 kB) | fait | `frontend/src/assets/*`, `index.html`, `styles.css`, `app.routes.ts`, composants Angular | `ng build --configuration production` |
| 20 | Tests Angular `ElectionDetailComponent` (4) et `WebSocketService` (3) + `ChromeHeadlessNoSandbox` dans `karma.conf.js` | partiel | `websocket.service.spec.ts`, `election-detail.component.spec.ts`, `karma.conf.js` | Fichiers créés (7 tests) ; non exécutés localement faute de binaire Chrome/Firefox |
| 21 | Workflow CI `.github/workflows/ci.yml` (`mvn verify` JDK 21 + `ng build --configuration production`) | fait | `.github/workflows/ci.yml` | Vérifié en local (`mvn verify` + `ng build`) |
| 22 | Fichiers cloud `render.yaml` (backend + PostgreSQL) et `vercel.json` (SPA Angular + rewrites) + `AUDIT_IP_SALT` dans `.env.example` | fait | `render.yaml`, `vercel.json`, `.env.example` | Revue syntaxique |
| 23 | `README.md` : section Déploiement Render+Vercel, placeholder `URL de démo : À REMPLIR APRÈS DÉPLOIEMENT`, `104 tests`, mention OTP e-mail (SMS non implémenté), note `Ballot.candidatureId` | fait | `README.md` | — |
| 24 | Synchronisation `docs/openapi.yaml` (`matriculeOrEmail`, `429`) + `@Tag`/`@Operation` sur les 9 contrôleurs | fait | `docs/openapi.yaml`, tous les fichiers `*Controller.java` | Compilation + `mvn verify` |
| 25 | Dossier non suivi `VoteUASZ/` ajouté au `.gitignore` (conservé sur disque sans suppression destructive) | fait | `.gitignore` | `git status` |

---

## Notes techniques & ce qui reste à faire manuellement

1. **Choix d'architecture `Ballot.candidatureId` (#12) :** `Ballot.candidatureId` est conservé en base pour permettre le dépouillement SQL `GROUP BY` en temps réel sans déchiffrer tous les bulletins à chaque suffrage. La dissociation totale avec l'électeur est assurée par l'absence de toute référence utilisateur sur `Ballot`, l'identifiant `UUID` aléatoire, la suppression de `Ballot.createdAt`, l'arrondi à l'heure de `VoterAuditLog.votedAt` et le salage de `ipHash` sur l'IP réelle.
2. **OTP SMS (#23) :** L'envoi d'OTP fonctionne uniquement par e-mail (`OtpEmailService`) ; l'envoi SMS reste une extension future documentée dans `README.md`.
3. **Tests Angular (#20) :** Exécuter `cd frontend && npm test -- --watch=false` dans un environnement disposant de Chrome/Chromium (ou Firefox).
4. **Déploiement manuel (#22-23) :**
   - Créer un compte sur **Render** (Blueprint `render.yaml`) et **Vercel** (`vercel.json`).
   - Configurer les variables d'environnement (`JWT_SECRET`, `CRYPTO_SECRET`, `CRYPTO_SECRET_KEY`, `AUDIT_IP_SALT`, `ALLOWED_ORIGINS`, `SPRING_MAIL_*`, `DEFAULT_ELECTEUR_PASSWORD`, `DEFAULT_CANDIDAT_PASSWORD`).
   - Mettre à jour l'URL Render dans `vercel.json` (`/api/(.*)`), déployer, puis renseigner l'URL publique dans `README.md` (`URL de démo`).
