package sn.uasz.vote.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    @NotNull(message = "L'identifiant de l'élection est obligatoire.")
    private Long electionId;

    private Long auteurId;
    private String auteurNomComplet;

    @NotBlank(message = "Le sujet de la réclamation est obligatoire.")
    @Size(max = 255, message = "Le sujet ne doit pas dépasser 255 caractères.")
    private String sujet;

    @NotBlank(message = "La description de la réclamation est obligatoire.")
    private String description;

    private ComplaintStatus statut;
    private String reponseCommission;
    private LocalDateTime createdAt;
}
