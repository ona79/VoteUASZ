package sn.uasz.vote.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import sn.uasz.vote.enums.ComplaintStatus;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintDto {
    private Long id;
    private Long electionId;
    private Long auteurId;
    private String auteurNomComplet;
    private String sujet;
    private String description;
    private ComplaintStatus statut;
    private String reponseCommission;
    private LocalDateTime createdAt;
}
