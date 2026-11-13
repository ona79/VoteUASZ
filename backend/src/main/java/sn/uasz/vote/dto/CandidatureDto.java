package sn.uasz.vote.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ElectionStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidatureDto {
    private Long id;

    @NotNull(message = "L'identifiant de l'élection est obligatoire.")
    private Long electionId;

    private ElectionStatus electionStatut;
    private String electionTitre;
    private Long candidatId;
    private String candidatNomComplet;
    private String candidatNom;
    private String candidatPrenom;
    private String candidatMatricule;
    private String nomListe;

    @Pattern(regexp = "^($|https?://.+)", message = "L'URL de la photo doit commencer par http:// ou https://")
    private String photoUrl;

    @Pattern(regexp = "^($|https?://.+)", message = "L'URL du programme PDF doit commencer par http:// ou https://")
    private String programmePdf;

    @Pattern(regexp = "^($|https?://.+)", message = "L'URL du CV doit commencer par http:// ou https://")
    private String cvUrl;

    private CandidacyStatus statut;
    private String motifRejet;
    private java.util.List<CampaignPostDto> posts;
}
