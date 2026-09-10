package sn.uasz.vote.dto;

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
    private String titre;
    private String contenu;
    private String afficheUrl;
    private String videoEmbedUrl;
    private LocalDateTime createdAt;
}
