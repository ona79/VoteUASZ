package sn.uasz.vote.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sn.uasz.vote.dto.CandidatureDto;
import sn.uasz.vote.entity.Candidature;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.CampaignPostRepository;
import sn.uasz.vote.repository.CandidatureRepository;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.repository.UserRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CandidacyService — Dépôt, validation et filtrage")
class CandidacyServiceTest {

    @Mock private CandidatureRepository candidatureRepository;
    @Mock private ElectionRepository electionRepository;
    @Mock private UserRepository userRepository;
    @Mock private CampaignPostRepository campaignPostRepository;

    @InjectMocks
    private CandidacyService candidacyService;

    @Test
    @DisplayName("Soumission refusée si scrutin déjà ouvert au vote ou candidature en double")
    void submitCandidacy_rejectsClosedPhaseOrDuplicate() {
        User cand = User.builder().id(1L).matricule("C01").prenom("Awa").nom("Ndiaye").build();
        Election closed = Election.builder().id(10L).statut(ElectionStatus.VOTE_OUVERT).build();

        when(userRepository.findByMatricule("C01")).thenReturn(Optional.of(cand));
        when(electionRepository.findById(10L)).thenReturn(Optional.of(closed));
        assertThrows(IllegalStateException.class, () ->
                candidacyService.submitCandidacy(CandidatureDto.builder().electionId(10L).build(), "C01"));

        closed.setStatut(ElectionStatus.CONFIGURATION);
        when(candidatureRepository.findByElectionIdAndCandidatId(10L, 1L))
                .thenReturn(Optional.of(new Candidature()));
        assertThrows(IllegalStateException.class, () ->
                candidacyService.submitCandidacy(CandidatureDto.builder().electionId(10L).build(), "C01"));
    }

    @Test
    @DisplayName("Validation/rejet motivé et filtrage par utilisateur")
    void validateAndFilterCandidacies_workAsExpected() {
        User cand1 = User.builder().id(1L).matricule("C01").prenom("Awa").nom("Ndiaye").build();
        User cand2 = User.builder().id(2L).matricule("C02").prenom("Moussa").nom("Fall").build();
        Election election = Election.builder().id(10L).statut(ElectionStatus.CAMPAGNE).build();

        Candidature approved = Candidature.builder().id(100L).election(election).candidat(cand1)
                .nomListe("Awa Ndiaye").statut(CandidacyStatus.APPROVED).build();
        Candidature rejected = Candidature.builder().id(101L).election(election).candidat(cand2)
                .nomListe("Moussa Fall").statut(CandidacyStatus.REJECTED).motifRejet("Incomplet").build();

        when(candidatureRepository.findById(101L)).thenReturn(Optional.of(rejected));
        when(candidatureRepository.save(any(Candidature.class))).thenAnswer(inv -> inv.getArgument(0));
        CandidatureDto res = candidacyService.validateCandidacy(101L, false, "Dossier incomplet");
        assertEquals(CandidacyStatus.REJECTED, res.getStatut());
        assertEquals("Dossier incomplet", res.getMotifRejet());

        when(candidatureRepository.findByElectionId(10L)).thenReturn(List.of(approved, rejected));
        when(campaignPostRepository.findByCandidatureId(any())).thenReturn(List.of());

        List<CandidatureDto> allForAdmin = candidacyService.getCandidaciesByElectionForUser(10L, "ADM", true);
        assertEquals(2, allForAdmin.size());

        List<CandidatureDto> forCand2 = candidacyService.getCandidaciesByElectionForUser(10L, "C02", false);
        assertEquals(2, forCand2.size());

        List<CandidatureDto> forOther = candidacyService.getCandidaciesByElectionForUser(10L, "OTHER", false);
        assertEquals(1, forOther.size());
        assertEquals(100L, forOther.get(0).getId());
    }
}
