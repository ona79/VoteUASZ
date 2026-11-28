package sn.uasz.vote.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sn.uasz.vote.dto.LiveResultsDto;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.ElectionRepository;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PdfReportService — Libellés provisoires vs définitifs")
class PdfReportServiceTest {

    @Mock
    private VotingService votingService;

    @Mock
    private ElectionRepository electionRepository;

    @InjectMocks
    private PdfReportService pdfReportService;

    @Test
    @DisplayName("Statut CLOTURE : mention Définitif et Certifié sans 'inaltérable'")
    void resolvePvLabels_cloture_returnsOfficialWithoutInalterable() {
        PdfReportService.PvLabels labels = pdfReportService.resolvePvLabels(ElectionStatus.CLOTURE);

        assertEquals("Statut du PV : Définitif et Certifié", labels.statusLabel());
        assertEquals(
                "Ce document est un Procès-Verbal officiel certifié conforme, généré automatiquement par la plateforme sécurisée VoteUASZ à la clôture du scrutin.",
                labels.certificationText()
        );
        assertFalse(labels.certificationText().contains("inaltérable"));
    }

    @Test
    @DisplayName("Statut non CLOTURE : mention PROVISOIRE sans phrase de clôture")
    void resolvePvLabels_nonCloture_returnsProvisionalLabels() {
        for (ElectionStatus status : new ElectionStatus[]{
                ElectionStatus.CONFIGURATION,
                ElectionStatus.CAMPAGNE,
                ElectionStatus.VOTE_OUVERT,
                ElectionStatus.DEPOUILLEMENT,
                ElectionStatus.PUBLICATION
        }) {
            PdfReportService.PvLabels labels = pdfReportService.resolvePvLabels(status);
            assertEquals("Statut du PV : PROVISOIRE (scrutin non clôturé)", labels.statusLabel());
            assertEquals(
                    "Document provisoire, généré avant la clôture du scrutin. Il ne constitue pas le procès-verbal officiel.",
                    labels.certificationText()
            );
            assertFalse(labels.certificationText().contains("plateforme sécurisée VoteUASZ à la clôture du scrutin"));
        }
    }

    @Test
    @DisplayName("generateElectionPdfReport génère un PDF valide pour PUBLICATION et CLOTURE")
    void generateElectionPdfReport_generatesValidPdfForBothStatuses() {
        LiveResultsDto results = LiveResultsDto.builder()
                .electionId(1L)
                .electionTitre("Scrutin Test PDF")
                .totalVotes(10L)
                .candidateResults(List.of(
                        LiveResultsDto.CandidatureResultDto.builder()
                                .candidatureId(100L)
                                .nomCandidat("Awa Ndiaye")
                                .voteCount(10L)
                                .percentage(100.0)
                                .build()
                ))
                .build();

        when(votingService.getLiveResults(1L)).thenReturn(results);
        when(electionRepository.findById(1L))
                .thenReturn(Optional.of(Election.builder().id(1L).statut(ElectionStatus.PUBLICATION).build()))
                .thenReturn(Optional.of(Election.builder().id(1L).statut(ElectionStatus.CLOTURE).build()));

        ByteArrayInputStream provisionalPdf = pdfReportService.generateElectionPdfReport(1L);
        byte[] provBytes = provisionalPdf.readAllBytes();
        assertTrue(provBytes.length > 0);
        assertTrue(new String(provBytes, 0, 5, StandardCharsets.US_ASCII).startsWith("%PDF-"));

        ByteArrayInputStream finalPdf = pdfReportService.generateElectionPdfReport(1L);
        byte[] finalBytes = finalPdf.readAllBytes();
        assertTrue(finalBytes.length > 0);
        String finalContent = new String(finalBytes, StandardCharsets.ISO_8859_1);
        assertTrue(finalContent.startsWith("%PDF-"));
        assertTrue(finalContent.contains("/ByteRange"), "Le PDF doit contenir une signature cryptographique /ByteRange");
        assertTrue(finalContent.contains("VoteUASZ_PV_Sig"), "Le PDF doit contenir le champ de signature VoteUASZ_PV_Sig");
    }
}
