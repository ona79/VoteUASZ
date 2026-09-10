package sn.uasz.vote.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.CampaignPostDto;
import sn.uasz.vote.entity.CampaignPost;
import sn.uasz.vote.entity.Candidature;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.CampaignPostRepository;
import sn.uasz.vote.repository.CandidatureRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignPostRepository campaignPostRepository;
    private final CandidatureRepository candidatureRepository;

    @Transactional
    public CampaignPostDto createCampaignPost(CampaignPostDto dto, String candidatMatricule) {
        Candidature candidature = candidatureRepository.findById(dto.getCandidatureId())
                .orElseThrow(() -> new IllegalArgumentException("Candidature non trouvée ID: " + dto.getCandidatureId()));

        if (!candidature.getCandidat().getMatricule().equals(candidatMatricule)) {
            throw new IllegalArgumentException("Seul le candidat titulaire peut publier sur cet espace de campagne.");
        }

        if (candidature.getStatut() != CandidacyStatus.APPROVED) {
            throw new IllegalStateException("Seules les candidatures approuvées peuvent publier du contenu de campagne.");
        }

        if (candidature.getElection().getStatut() != ElectionStatus.CAMPAGNE) {
            throw new IllegalStateException("La période de campagne officielle n'est pas ouverte.");
        }

        CampaignPost post = CampaignPost.builder()
                .candidature(candidature)
                .titre(dto.getTitre())
                .contenu(dto.getContenu())
                .afficheUrl(dto.getAfficheUrl())
                .videoEmbedUrl(dto.getVideoEmbedUrl())
                .build();

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
