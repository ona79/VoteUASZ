package sn.uasz.vote.controller;

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
public class ComplaintController {

    private final ComplaintService complaintService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ELECTEUR', 'CANDIDAT')")
    public ResponseEntity<ComplaintDto> submitComplaint(@RequestBody ComplaintDto dto, Authentication auth) {
        return ResponseEntity.ok(complaintService.submitComplaint(dto, auth.getName()));
    }

    @GetMapping("/election/{electionId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMMISSION_ELECTORALE')")
    public ResponseEntity<List<ComplaintDto>> getComplaintsByElection(@PathVariable Long electionId) {
        return ResponseEntity.ok(complaintService.getComplaintsByElection(electionId));
    }

    @GetMapping("/my-complaints")
    public ResponseEntity<List<ComplaintDto>> getMyComplaints(Authentication auth) {
        return ResponseEntity.ok(complaintService.getComplaintsByUser(auth.getName()));
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMMISSION_ELECTORALE')")
    public ResponseEntity<ComplaintDto> resolveComplaint(
            @PathVariable Long id,
            @RequestParam ComplaintStatus status,
            @RequestParam String reponseCommission) {
        return ResponseEntity.ok(complaintService.resolveComplaint(id, status, reponseCommission));
    }
}
