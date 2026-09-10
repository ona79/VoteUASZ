package sn.uasz.vote.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import sn.uasz.vote.enums.CandidacyStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidatureDto {
    private Long id;
    private Long electionId;
    private Long candidatId;
    private String candidatNomComplet;
    private String candidatNom;
    private String candidatPrenom;
    private String candidatMatricule;
    private String nomListe;
    private String photoUrl;
    private String programmePdf;
    private String cvUrl;
    private CandidacyStatus statut;
    private String motifRejet;
}
