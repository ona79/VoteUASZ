package sn.uasz.vote.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.LiveResultsDto;
import sn.uasz.vote.service.PdfReportService;
import sn.uasz.vote.service.VotingService;

import java.io.ByteArrayInputStream;

@RestController
@RequestMapping("/api/v1/results")
@RequiredArgsConstructor
public class ResultsController {

    private final VotingService votingService;
    private final PdfReportService pdfReportService;

    @GetMapping("/{electionId}")
    public ResponseEntity<LiveResultsDto> getLiveResults(@PathVariable Long electionId) {
        return ResponseEntity.ok(votingService.getLiveResults(electionId));
    }

    @GetMapping("/{electionId}/export-pdf")
    public ResponseEntity<InputStreamResource> exportPdfReport(@PathVariable Long electionId) {
        ByteArrayInputStream pdfStream = pdfReportService.generateElectionPdfReport(electionId);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "inline; filename=proces-verbal-election-" + electionId + ".pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(pdfStream));
    }
}
