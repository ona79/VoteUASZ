package sn.uasz.vote.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sn.uasz.vote.dto.CampaignPostDto;
import sn.uasz.vote.entity.CampaignPost;
import sn.uasz.vote.entity.Candidature;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.repository.CampaignPostRepository;
import sn.uasz.vote.repository.CandidatureRepository;
import sn.uasz.vote.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CampaignService — Règles de publication de campagne")
class CampaignServiceTest {

    @Mock private CampaignPostRepository campaignPostRepository;
    @Mock private CandidatureRepository candidatureRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private CampaignService campaignService;

    @Test
    @DisplayName("Création puis mise à jour d'une publication de campagne pour une candidature approuvée")
    void createAndUpdateCampaignPost_succeedsForApprovedCandidate() {
        User cand = User.builder().id(1L).matricule("CAND01").role(Role.CANDIDAT).build();
        Election election = Election.builder().id(10L).statut(ElectionStatus.CAMPAGNE)
                .dateFin(LocalDateTime.now().plusDays(1)).build();
        Candidature candidature = Candidature.builder().id(5L).candidat(cand).election(election)
                .statut(CandidacyStatus.APPROVED).build();

        when(candidatureRepository.findById(5L)).thenReturn(Optional.of(candidature));
        when(userRepository.findByMatricule("CAND01")).thenReturn(Optional.of(cand));
        when(campaignPostRepository.findByCandidatureId(5L)).thenReturn(List.of());
        when(campaignPostRepository.save(any(CampaignPost.class))).thenAnswer(inv -> {
            CampaignPost p = inv.getArgument(0);
            p.setId(99L);
            return p;
        });

        CampaignPostDto dto = CampaignPostDto.builder().candidatureId(5L).titre("Programme").contenu("Texte").build();
        CampaignPostDto created = campaignService.createCampaignPost(dto, "CAND01");
        assertEquals(99L, created.getId());
        assertEquals("Programme", created.getTitre());
    }

    @Test
    @DisplayName("Refus si candidature non approuvée, non propriétaire ou scrutin en DEPOUILLEMENT")
    void createCampaignPost_rejectsInvalidStates() {
        User cand = User.builder().id(1L).matricule("CAND01").role(Role.CANDIDAT).build();
        User other = User.builder().id(2L).matricule("OTHER").role(Role.CANDIDAT).build();
        Election election = Election.builder().id(10L).statut(ElectionStatus.CAMPAGNE).build();
        Candidature pending = Candidature.builder().id(5L).candidat(cand).election(election)
                .statut(CandidacyStatus.PENDING).build();

        when(candidatureRepository.findById(5L)).thenReturn(Optional.of(pending));
        when(userRepository.findByMatricule("OTHER")).thenReturn(Optional.of(other));
        assertThrows(IllegalArgumentException.class, () ->
                campaignService.createCampaignPost(CampaignPostDto.builder().candidatureId(5L).build(), "OTHER"));

        when(userRepository.findByMatricule("CAND01")).thenReturn(Optional.of(cand));
        assertThrows(IllegalStateException.class, () ->
                campaignService.createCampaignPost(CampaignPostDto.builder().candidatureId(5L).build(), "CAND01"));

        pending.setStatut(CandidacyStatus.APPROVED);
        election.setStatut(ElectionStatus.DEPOUILLEMENT);
        assertThrows(IllegalStateException.class, () ->
                campaignService.createCampaignPost(CampaignPostDto.builder().candidatureId(5L).build(), "CAND01"));
    }
}
