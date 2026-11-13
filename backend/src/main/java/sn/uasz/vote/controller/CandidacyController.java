package sn.uasz.vote.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
@Tag(name = "Candidatures", description = "Dépôt, validation et consultation des dossiers de candidature")
public class CandidacyController {

    private final CandidacyService candidacyService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CANDIDAT')")
    @Operation(summary = "Soumettre une candidature à une élection")
    public ResponseEntity<CandidatureDto> submitCandidacy(@Valid @RequestBody CandidatureDto dto, Authentication auth) {
        return ResponseEntity.ok(candidacyService.submitCandidacy(dto, auth.getName()));
    }

    @GetMapping("/my-candidacies")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CANDIDAT')")
    @Operation(summary = "Lister les candidatures du candidat connecté")
    public ResponseEntity<List<CandidatureDto>> getMyCandidacies(Authentication auth) {
        return ResponseEntity.ok(candidacyService.getCandidaciesByCandidat(auth.getName()));
    }

    @GetMapping("/election/{electionId}")
    @Operation(summary = "Lister les candidatures d'une élection (filtrées selon le rôle)")
    public ResponseEntity<List<CandidatureDto>> getCandidacies(@PathVariable Long electionId, Authentication auth) {
        boolean isPrivileged = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority())
                        || "ROLE_COMMISSION_ELECTORALE".equals(a.getAuthority()));
        String matricule = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(candidacyService.getCandidaciesByElectionForUser(electionId, matricule, isPrivileged));
    }

    @GetMapping("/election/{electionId}/approved")
    @Operation(summary = "Lister uniquement les candidatures approuvées d'une élection")
    public ResponseEntity<List<CandidatureDto>> getApprovedCandidacies(@PathVariable Long electionId) {
        return ResponseEntity.ok(candidacyService.getApprovedCandidaciesByElection(electionId));
    }

    @PutMapping("/{id}/validate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMMISSION_ELECTORALE')")
    @Operation(summary = "Approuver ou rejeter une candidature")
    public ResponseEntity<CandidatureDto> validateCandidacy(
            @PathVariable Long id,
            @RequestParam boolean approved,
            @RequestParam(required = false) String motifRejet) {
        return ResponseEntity.ok(candidacyService.validateCandidacy(id, approved, motifRejet));
    }
}
