package sn.uasz.vote.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.ElectionRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ElectionService {

    private final ElectionRepository electionRepository;
    private final ElectionStateMachine stateMachine;
    private final @Lazy PdfReportService pdfReportService;

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

        // Génération automatique du rapport PDF officiel lors de la clôture
        if (nextStatus == ElectionStatus.CLOTURE) {
            try {
                java.io.ByteArrayInputStream pdfStream = pdfReportService.generateElectionPdfReport(updated.getId());
                log.info("[PDF] Rapport officiel généré automatiquement à la clôture de l'élection #{} ({} octets)",
                        updated.getId(), pdfStream != null ? pdfStream.available() : 0);
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
