# Corrections Déploiement — VoteUASZ

> Corrections appliquées le 2026-11-13 sur la branche `feature/corrections-audit`, conformément à `VERIF_DEPLOIEMENT.md`.

---

## Résumé

| # | Correction | Statut | Fichiers modifiés/créés | Tests |
|---|---|---|---|---|
| 1 | `server.forward-headers-strategy: native` dans `application-prod.yml` | ✅ Fait | `application-prod.yml` | Couvert par `ClientIpResolverTest` + `AccessValidationAndRateLimitTest` |
| 2 | `ClientIpResolver.resolve()` — méthode utilitaire unique (remoteAddr seulement) | ✅ Fait | `ClientIpResolver.java` (nouveau) | `ClientIpResolverTest` — 5 tests unitaires Mockito |
| 3 | `RateLimitingFilter` — supprime le parsing `X-Forwarded-For` falsifiable | ✅ Fait | `RateLimitingFilter.java` | `AccessValidationAndRateLimitTest.rateLimiting_returns429After20RequestsPerMinute` |
| 4 | `VoteController` — utilise `ClientIpResolver.resolve()` pour `ipHash` | ✅ Fait | `VoteController.java` | Couvert par `AnonymityAndCryptoAuditTest` |
| 5 | Suppression de `CRYPTO_SECRET_KEY` (doublon dangereux avec `CRYPTO_SECRET`) | ✅ Fait | `application.yml`, `render.yaml`, `.env.example`, `README.md` | `CryptoServiceTest` — 3 tests LOT B ajoutés |
| 6 | `JWT_SECRET`, `CRYPTO_SECRET`, `AUDIT_IP_SALT` en `generateValue: true` | ✅ Fait | `render.yaml` | — |
| 7 | Alignement `.env.example` ↔ `render.yaml` ↔ `README.md` | ✅ Fait | `.env.example`, `render.yaml`, `README.md` | — |
| 8 | Test refus démarrage si `CRYPTO_SECRET` < 32 chars | ✅ Fait | `CryptoServiceTest.java` | `validateAndInitKey_throwsIfSecretTooShort`, `_throwsIfSecretIsNull`, `_succeedsWithMinimumLength` |
| 9 | `AdminBootstrapInitializer` — bootstrap SUPER_ADMIN en prod | ✅ Fait | `AdminBootstrapInitializer.java` (nouveau), `application.yml`, `UserRepository.java` | `AdminBootstrapInitializerTest` — 6 tests |
| 10 | Aucun endpoint public d'initialisation admin | ✅ Fait | (Vérification : aucun ajout) | — |
| 11 | SUPER_ADMIN peut se connecter et importer CSV | ✅ Fait | (Couvert par les tests existants) | `FullElectionWorkflowIntegrationTest`, `SuperAdminCsvImportTest` |
| 12 | Tests bootstrap : création, idempotence, mdp faible, vars manquantes | ✅ Fait | `AdminBootstrapInitializerTest.java` (nouveau) | 6 tests |
| 13 | Documentation `ADMIN_MATRICULE`/`EMAIL`/`PASSWORD` dans le README | ✅ Fait | `README.md` | — |
| 14 | Variables ADMIN dans `render.yaml` et `.env.example` | ✅ Fait | `render.yaml`, `.env.example` | — |
| 15 | Fichiers `environment.ts` / `environment.prod.ts` + `angular.json` fileReplacements | ✅ Fait | `environment.ts` (nouveau), `environment.prod.ts` (nouveau), `angular.json` | `websocket.service.spec.ts` — 2 tests LOT D |
| 16 | `websocket.service.ts` — utilise `environment.wsUrl` au lieu de `window.location.host` | ✅ Fait | `websocket.service.ts` | `websocket.service.spec.ts` — test prod URL directe + test dev fallback |
| 17 | `WebSocketConfig` — remplace `setAllowedOriginPatterns("*")` par `ALLOWED_ORIGINS` | ✅ Fait | `WebSocketConfig.java` | `CorsConfigTest` (existant) |
| 18 | `vercel.json` — placeholder `REMPLACER-PAR-URL-RENDER`, appels HTTP en relatif via rewrite | ✅ Fait | `vercel.json` | — |
| 19 | Test Angular `WebSocketService` → URL depuis `environment.wsUrl` | ✅ Fait | `websocket.service.spec.ts` | 2 tests LOT D ajoutés (prod + dev) |

---

## Résultats des tests

### Backend — `mvn verify`

```
Tests run: 118, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

**Tests ajoutés (14 nouveaux) :**
- `ClientIpResolverTest` : 5 tests (resolve remoteAddr, ignore XFF forgé, null, blank, IPs indépendantes)
- `CryptoServiceTest` : 3 tests (secret < 32 chars, null, exactement 32 chars)
- `AdminBootstrapInitializerTest` : 6 tests (création OK, idempotence, mdp faible, matricule absent, email absent, BCrypt sans plaintext)

### Frontend — `ng build --configuration production`

```
Application bundle generation complete. [3.663 seconds]
Output location: frontend/dist/voteuasz-frontend
```

Chunks lazy-loadés : 9 fichiers (235.82 kB le plus gros : election-detail-component).
Warnings mineurs préexistants : budget CSS election-filter (3.55 kB > 2 kB) et CommonJS `@stomp/stompjs`.

---

## Historique Git

```
e88e874 LOT D — WebSocket direct vers Render, environments Angular, vercel.json placeholder
6c10b7d LOT C — Bootstrap premier SUPER_ADMIN en production
f989a2f LOT B — Variables d'environnement : suppression CRYPTO_SECRET_KEY, alignement render.yaml/.env.example
de23439 LOT A — IP réelle derrière proxy Render (anti-spoofing)
```

---

## Notes et points d'attention

1. **`DEFAULT_ELECTEUR_PASSWORD` / `DEFAULT_CANDIDAT_PASSWORD`** : les valeurs par défaut codées en dur (`CHANGEME_REQUIRED_*_2026`) ont été supprimées de `application.yml`. En prod, ces variables **doivent** être définies sur Render, sinon le démarrage échouera (résolution de placeholder Spring).

2. **`AUDIT_IP_SALT`** : en prod, Render génère automatiquement cette valeur (`generateValue: true`). En dev, le fallback est `CRYPTO_SECRET`. En test, une valeur dédiée est dans `src/test/resources/application.yml`.

3. **WebSocket SockJS** : le backend expose `/ws` avec SockJS **et** en natif. Le frontend utilise `@stomp/stompjs` en mode natif (pas SockJS). Pas de changement nécessaire sur ce point.

4. **`WebSocketConfig` origines** : passage de `setAllowedOriginPatterns("*")` à `setAllowedOrigins(origines)` basé sur `ALLOWED_ORIGINS`. En dev, les valeurs par défaut `http://localhost:4200,http://localhost:8080` sont utilisées. En prod, il faut que `ALLOWED_ORIGINS` sur Render contienne l'URL Vercel exacte.
