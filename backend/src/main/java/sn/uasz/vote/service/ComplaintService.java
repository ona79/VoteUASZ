package sn.uasz.vote.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.ComplaintDto;
import sn.uasz.vote.entity.Complaint;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.ComplaintStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.ComplaintRepository;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service de gestion des réclamations électorales.
 * <p>
 * Règle métier : une réclamation ne peut être déposée que dans les 48 heures
 * suivant la clôture officielle du scrutin (transition → CLOTURE).
 */
@Service
@RequiredArgsConstructor
public class ComplaintService {

    /** Délai légal de contestation après clôture du scrutin (en heures). */
    private static final long DELAI_LEGAL_HEURES = 48L;

    private final ComplaintRepository complaintRepository;
    private final ElectionRepository electionRepository;
    private final UserRepository userRepository;

    @Transactional
    public ComplaintDto submitComplaint(ComplaintDto dto, String userMatricule) {
        User auteur = userRepository.findByMatricule(userMatricule)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé: " + userMatricule));

        Election election = electionRepository.findById(dto.getElectionId())
                .orElseThrow(() -> new IllegalArgumentException("Élection non trouvée: " + dto.getElectionId()));

        // ── Vérification du délai légal de contestation ───────────────────────
        // Si l'élection est clôturée et que dateFin + 48h est dépassé, on refuse
        if (election.getStatut() == ElectionStatus.CLOTURE && election.getDateFin() != null) {
            LocalDateTime deadlineContestatiion = election.getDateFin().plusHours(DELAI_LEGAL_HEURES);
            if (LocalDateTime.now().isAfter(deadlineContestatiion)) {
                throw new IllegalStateException(
                        "Le délai légal de réclamation est expiré. Les contestations sont acceptées "
                        + "jusqu'à " + DELAI_LEGAL_HEURES + "h après la clôture du scrutin (avant le "
                        + deadlineContestatiion.toLocalDate() + ")."
                );
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        Complaint complaint = Complaint.builder()
                .election(election)
                .auteur(auteur)
                .sujet(dto.getSujet())
                .description(dto.getDescription())
                .statut(ComplaintStatus.PENDING)
                .build();

        Complaint saved = complaintRepository.save(complaint);
        return mapToDto(saved);
    }


    @Transactional
    public ComplaintDto resolveComplaint(Long complaintId, ComplaintStatus newStatus, String reponseCommission) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Réclamation non trouvée ID: " + complaintId));

        complaint.setStatut(newStatus);
        complaint.setReponseCommission(reponseCommission);

        Complaint updated = complaintRepository.save(complaint);
        return mapToDto(updated);
    }

    public List<ComplaintDto> getComplaintsByElection(Long electionId) {
        return complaintRepository.findByElectionId(electionId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public List<ComplaintDto> getComplaintsByUser(String userMatricule) {
        User auteur = userRepository.findByMatricule(userMatricule)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé: " + userMatricule));

        return complaintRepository.findByAuteurId(auteur.getId())
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private ComplaintDto mapToDto(Complaint c) {
        return ComplaintDto.builder()
                .id(c.getId())
                .electionId(c.getElection().getId())
                .auteurId(c.getAuteur().getId())
                .auteurNomComplet(c.getAuteur().getPrenom() + " " + c.getAuteur().getNom())
                .sujet(c.getSujet())
                .description(c.getDescription())
                .statut(c.getStatut())
                .reponseCommission(c.getReponseCommission())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
