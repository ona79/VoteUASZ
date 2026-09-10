package sn.uasz.vote.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.TypeElection;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElectionDto {
    private Long id;
    private String titre;
    private String description;
    private TypeElection type;
    private ElectionStatus statut;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String targetUfr;
    private String targetFiliere;
    private String targetNiveau;
}
