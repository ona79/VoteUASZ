package sn.uasz.vote.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.ComplaintDto;
import sn.uasz.vote.enums.ComplaintStatus;
import sn.uasz.vote.service.ComplaintService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/complaints")
@RequiredArgsConstructor
@Tag(name = "Réclamations", description = "Dépôt et traitement des contestations post-électorales")
public class ComplaintController {

    private final ComplaintService complaintService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ELECTEUR', 'CANDIDAT')")
    @Operation(summary = "Déposer une réclamation (uniquement en PUBLICATION/CLOTURE dans les 48h)")
    public ResponseEntity<ComplaintDto> submitComplaint(@Valid @RequestBody ComplaintDto dto, Authentication auth) {
        return ResponseEntity.ok(complaintService.submitComplaint(dto, auth.getName()));
    }

    @GetMapping("/election/{electionId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMMISSION_ELECTORALE')")
    @Operation(summary = "Lister les réclamations d'une élection")
    public ResponseEntity<List<ComplaintDto>> getComplaintsByElection(@PathVariable Long electionId) {
        return ResponseEntity.ok(complaintService.getComplaintsByElection(electionId));
    }

    @GetMapping("/my-complaints")
    @Operation(summary = "Lister mes réclamations")
    public ResponseEntity<List<ComplaintDto>> getMyComplaints(Authentication auth) {
        return ResponseEntity.ok(complaintService.getComplaintsByUser(auth.getName()));
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMMISSION_ELECTORALE')")
    @Operation(summary = "Traiter et répondre à une réclamation")
    public ResponseEntity<ComplaintDto> resolveComplaint(
            @PathVariable Long id,
            @RequestParam ComplaintStatus status,
            @RequestParam String reponseCommission) {
        return ResponseEntity.ok(complaintService.resolveComplaint(id, status, reponseCommission));
    }
}
