package sn.uasz.vote.controller;

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
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping({"/campaigns", "/candidatures/{candidatureId}/posts", "/candidacies/{candidatureId}/posts"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CANDIDAT')")
    public ResponseEntity<CampaignPostDto> createPost(
            @PathVariable(required = false) Long candidatureId,
            @RequestBody CampaignPostDto dto,
            Authentication auth) {
        if (candidatureId != null) {
            dto.setCandidatureId(candidatureId);
        }
        return ResponseEntity.ok(campaignService.createCampaignPost(dto, auth.getName()));
    }

    @GetMapping({"/campaigns/candidature/{candidatureId}", "/candidatures/{candidatureId}/posts", "/candidacies/{candidatureId}/posts"})
    public ResponseEntity<List<CampaignPostDto>> getPostsByCandidature(@PathVariable Long candidatureId) {
        return ResponseEntity.ok(campaignService.getPostsByCandidature(candidatureId));
    }

    @GetMapping({"/campaigns/election/{electionId}", "/elections/{electionId}/posts"})
    public ResponseEntity<List<CampaignPostDto>> getPostsByElection(@PathVariable Long electionId) {
        return ResponseEntity.ok(campaignService.getPostsByElection(electionId));
    }
}
