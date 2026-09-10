package sn.uasz.vote.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.CandidatureDto;
import sn.uasz.vote.service.CandidacyService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/candidacies")
@RequiredArgsConstructor
public class CandidacyController {

    private final CandidacyService candidacyService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CANDIDAT')")
    public ResponseEntity<CandidatureDto> submitCandidacy(@RequestBody CandidatureDto dto, Authentication auth) {
        return ResponseEntity.ok(candidacyService.submitCandidacy(dto, auth.getName()));
    }

    @GetMapping("/election/{electionId}")
    public ResponseEntity<List<CandidatureDto>> getCandidacies(@PathVariable Long electionId) {
        return ResponseEntity.ok(candidacyService.getCandidaciesByElection(electionId));
    }

    @GetMapping("/election/{electionId}/approved")
    public ResponseEntity<List<CandidatureDto>> getApprovedCandidacies(@PathVariable Long electionId) {
        return ResponseEntity.ok(candidacyService.getApprovedCandidaciesByElection(electionId));
    }

    @PutMapping("/{id}/validate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMMISSION_ELECTORALE')")
    public ResponseEntity<CandidatureDto> validateCandidacy(
            @PathVariable Long id,
            @RequestParam boolean approved,
            @RequestParam(required = false) String motifRejet) {
        return ResponseEntity.ok(candidacyService.validateCandidacy(id, approved, motifRejet));
    }
}
