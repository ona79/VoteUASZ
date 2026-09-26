package sn.uasz.vote.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.dto.LiveResultsDto;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.ElectionRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ElectionService {

    private final ElectionRepository electionRepository;
    private final ElectionStateMachine stateMachine;
    private final PdfReportService pdfReportService;
    private final SimpMessagingTemplate messagingTemplate;
    private final VotingService votingService;

    public ElectionService(ElectionRepository electionRepository,
                           ElectionStateMachine stateMachine,
                           PdfReportService pdfReportService,
                           SimpMessagingTemplate messagingTemplate,
                           @Lazy VotingService votingService) {
        this.electionRepository = electionRepository;
        this.stateMachine = stateMachine;
        this.pdfReportService = pdfReportService;
        this.messagingTemplate = messagingTemplate;
        this.votingService = votingService;
    }

    @Transactional
    public ElectionDto createElection(ElectionDto dto) {
        Election election = Election.builder()
                .titre(dto.getTitre())
                .description(dto.getDescription())
                .type(dto.getType())
                .statut(ElectionStatus.CONFIGURATION)
                .dateDebut(dto.getDateDebut())
                .dateFin(dto.getDateFin())
                .targetUfr(dto.getTargetUfr())
                .targetFiliere(dto.getTargetFiliere())
                .targetNiveau(dto.getTargetNiveau())
                .build();

        Election saved = electionRepository.save(election);
        return mapToDto(saved);
    }

    @Transactional
    public ElectionDto changeStatus(Long electionId, ElectionStatus nextStatus) {
        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new IllegalArgumentException("Élection non trouvée ID: " + electionId));

        stateMachine.validateTransition(election, nextStatus);
        election.setStatut(nextStatus);
        Election updated = electionRepository.save(election);

        // Diffusion WebSocket en direct lors du changement de statut (dépouillement, publication, etc.)
        try {
            LiveResultsDto liveResults = votingService.getLiveResults(updated.getId());
            messagingTemplate.convertAndSend("/topic/results/" + updated.getId(), liveResults);
        } catch (Exception e) {
            log.warn("[STOMP] Échec de la diffusion WebSocket des résultats pour l'élection #{}: {}", updated.getId(), e.getMessage());
        }

        // Génération automatique du rapport PDF officiel lors de la clôture
        if (nextStatus == ElectionStatus.CLOTURE) {
            try {
                java.io.ByteArrayInputStream pdfStream = pdfReportService.generateElectionPdfReport(updated.getId());
                if (pdfStream != null) {
                    byte[] pdfBytes = pdfStream.readAllBytes();
                    java.nio.file.Path reportsDir = java.nio.file.Paths.get("reports");
                    java.nio.file.Files.createDirectories(reportsDir);
                    java.nio.file.Path pdfFilePath = reportsDir.resolve("pv_election_" + updated.getId() + ".pdf");
                    java.nio.file.Files.write(pdfFilePath, pdfBytes);
                    log.info("[PDF] Procès-Verbal officiel généré et sauvegardé avec succès pour l'élection #{} : {} ({} octets)",
                            updated.getId(), pdfFilePath.toAbsolutePath(), pdfBytes.length);
                }
            } catch (Exception e) {
                // La clôture ne doit pas échouer si le PDF est indisponible — on logge sans bloquer
                log.error("[PDF] Échec de génération du rapport pour l'élection #{}: {}", updated.getId(), e.getMessage());
            }
        }

        return mapToDto(updated);
    }

    public List<ElectionDto> getAllElections() {
        return electionRepository.findAll().stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public ElectionDto getElectionById(Long id) {
        return electionRepository.findById(id).map(this::mapToDto)
                .orElseThrow(() -> new IllegalArgumentException("Élection non trouvée ID: " + id));
    }

    public boolean isUserEligible(User user, Election election) {
        if (user == null || election == null || !user.isActive()) return false;

        return switch (election.getType()) {
            case DELEGUE -> (election.getTargetUfr() == null || election.getTargetUfr().equalsIgnoreCase(user.getUfr())) &&
                            (election.getTargetFiliere() == null || election.getTargetFiliere().equalsIgnoreCase(user.getFiliere())) &&
                            (election.getTargetNiveau() == null || election.getTargetNiveau().equalsIgnoreCase(user.getNiveau()));
            case DUFR -> (election.getTargetUfr() == null || election.getTargetUfr().equalsIgnoreCase(user.getUfr()));
            case VICE_RECTEUR -> true; // Tous les membres actifs de l'UASZ
        };
    }

    public ElectionDto mapToDto(Election election) {
        return ElectionDto.builder()
                .id(election.getId())
                .titre(election.getTitre())
                .description(election.getDescription())
                .type(election.getType())
                .statut(election.getStatut())
                .dateDebut(election.getDateDebut())
                .dateFin(election.getDateFin())
                .targetUfr(election.getTargetUfr())
                .targetFiliere(election.getTargetFiliere())
                .targetNiveau(election.getTargetNiveau())
                .build();
    }
}
