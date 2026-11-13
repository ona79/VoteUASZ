# Vérification Avant Déploiement — VoteUASZ (Render + Vercel)

> Audit en lecture seule effectué le 2026-11-13. Aucun fichier de code ou de configuration n'a été modifié.

---

## 1. Résumé

| # | Point | Statut | Preuve (fichier + ligne) | Ce qui manque |
|---|---|---|---|---|
| 1 | Rate limiting & `ipHash` derrière proxy (Render) | **PARTIEL** | `RateLimitingFilter.java:72-82`, `VoteController.java:90`, `VotingService.java:200-206`, `application.yml:41-42`, `application-prod.yml` | `server.forward-headers-strategy` absent ; `split(",")[0]` sur `X-Forwarded-For` sans contrôle permet de forger l'IP et de contourner la limite de 20 req/min ainsi que de fausser `ipHash`. |
| 2 | Variables d'environnement des secrets | **PARTIEL** | `application.yml:8-59`, `application-prod.yml:3-8`, `render.yaml:15-54`, `.env.example:1-16`, `CryptoService.java:41`, `JwtTokenProvider.java:18`, `VotingService.java:38`, `UserImportService.java:35,38`, `OtpEmailService.java:26` | Redondance risquée entre `CRYPTO_SECRET` (`generateValue: true`) et `CRYPTO_SECRET_KEY` (`sync: false`) dans `render.yaml` ; `.env.example` omet `ALLOWED_ORIGINS` et `SPRING_MAIL_*` et contient `POSTGRES_*` non lus par le backend. |
| 3 | Premier compte `SUPER_ADMIN` en production | **PAS PRÊT** | `DataInitializer.java:31` (`@Profile("dev")`), `AdminUserController.java:20,27`, `AuthController.java:31-108`, `README.md:205` | Aucun mécanisme d'initialisation du premier `SUPER_ADMIN` en prod (pas de script, pas de migration SQL, pas de bootstrap par env vars). La BDD prod sera vide et personne ne pourra se connecter ni importer d'utilisateurs. |
| 4 | CORS (`ALLOWED_ORIGINS`) | **PRÊT** | `SecurityConfig.java:39-40,122-132`, `application.yml:45-46`, `WebSocketConfig.java:48,51` | Rien côté code (renseigner `ALLOWED_ORIGINS` sur Render avec l'URL Vercel exacte lors du déploiement). |
| 5 | `vercel.json` & WebSocket (`/ws`) | **PAS PRÊT** | `vercel.json:5-14`, `websocket.service.ts:17` | `websocket.service.ts:17` utilise `window.location.host` (domaine Vercel) pour `wss://.../ws`. Vercel ne proxifie pas les WebSockets : le frontend doit cibler directement l'URL Render en prod. L'URL dans `vercel.json:8` est aussi à vérifier/remplacer par l'URL Render réelle. |

---

## Détails des vérifications

### 1. Rate limiting derrière un proxy (Render)

- **Lecture de l'IP client dans `RateLimitingFilter`** ([RateLimitingFilter.java](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/java/sn/uasz/vote/security/RateLimitingFilter.java#L72-L82)) :
  `extractClientIp(HttpServletRequest request)` lit dans l'ordre :
  1. `request.getHeader("X-Forwarded-For")` → prend `forwarded.split(",")[0].trim()` (lignes 73-76).
  2. `request.getHeader("X-Real-IP")` → `realIp.trim()` (lignes 77-80).
  3. `request.getRemoteAddr()` en fallback (ligne 81).
- **`server.forward-headers-strategy`** : **Absent** de [application.yml](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/resources/application.yml#L41-L42) et de [application-prod.yml](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/resources/application-prod.yml).
- **Risque de contournement par forge d'en-tête** : **Oui, contournable.** En prenant aveuglément `forwarded.split(",")[0].trim()`, un attaquant peut envoyer un en-tête `X-Forwarded-For: 1.2.3.4` différent à chaque requête. Render ajoute l'IP réelle à la fin de la liste (`<ip_forgée>, <ip_réelle>`), mais `split(",")[0]` lira toujours l'IP forgée en tête.
- **Conclusion Render** :
  - Pour des utilisateurs légitimes (qui n'envoient pas de `X-Forwarded-For` forgé), chacun a bien sa propre limite de 20 req/min (ils ne partagent pas l'IP du proxy Render).
  - Pour un attaquant, la limite est trivialement contournable via `X-Forwarded-For`.
- **`ipHash` dans `VoterAuditLog`** :
  - [VoteController.java](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/java/sn/uasz/vote/controller/VoteController.java#L90) appelle `RateLimitingFilter.extractClientIp(httpRequest)` puis le passe à [VotingService.java](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/java/sn/uasz/vote/service/VotingService.java#L200-L206) qui calcule `cryptoService.hash(salt + ":" + safeIp)`.
  - Même constat : utilise l'IP réelle transmise par Render pour un client normal, mais falsifiable via `X-Forwarded-For`.

---

### 2. Variables d'environnement des secrets

#### `CRYPTO_SECRET` vs `CRYPTO_SECRET_KEY`
- [CryptoService.java](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/java/sn/uasz/vote/service/CryptoService.java#L41) lit `@Value("${app.crypto.secret-key}")`.
- [application.yml](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/resources/application.yml#L54-L55) mappe :
  `secret-key: ${CRYPTO_SECRET_KEY:${CRYPTO_SECRET}}`.
- Donc `CRYPTO_SECRET_KEY` est prioritaire si définie, et `CRYPTO_SECRET` sert de repli. **L'une des deux est inutile** (et dangereuse dans `render.yaml:31-34` où `CRYPTO_SECRET` est en `generateValue: true` tandis que `CRYPTO_SECRET_KEY` est en `sync: false` : si `CRYPTO_SECRET_KEY` est créée vide `""` sur Render, `${CRYPTO_SECRET_KEY:${CRYPTO_SECRET}}` vaut `""` et `CryptoService.validateAndInitKey()` fait échouer le démarrage).

#### Vérification `render.yaml`
- Aucun secret en dur dans [render.yaml](file:///Users/Admin/Desktop/VoteUASZ/render.yaml).
- Secrets générés automatiquement (`generateValue: true`) : `JWT_SECRET` (l.30), `CRYPTO_SECRET` (l.32), `AUDIT_IP_SALT` (l.36).
- Secrets depuis la BDD (`fromDatabase`) : `SPRING_DATASOURCE_URL` (l.18), `SPRING_DATASOURCE_USERNAME` (l.22), `SPRING_DATASOURCE_PASSWORD` (l.26).
- Variables en `sync: false` : `CRYPTO_SECRET_KEY` (l.34), `ALLOWED_ORIGINS` (l.38), `SPRING_MAIL_HOST` (l.40), `SPRING_MAIL_USERNAME` (l.44), `SPRING_MAIL_PASSWORD` (l.46), `DEFAULT_ELECTEUR_PASSWORD` (l.52), `DEFAULT_CANDIDAT_PASSWORD` (l.54).

#### Inventaire complet des variables d'environnement

| Variable | Lue où | Obligatoire ? | Valeur par défaut | Présente dans `.env.example` | Présente dans `render.yaml` |
|---|---|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | Spring Boot / `Dockerfile:24` | Oui (prod) | `dev` / aucune (`prod` dans Dockerfile) | Oui (`prod`) | Oui (`value: prod`) |
| `PORT` | `application.yml:42`, `Dockerfile:25,33` | Non | `8080` | Non | Non (injecté par Render) |
| `SPRING_DATASOURCE_URL` | `application.yml:8`, `application-prod.yml:3` | Oui en prod | H2 en dev / aucune en prod | Non | Oui (`fromDatabase`) |
| `SPRING_DATASOURCE_USERNAME` | `application.yml:9`, `application-prod.yml:4` | Oui en prod | `sa` en dev / aucune en prod | Non | Oui (`fromDatabase`) |
| `SPRING_DATASOURCE_PASSWORD` | `application.yml:10`, `application-prod.yml:5` | Oui en prod | `""` en dev / aucune en prod | Non | Oui (`fromDatabase`) |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | `application-prod.yml:6` | Non | `org.postgresql.Driver` | Non | Non |
| `SPRING_JPA_DATABASE_PLATFORM` | `application-prod.yml:8` | Non | `org.hibernate.dialect.PostgreSQLDialect` | Non | Non |
| `JWT_SECRET` | `application.yml:50`, `JwtTokenProvider.java:18` | **Oui** | Aucune | Oui | Oui (`generateValue: true`) |
| `CRYPTO_SECRET` | `application.yml:55`, `CryptoService.java:41` | **Oui** (si `CRYPTO_SECRET_KEY` absent) | Aucune | Oui | Oui (`generateValue: true`) |
| `CRYPTO_SECRET_KEY` | `application.yml:55`, `CryptoService.java:41` | Non (doublon) | `${CRYPTO_SECRET}` | Non | Oui (`sync: false`) |
| `AUDIT_IP_SALT` | `application.yml:57`, `VotingService.java:38` | Non | `${CRYPTO_SECRET_KEY:${CRYPTO_SECRET}}` | Oui | Oui (`generateValue: true`) |
| `ALLOWED_ORIGINS` | `application.yml:46`, `SecurityConfig.java:39` | Recommandé en prod | `http://localhost:4200,http://localhost:8080` | Non | Oui (`sync: false`) |
| `SPRING_MAIL_HOST` | `application.yml:30` | Recommandé en prod (OTP) | `localhost` | Non | Oui (`sync: false`) |
| `SPRING_MAIL_PORT` | `application.yml:31` | Non | `1025` | Non | Oui (`value: "587"`) |
| `SPRING_MAIL_USERNAME` | `application.yml:32`, `OtpEmailService.java:26` | Recommandé en prod | `noreply@voteuasz.sn` | Non | Oui (`sync: false`) |
| `SPRING_MAIL_PASSWORD` | `application.yml:33` | Recommandé en prod | `""` | Non | Oui (`sync: false`) |
| `SPRING_MAIL_SMTP_AUTH` | `application.yml:37` | Non | `false` | Non | Oui (`value: "true"`) |
| `SPRING_MAIL_STARTTLS_ENABLE` | `application.yml:39` | Non | `false` | Non | Oui (`value: "true"`) |
| `APP_MAIL_FROM` | `application.yml:48`, `OtpEmailService.java:26` | Non | `noreply@voteuasz.sn` | Non | Non |
| `DEFAULT_ELECTEUR_PASSWORD` | `application.yml:58`, `UserImportService.java:35` | Recommandé en prod | `CHANGEME_REQUIRED_ELECTEUR_PASSWORD_2026` | Oui | Oui (`sync: false`) |
| `DEFAULT_CANDIDAT_PASSWORD` | `application.yml:59`, `UserImportService.java:38` | Recommandé en prod | `CHANGEME_REQUIRED_CANDIDAT_PASSWORD_2026` | Oui | Oui (`sync: false`) |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Non lues par le code Java (uniquement `docker-compose.yml`) | N/A | N/A | Oui | Non |

---

### 3. Premier compte `SUPER_ADMIN` en production

- [DataInitializer.java](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/java/sn/uasz/vote/config/DataInitializer.java#L31) porte `@Profile("dev")`. En production (`SPRING_PROFILES_ACTIVE=prod`), il est totalement désactivé.
- **Aucun autre mécanisme** n'existe dans le code :
  - Aucun autre `CommandLineRunner` / `ApplicationRunner` dans `backend/src/main/java/sn/uasz/vote/config/`.
  - Aucune migration SQL (ni Flyway, ni Liquibase, ni `data.sql`).
  - Aucun endpoint d'inscription ou d'initialisation dans [AuthController.java](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/java/sn/uasz/vote/controller/AuthController.java).
  - Aucune documentation pour créer le premier `SUPER_ADMIN` en prod dans [README.md](file:///Users/Admin/Desktop/VoteUASZ/README.md).
- **Conséquence** : Au premier déploiement sur Render, la base PostgreSQL sera **vide**. Aucune connexion `SUPER_ADMIN` ne sera possible.
- **Création des comptes `ELECTEUR` / `CANDIDAT` / `COMMISSION_ELECTORALE` en prod** : Uniquement via `POST /api/v1/admin/users/import-csv` ([AdminUserController.java](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/java/sn/uasz/vote/controller/AdminUserController.java#L27)), protégé par `@PreAuthorize("hasRole('SUPER_ADMIN')")` (ligne 20). Sans `SUPER_ADMIN` initial, l'import CSV est lui aussi inaccessible.

---

### 4. CORS

- `ALLOWED_ORIGINS` est bien lue dans [SecurityConfig.java](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/java/sn/uasz/vote/security/SecurityConfig.java#L39-L40) via `@Value("${app.cors.allowed-origins:http://localhost:4200,http://localhost:8080}") private List<String> allowedOrigins;` et appliquée ligne 124 (`configuration.setAllowedOrigins(allowedOrigins)`).
- **Plusieurs origines** : Oui, supportées via une liste séparée par des virgules (`List<String>`).
- **Pas de `"*"` par défaut en prod** : Le défaut est `http://localhost:4200,http://localhost:8080` ([application.yml](file:///Users/Admin/Desktop/VoteUASZ/backend/src/main/resources/application.yml#L46)).

---

### 5. `vercel.json` et WebSocket (`/ws`)

- [vercel.json](file:///Users/Admin/Desktop/VoteUASZ/vercel.json#L6-L9) redirige `/api/(.*)` vers `https://voteuasz-backend.onrender.com/api/$1`. L'URL correspond au nom `voteuasz-backend` de `render.yaml`, mais doit être vérifiée/remplacée par l'URL exacte fournie par Render après création du service.
- **WebSocket (`/ws`)** :
  - [websocket.service.ts](file:///Users/Admin/Desktop/VoteUASZ/frontend/src/app/services/websocket.service.ts#L17) construit l'URL ainsi :
    `const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';`
  - En production sur Vercel, `window.location.host` est le domaine Vercel (et non Render). Or **Vercel ne proxifie pas les connexions WebSocket**. La connexion STOMP vers `wss://<domaine-vercel>/ws` échouera systématiquement. Le frontend doit cibler directement l'URL `wss://<backend-render>/ws`.

---

## 2. Corrections exactes à appliquer (NON appliquées)

### Point 1 — Rate limiting & IP réelle derrière Render

1. **Activer la gestion des en-têtes proxy dans `backend/src/main/resources/application-prod.yml`** (après la ligne 11) :
```yaml
server:
  forward-headers-strategy: native
```
2. **Ne plus faire confiance aveuglément au premier élément de `X-Forwarded-For` dans `backend/src/main/java/sn/uasz/vote/security/RateLimitingFilter.java` (lignes 72-82)** :
Avec `server.forward-headers-strategy: native`, Tomcat/Spring résout automatiquement `request.getRemoteAddr()` depuis l'en-tête du proxy de confiance (Render), ce qui empêche le spoofing client :
```java
    public static String extractClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "unknown";
    }
```
*(Alternative si un fallback manuel est souhaité : prendre la **dernière** IP ajoutée par le proxy Render dans `X-Forwarded-For`, jamais la première `split(",")[0]`.)*

---

### Point 2 — Nettoyage des variables d'environnement

1. **Supprimer le doublon `CRYPTO_SECRET_KEY` dans `render.yaml` (lignes 33-34)** afin d'éviter qu'une variable vide n'écrase `CRYPTO_SECRET` :
Supprimer :
```yaml
      - key: CRYPTO_SECRET_KEY
        sync: false
```
2. **Mettre à jour `.env.example`** (ajouter les variables manquantes si utilisé pour le déploiement ou le test prod local) :
```dotenv
ALLOWED_ORIGINS=http://localhost:4200
SPRING_MAIL_HOST=smtp.example.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=noreply@voteuasz.sn
SPRING_MAIL_PASSWORD=votre_mot_de_passe_smtp
```

---

### Point 3 — Bootstrap du premier `SUPER_ADMIN` en production

Ajouter un `CommandLineRunner` actif en prod (ou un mécanisme idempotent dans un composant dédié, ex. `backend/src/main/java/sn/uasz/vote/config/AdminBootstrapInitializer.java`) qui crée le premier `SUPER_ADMIN` **uniquement s'il n'existe aucun `SUPER_ADMIN` en base** et **uniquement si les variables d'environnement `BOOTSTRAP_ADMIN_MATRICULE`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` sont fournies** (sans mot de passe par défaut codé en dur) :

1. **`backend/src/main/resources/application.yml`** (sous `app:`, après la ligne 59) :
```yaml
  bootstrap-admin:
    matricule: ${BOOTSTRAP_ADMIN_MATRICULE:}
    email: ${BOOTSTRAP_ADMIN_EMAIL:}
    password: ${BOOTSTRAP_ADMIN_PASSWORD:}
```
2. **`render.yaml`** (sous `envVars:`, après la ligne 54) :
```yaml
      - key: BOOTSTRAP_ADMIN_MATRICULE
        sync: false
      - key: BOOTSTRAP_ADMIN_EMAIL
        sync: false
      - key: BOOTSTRAP_ADMIN_PASSWORD
        sync: false
```
3. **`backend/src/main/java/sn/uasz/vote/config/AdminBootstrapInitializer.java`** (nouveau fichier) :
```java
package sn.uasz.vote.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;

@Slf4j
@Component
@Profile("prod")
@RequiredArgsConstructor
public class AdminBootstrapInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.matricule:}")
    private String adminMatricule;

    @Value("${app.bootstrap-admin.email:}")
    private String adminEmail;

    @Value("${app.bootstrap-admin.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (userRepository.existsByRole(Role.SUPER_ADMIN)) {
            return;
        }
        if (adminMatricule.isBlank() || adminEmail.isBlank() || adminPassword.isBlank()) {
            log.warn("Aucun SUPER_ADMIN en base et BOOTSTRAP_ADMIN_* non définis : création ignorée.");
            return;
        }
        userRepository.save(User.builder()
                .matricule(adminMatricule.trim())
                .nom("Admin")
                .prenom("UASZ")
                .email(adminEmail.trim())
                .password(passwordEncoder.encode(adminPassword))
                .role(Role.SUPER_ADMIN)
                .typeElecteur(TypeElecteur.PATS)
                .ufr("ADMINISTRATION")
                .active(true)
                .build());
        log.info("Premier compte SUPER_ADMIN créé ({}).", adminMatricule.trim());
    }
}
```
*(Nécessite `boolean existsByRole(Role role);` dans `UserRepository.java`.)*

---

### Point 5 — URL WebSocket directe vers Render en production

1. **Créer `frontend/src/environments/environment.ts`** (dev) :
```ts
export const environment = {
  production: false,
  wsBaseUrl: '' // utilise window.location.host en dev (proxy Angular)
};
```
2. **Créer `frontend/src/environments/environment.prod.ts`** (prod — remplacer par l'URL réelle Render) :
```ts
export const environment = {
  production: true,
  wsBaseUrl: 'wss://voteuasz-backend.onrender.com'
};
```
3. **Mettre à jour `frontend/src/app/services/websocket.service.ts` (ligne 17)** :
```ts
    const base = environment.wsBaseUrl
      ? environment.wsBaseUrl
      : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
    const wsUrl = `${base}/ws`;
```

---

## 3. À faire à la main avant le déploiement (dans l'ordre)

1. **Appliquer les corrections code/config ci-dessus** (Points 1, 2, 3 et 5) et pousser sur le dépôt Git.
2. **Déployer le Blueprint sur Render** (`New → Blueprint` à partir de `render.yaml`) et noter l'URL publique attribuée au service `voteuasz-backend` (ex. `https://voteuasz-backend-xxxx.onrender.com`).
3. **Configurer les variables `sync: false` sur Render** :
   - `DEFAULT_ELECTEUR_PASSWORD` et `DEFAULT_CANDIDAT_PASSWORD` (mots de passe forts).
   - `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` (fournisseur SMTP réel pour l'envoi des OTP).
   - `BOOTSTRAP_ADMIN_MATRICULE`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (pour créer le premier `SUPER_ADMIN` au démarrage).
   - *(Laisser `ALLOWED_ORIGINS` temporairement ou la mettre à jour à l'étape 5.)*
4. **Mettre à jour les URLs backend dans le frontend** avec l'URL Render obtenue à l'étape 2 :
   - Dans `vercel.json` ligne 8 (`destination`: `https://<votre-backend-render>.onrender.com/api/$1`).
   - Dans `frontend/src/environments/environment.prod.ts` (`wsBaseUrl`: `wss://<votre-backend-render>.onrender.com`).
   - Pousser ce commit sur Git.
5. **Déployer le frontend sur Vercel** et noter l'URL Vercel obtenue (ex. `https://voteuasz.vercel.app`).
6. **Renseigner `ALLOWED_ORIGINS` sur Render** avec l'URL Vercel exacte (ex. `https://voteuasz.vercel.app`) et redémarrer le service Render si nécessaire.
7. **Vérifier après déploiement** :
   - Connexion avec le compte `SUPER_ADMIN` initial.
   - Import CSV d'un jeu de test (`ELECTEUR` / `CANDIDAT`).
   - Réception d'un code OTP par e-mail, vote complet, et mise à jour WebSocket en direct sur la page de résultats.
   - *(Optionnel recommandé)* Supprimer `BOOTSTRAP_ADMIN_PASSWORD` des variables Render une fois le premier `SUPER_ADMIN` créé.

