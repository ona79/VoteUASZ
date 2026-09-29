# Documentation Technique & Diagrammes UML – VoteUASZ

Ce document contient la spécification graphique et textuelle de l'architecture UML du système **VoteUASZ**.

---

## 1. Diagramme de Cas d'Utilisation (Use Case Diagram)

```mermaid
flowchart LR
    subgraph Acteurs ["👤 Acteurs du Système"]
        SuperAdmin["Super-Admin Électoral"]
        Commission["Commission Électorale"]
        Candidat["Candidat"]
        Electeur["Électeur"]
    end

    subgraph Admin_Space ["⚙️ Gestion Globale"]
        UC1(["Import CSV des Électeurs"])
        UC2(["Configuration des Élections"])
        UC3(["Changement d'État du Scrutin"])
        UC4(["Consultation Audit Cryptographique"])
    end

    subgraph Commission_Space ["🏛️ Commission Électorale"]
        UC5(["Validation / Rejet Candidatures"])
        UC6(["Traitement des Réclamations"])
        UC7(["Supervision du Dépouillement"])
    end

    subgraph Candidat_Space ["📢 Espace Candidat"]
        UC8(["Dépôt Dossier Candidature"])
        UC9(["Publication de Campagne (Texte, Affiche, Vidéo)"])
    end

    subgraph Electeur_Space ["🗳️ Espace Électeur"]
        UC10(["Demande OTP de Vote (5 min)"])
        UC11(["Soumission Bulletin Chiffré"])
        UC12(["Consultation Résultats Live"])
        UC13(["Dépôt de Réclamation"])
    end

    SuperAdmin --> UC1
    SuperAdmin --> UC2
    SuperAdmin --> UC3
    SuperAdmin --> UC4

    Commission --> UC5
    Commission --> UC6
    Commission --> UC7

    Candidat --> UC8
    Candidat --> UC9

    Electeur --> UC10
    Electeur --> UC11
    Electeur --> UC12
    Electeur --> UC13
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
