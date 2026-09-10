package sn.uasz.vote.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.service.AuditService;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMMISSION_ELECTORALE')")
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/{electionId}")
    public ResponseEntity<AuditService.AuditReportDto> getAuditReport(@PathVariable Long electionId) {
        return ResponseEntity.ok(auditService.getAuditReport(electionId));
    }
}
