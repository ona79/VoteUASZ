package sn.uasz.vote.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.dto.LiveResultsDto;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.service.ElectionService;
import sn.uasz.vote.service.PdfReportService;
import sn.uasz.vote.service.VotingService;

import java.io.ByteArrayInputStream;

@RestController
@RequestMapping("/api/v1/results")
@RequiredArgsConstructor
@Tag(name = "Résultats & PV", description = "Consultation des résultats en direct et export PDF du procès-verbal")
public class ResultsController {

    private final VotingService votingService;
    private final PdfReportService pdfReportService;
    private final ElectionService electionService;

    @GetMapping("/{electionId}")
    @Operation(summary = "Obtenir les résultats d'une élection (supervision avant dépouillement, authentifiés ensuite)")
    public ResponseEntity<LiveResultsDto> getLiveResults(@PathVariable Long electionId, Authentication auth) {
        assertResultsAccessible(electionId, auth);
        return ResponseEntity.ok(votingService.getLiveResults(electionId));
    }

    @GetMapping("/{electionId}/export-pdf")
    @Operation(summary = "Télécharger le procès-verbal officiel au format PDF")
    public ResponseEntity<InputStreamResource> exportPdfReport(@PathVariable Long electionId, Authentication auth) {
        assertResultsAccessible(electionId, auth);
        ByteArrayInputStream pdfStream = pdfReportService.generateElectionPdfReport(electionId);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "inline; filename=proces-verbal-election-" + electionId + ".pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(pdfStream));
    }

    private void assertResultsAccessible(Long electionId, Authentication auth) {
        ElectionDto election = electionService.getElectionById(electionId);
        ElectionStatus statut = election.getStatut();
        boolean isPublicPhase = statut == ElectionStatus.DEPOUILLEMENT
                || statut == ElectionStatus.PUBLICATION
                || statut == ElectionStatus.CLOTURE;
        if (isPublicPhase) {
            return;
        }
        boolean isSupervisor = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority())
                        || "ROLE_COMMISSION_ELECTORALE".equals(a.getAuthority()));
        if (!isSupervisor) {
            throw new AccessDeniedException(
                    "Les résultats ne sont accessibles qu'à partir du dépouillement (statut actuel : " + statut + ")."
            );
        }
    }
}
