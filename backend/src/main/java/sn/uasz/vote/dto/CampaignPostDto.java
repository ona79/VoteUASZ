package sn.uasz.vote.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignPostDto {
    private Long id;
    private Long candidatureId;

    @NotBlank(message = "Le titre de la publication est obligatoire.")
    @Size(max = 255, message = "Le titre ne doit pas dépasser 255 caractères.")
    private String titre;

    @NotBlank(message = "Le contenu de la publication est obligatoire.")
    private String contenu;

    @Pattern(regexp = "^($|https?://.+)", message = "L'URL de l'affiche doit commencer par http:// ou https://")
    private String afficheUrl;

    @Pattern(regexp = "^($|https?://.+)", message = "L'URL de la vidéo doit commencer par http:// ou https://")
    private String videoEmbedUrl;

    private LocalDateTime createdAt;
}
