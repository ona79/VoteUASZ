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
@RequestMapping("/api/v1/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CANDIDAT')")
    public ResponseEntity<CampaignPostDto> createPost(@RequestBody CampaignPostDto dto, Authentication auth) {
        return ResponseEntity.ok(campaignService.createCampaignPost(dto, auth.getName()));
    }

    @GetMapping("/candidature/{candidatureId}")
    public ResponseEntity<List<CampaignPostDto>> getPostsByCandidature(@PathVariable Long candidatureId) {
        return ResponseEntity.ok(campaignService.getPostsByCandidature(candidatureId));
    }

    @GetMapping("/election/{electionId}")
    public ResponseEntity<List<CampaignPostDto>> getPostsByElection(@PathVariable Long electionId) {
        return ResponseEntity.ok(campaignService.getPostsByElection(electionId));
    }
}
