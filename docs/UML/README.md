# Documentation Technique & Diagrammes UML – VoteUASZ

Ce document contient la spécification graphique et textuelle de l'architecture UML du système **VoteUASZ**.

---

## 1. Diagramme de Cas d'Utilisation (Use Case Diagram)

```mermaid
usecaseDiagram
    actor SuperAdmin as "Super-Admin Électoral"
    actor Commission as "Commission Électorale"
    actor Candidat as "Candidat"
    actor Electeur as "Électeur"

    SuperAdmin --> (Import CSV des Électeurs)
    SuperAdmin --> (Configuration des Élections)
    SuperAdmin --> (Changement d'État du Scrutin)
    SuperAdmin --> (Consultation de l'Audit Cryptographique)

    Commission --> (Validation/Rejet des Candidatures)
    Commission --> (Traitement des Réclamations)
    Commission --> (Supervision du Dépouillement)

    Candidat --> (Dépôt du Dossier de Candidature)
    Candidat --> (Publication de Campagne - Texte, Affiche, Vidéo)

    Electeur --> (Demande OTP de Vote - 5 min)
    Electeur --> (Soumission du Bulletin Chiffré)
    Electeur --> (Consultation des Résultats Live)
    Electeur --> (Dépôt de Réclamation)
```

---

## 2. Diagramme de Séquence du Vote Sécurisé & OTP

```mermaid
sequenceDiagram
    autonumber
    actor E as Électeur
    participant FE as Angular Frontend PWA
    participant BE as Spring Boot API
    participant DB as Base PostgreSQL
    participant WS as WebSocket Live Broker

    E->>FE: Sélectionne le candidat & clique sur "Voter"
    FE->>BE: POST /api/v1/vote/request-otp (electionId)
    BE->>DB: Vérifie éligibilité & émargement anti-double-vote
    BE->>BE: Génère OTP (valide 5 min)
    BE-->>FE: OTP transmis (Email/SMS)

    E->>FE: Saisit le code OTP à 6 chiffres
    FE->>BE: POST /api/v1/vote/verify-otp (otpCode)
    BE->>DB: Invalide l'OTP & crée VoteToken temporaire
    BE-->>FE: Renvoie le VoteToken à usage unique

    FE->>BE: POST /api/v1/vote/submit (VoteToken, candidatureId)
    BE->>BE: Chiffre le vote (AES-256) & calcule le ballotHash
    BE->>DB: Écriture anonyme Ballot (encryptedPayload, hash)
    BE->>DB: Écriture d'émargement VoterAuditLog (userId, timestamp)
    BE->>DB: Invalide le VoteToken
    BE->>WS: Publication résultats à jour sur /topic/results/{id}
    WS-->>FE: Diffusion live direct vers les dashboards
    BE-->>FE: VoteResponseDto (Confirmation + ballotHash)
```
