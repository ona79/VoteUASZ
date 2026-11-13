package sn.uasz.vote.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.CampaignPostDto;
import sn.uasz.vote.service.CampaignService;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Campagne Électorale", description = "Publications (texte, affiche, vidéo) des candidats approuvés")
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping({"/campaigns", "/candidatures/{candidatureId}/posts", "/candidacies/{candidatureId}/posts"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CANDIDAT')")
    @Operation(summary = "Publier ou mettre à jour le message de campagne d'une candidature")
    public ResponseEntity<CampaignPostDto> createPost(
            @PathVariable(required = false) Long candidatureId,
            @Valid @RequestBody CampaignPostDto dto,
            Authentication auth) {
        if (candidatureId != null) {
            dto.setCandidatureId(candidatureId);
        }
        return ResponseEntity.ok(campaignService.createCampaignPost(dto, auth.getName()));
    }

    @GetMapping({"/campaigns/candidature/{candidatureId}", "/candidatures/{candidatureId}/posts", "/candidacies/{candidatureId}/posts"})
    @Operation(summary = "Lister les publications de campagne d'une candidature")
    public ResponseEntity<List<CampaignPostDto>> getPostsByCandidature(@PathVariable Long candidatureId) {
        return ResponseEntity.ok(campaignService.getPostsByCandidature(candidatureId));
    }

    @GetMapping({"/campaigns/election/{electionId}", "/elections/{electionId}/posts"})
    @Operation(summary = "Lister les publications de campagne d'une élection")
    public ResponseEntity<List<CampaignPostDto>> getPostsByElection(@PathVariable Long electionId) {
        return ResponseEntity.ok(campaignService.getPostsByElection(electionId));
    }
}
