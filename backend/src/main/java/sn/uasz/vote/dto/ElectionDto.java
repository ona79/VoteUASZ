package sn.uasz.vote.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    @NotBlank(message = "Le titre de l'élection est obligatoire.")
    @Size(max = 255, message = "Le titre ne doit pas dépasser 255 caractères.")
    private String titre;

    private String description;

    @NotNull(message = "Le type d'élection est obligatoire.")
    private TypeElection type;

    private ElectionStatus statut;

    @NotNull(message = "La date de début est obligatoire.")
    private LocalDateTime dateDebut;

    @NotNull(message = "La date de fin est obligatoire.")
    private LocalDateTime dateFin;

    private String targetUfr;
    private String targetFiliere;
    private String targetNiveau;
}
