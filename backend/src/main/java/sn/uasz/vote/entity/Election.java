package sn.uasz.vote.entity;

import jakarta.persistence.*;
import lombok.*;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.TypeElection;

import java.time.LocalDateTime;

@Entity
@Table(name = "elections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Election {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeElection type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ElectionStatus statut;

    @Column(name = "date_debut", nullable = false)
    private LocalDateTime dateDebut;

    @Column(name = "date_fin", nullable = false)
    private LocalDateTime dateFin;

    private String targetUfr;

    private String targetFiliere;

    private String targetNiveau;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.statut == null) {
            this.statut = ElectionStatus.CONFIGURATION;
        }
    }
}
