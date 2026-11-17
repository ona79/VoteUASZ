package sn.uasz.vote;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.CandidatureDto;
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.entity.Ballot;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.enums.TypeElection;
import sn.uasz.vote.repository.BallotRepository;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.*;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class BallotHashChainTest {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ElectionService electionService;
    @Autowired private CandidacyService candidacyService;
    @Autowired private VotingService votingService;
    @Autowired private AuditService auditService;
    @Autowired private BallotRepository ballotRepository;

    @MockBean private OtpEmailService otpEmailService;

    @Test
    @DisplayName("Chaînage de hash : GENESIS -> bulletin 1 -> bulletin 2 et détection d'altération")
    void ballotChain_isLinkedAndTamperEvident() {
        User cand = userRepository.save(User.builder()
                .matricule("CHAIN_CAND").nom("Diop").prenom("Moussa").email("chain_cand@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.CANDIDAT)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFO").niveau("L3").build());
        User elec1 = userRepository.save(User.builder()
                .matricule("CHAIN_E1").nom("Fall").prenom("Awa").email("chain_e1@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFO").niveau("L3").build());
        User elec2 = userRepository.save(User.builder()
                .matricule("CHAIN_E2").nom("Ndiaye").prenom("Ibrahima").email("chain_e2@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFO").niveau("L3").build());

        ElectionDto election = electionService.createElection(ElectionDto.builder()
                .titre("Scrutin Chaînage").description("Test").type(TypeElection.DELEGUE)
                .targetUfr("UFR_SAT").targetFiliere("INFO").targetNiveau("L3")
                .dateDebut(LocalDateTime.now().minusHours(1))
                .dateFin(LocalDateTime.now().plusHours(4)).build());
        CandidatureDto c = candidacyService.submitCandidacy(
                CandidatureDto.builder().electionId(election.getId()).build(), cand.getMatricule());
        candidacyService.validateCandidacy(c.getId(), true, null);
        electionService.changeStatus(election.getId(), ElectionStatus.CAMPAGNE);
        electionService.changeStatus(election.getId(), ElectionStatus.VOTE_OUVERT);

        // Vote 1
        ArgumentCaptor<String> otp1 = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq(elec1.getEmail()), otp1.capture(), anyString());
        votingService.requestOtp(elec1.getMatricule(), election.getId());
        String tok1 = votingService.verifyOtpAndGenerateToken(elec1.getMatricule(), election.getId(), otp1.getValue());
        votingService.submitVote(tok1, election.getId(), c.getId(), "198.51.100.1");

        // Vote 2
        ArgumentCaptor<String> otp2 = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq(elec2.getEmail()), otp2.capture(), anyString());
        votingService.requestOtp(elec2.getMatricule(), election.getId());
        String tok2 = votingService.verifyOtpAndGenerateToken(elec2.getMatricule(), election.getId(), otp2.getValue());
        votingService.submitVote(tok2, election.getId(), c.getId(), "198.51.100.2");

        List<Ballot> ballots = ballotRepository.findByElectionIdOrderBySequenceNumberAsc(election.getId());
        assertEquals(2, ballots.size());
        assertEquals(1L, ballots.get(0).getSequenceNumber());
        assertEquals("GENESIS", ballots.get(0).getPreviousHash());
        assertEquals(2L, ballots.get(1).getSequenceNumber());
        assertEquals(ballots.get(0).getBallotHash(), ballots.get(1).getPreviousHash());

        AuditService.AuditReportDto report = auditService.getAuditReport(election.getId());
        assertTrue(report.isChainValid());
        assertEquals(2, report.getBallotChain().size());

        // Simulation d'altération d'un bulletin
        ballots.get(0).setEncryptedPayload("TAMPERED_PAYLOAD");
        assertFalse(auditService.verifyBallotChain(ballots));
    }
}
