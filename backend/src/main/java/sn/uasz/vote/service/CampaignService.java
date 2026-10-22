package sn.uasz.vote.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.CampaignPostDto;
import sn.uasz.vote.entity.CampaignPost;
import sn.uasz.vote.entity.Candidature;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.repository.CampaignPostRepository;
import sn.uasz.vote.repository.CandidatureRepository;
import sn.uasz.vote.repository.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignPostRepository campaignPostRepository;
    private final CandidatureRepository candidatureRepository;
    private final UserRepository userRepository;

    @Transactional
    public CampaignPostDto createCampaignPost(CampaignPostDto dto, String candidatMatricule) {
        Candidature candidature = candidatureRepository.findById(dto.getCandidatureId())
                .orElseThrow(() -> new IllegalArgumentException("Candidature non trouvée ID: " + dto.getCandidatureId()));

        boolean isOwner = candidature.getCandidat().getMatricule().equals(candidatMatricule);
        boolean isSuperAdmin = userRepository.findByMatricule(candidatMatricule)
                .map(u -> u.getRole() == Role.SUPER_ADMIN)
                .orElse(false);

        if (!isOwner && !isSuperAdmin) {
            throw new IllegalArgumentException("Seul le candidat titulaire ou un administrateur peut publier sur cet espace de campagne.");
        }

        if (candidature.getStatut() != CandidacyStatus.APPROVED) {
            throw new IllegalStateException("Seules les candidatures approuvées peuvent publier du contenu de campagne.");
        }

        ElectionStatus electionStatus = candidature.getElection().getStatut();
        if (electionStatus == ElectionStatus.DEPOUILLEMENT
                || electionStatus == ElectionStatus.PUBLICATION
                || electionStatus == ElectionStatus.CLOTURE) {
            throw new IllegalStateException("Le scrutin est clôturé (statut : " + electionStatus + "). La publication ou modification de contenu de campagne n'est plus autorisée.");
        }

        if (candidature.getElection().getDateFin() != null && java.time.LocalDateTime.now().isAfter(candidature.getElection().getDateFin())) {
            throw new IllegalStateException("La date limite de ce scrutin est dépassée. Les publications de campagne sont closes.");
        }

        Optional<CampaignPost> existingOpt = campaignPostRepository.findByCandidatureId(candidature.getId()).stream().findFirst();
        CampaignPost post;
        if (existingOpt.isPresent()) {
            post = existingOpt.get();
            post.setTitre(dto.getTitre());
            post.setContenu(dto.getContenu());
            post.setAfficheUrl(dto.getAfficheUrl());
            post.setVideoEmbedUrl(dto.getVideoEmbedUrl());
        } else {
            post = CampaignPost.builder()
                    .candidature(candidature)
                    .titre(dto.getTitre())
                    .contenu(dto.getContenu())
                    .afficheUrl(dto.getAfficheUrl())
                    .videoEmbedUrl(dto.getVideoEmbedUrl())
                    .build();
        }

        CampaignPost saved = campaignPostRepository.save(post);
        return mapToDto(saved);
    }

    public List<CampaignPostDto> getPostsByCandidature(Long candidatureId) {
        return campaignPostRepository.findByCandidatureId(candidatureId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public List<CampaignPostDto> getPostsByElection(Long electionId) {
        return campaignPostRepository.findByCandidatureElectionId(electionId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private CampaignPostDto mapToDto(CampaignPost p) {
        return CampaignPostDto.builder()
                .id(p.getId())
                .candidatureId(p.getCandidature().getId())
                .titre(p.getTitre())
                .contenu(p.getContenu())
                .afficheUrl(p.getAfficheUrl())
                .videoEmbedUrl(p.getVideoEmbedUrl())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
