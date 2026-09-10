package sn.uasz.vote.entity;

import jakarta.persistence.*;
import lombok.*;
import sn.uasz.vote.enums.CandidacyStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "candidatures")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", nullable = false)
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User candidat;

    @Column(name = "nom_liste", nullable = false)
    private String nomListe;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "programme_pdf")
    private String programmePdf;

    @Column(name = "cv_url")
    private String cvUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CandidacyStatus statut;

    @Column(name = "motif_rejet")
    private String motifRejet;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.statut == null) {
            this.statut = CandidacyStatus.PENDING;
        }
    }
}
