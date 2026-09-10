package sn.uasz.vote.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.CandidatureDto;
import sn.uasz.vote.entity.Candidature;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.CandidatureRepository;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CandidacyService {

    private final CandidatureRepository candidatureRepository;
    private final ElectionRepository electionRepository;
    private final UserRepository userRepository;

    @Transactional
    public CandidatureDto submitCandidacy(CandidatureDto dto, String userMatricule) {
        User candidat = userRepository.findByMatricule(userMatricule)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé: " + userMatricule));

        Election election = electionRepository.findById(dto.getElectionId())
                .orElseThrow(() -> new IllegalArgumentException("Élection non trouvée ID: " + dto.getElectionId()));

        if (election.getStatut() != ElectionStatus.CONFIGURATION && election.getStatut() != ElectionStatus.CAMPAGNE) {
            throw new IllegalStateException("Les candidatures sont fermées pour cette élection.");
        }

        candidatureRepository.findByElectionIdAndCandidatId(election.getId(), candidat.getId())
                .ifPresent(c -> {
                    throw new IllegalStateException("Vous avez déjà soumis une candidature pour cette élection.");
                });

        Candidature candidature = Candidature.builder()
                .election(election)
                .candidat(candidat)
                .nomListe(dto.getNomListe())
                .photoUrl(dto.getPhotoUrl())
                .programmePdf(dto.getProgrammePdf())
                .cvUrl(dto.getCvUrl())
                .statut(CandidacyStatus.PENDING)
                .build();

        Candidature saved = candidatureRepository.save(candidature);
        return mapToDto(saved);
    }

    @Transactional
    public CandidatureDto validateCandidacy(Long id, boolean approved, String motifRejet) {
        Candidature candidature = candidatureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Candidature non trouvée ID: " + id));

        candidature.setStatut(approved ? CandidacyStatus.APPROVED : CandidacyStatus.REJECTED);
        if (!approved && motifRejet != null) {
            candidature.setMotifRejet(motifRejet);
        }

        Candidature updated = candidatureRepository.save(candidature);
        return mapToDto(updated);
    }

    public List<CandidatureDto> getCandidaciesByElection(Long electionId) {
        return candidatureRepository.findByElectionId(electionId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public List<CandidatureDto> getApprovedCandidaciesByElection(Long electionId) {
        return candidatureRepository.findByElectionIdAndStatut(electionId, CandidacyStatus.APPROVED)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public CandidatureDto mapToDto(Candidature c) {
        return CandidatureDto.builder()
                .id(c.getId())
                .electionId(c.getElection().getId())
                .candidatId(c.getCandidat() != null ? c.getCandidat().getId() : null)
                .candidatNomComplet(c.getCandidat() != null ? (c.getCandidat().getPrenom() + " " + c.getCandidat().getNom()) : null)
                .candidatNom(c.getCandidat() != null ? c.getCandidat().getNom() : null)
                .candidatPrenom(c.getCandidat() != null ? c.getCandidat().getPrenom() : null)
                .candidatMatricule(c.getCandidat() != null ? c.getCandidat().getMatricule() : null)
                .nomListe(c.getNomListe())
                .photoUrl(c.getPhotoUrl())
                .programmePdf(c.getProgrammePdf())
                .cvUrl(c.getCvUrl())
                .statut(c.getStatut())
                .motifRejet(c.getMotifRejet())
                .build();
    }
}
