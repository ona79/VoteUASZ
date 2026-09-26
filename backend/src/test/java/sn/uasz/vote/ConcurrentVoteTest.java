package sn.uasz.vote;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import sn.uasz.vote.dto.*;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.*;
import sn.uasz.vote.repository.*;
import sn.uasz.vote.service.*;

import java.time.LocalDateTime;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
public class ConcurrentVoteTest {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ElectionService electionService;
    @Autowired private CandidacyService candidacyService;
    @Autowired private VotingService votingService;
    @Autowired private BallotRepository ballotRepository;
    @Autowired private VoterAuditLogRepository voterAuditLogRepository;
    @Autowired private ElectionRepository electionRepository;
    @Autowired private CandidatureRepository candidatureRepository;
    @Autowired private VoteTokenRepository voteTokenRepository;
    @Autowired private VoteOTPRepository voteOTPRepository;

    @MockBean private OtpEmailService otpEmailService;

    private User candidateUser;
    private User elector;
    private ElectionDto election;
    private CandidatureDto candidacy;

    @BeforeEach
    void setUp() {
        voterAuditLogRepository.deleteAll();
        ballotRepository.deleteAll();
        voteTokenRepository.deleteAll();
        voteOTPRepository.deleteAll();

        candidateUser = userRepository.save(User.builder()
                .matricule("CAND_CONC_01")
                .nom("Diallo")
                .prenom("Amadou")
                .email("candidate_conc@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.CANDIDAT)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFORMATIQUE")
                .niveau("L3")
                .build());

        elector = userRepository.save(User.builder()
                .matricule("ELECT_CONC_01")
                .nom("Sow")
                .prenom("Mariama")
                .email("mariama_conc@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFORMATIQUE")
                .niveau("L3")
                .build());

        election = electionService.createElection(ElectionDto.builder()
                .titre("Élection Test Concurrence")
                .description("Test de concurrence anti-double-vote")
                .type(TypeElection.DELEGUE)
                .targetUfr("UFR_SAT")
                .targetFiliere("INFORMATIQUE")
                .targetNiveau("L3")
                .dateDebut(LocalDateTime.now().minusHours(1))
                .dateFin(LocalDateTime.now().plusHours(5))
                .build());

        CandidatureDto candidacyReq = CandidatureDto.builder()
                .electionId(election.getId())
                .nomListe("Liste Test Concurrence")
                .build();
        CandidatureDto submitted = candidacyService.submitCandidacy(candidacyReq, candidateUser.getMatricule());
        candidacy = candidacyService.validateCandidacy(submitted.getId(), true, null);

        electionService.changeStatus(election.getId(), ElectionStatus.CAMPAGNE);
        election = electionService.changeStatus(election.getId(), ElectionStatus.VOTE_OUVERT);
    }

    @Test
    @DisplayName("Deux requêtes submitVote() simultanées pour le même électeur — Le rollback doit empêcher tout bulletin fantôme")
    void testConcurrentSubmissions_RollbackPreventsOrphanBallots() throws Exception {
        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq(elector.getEmail()), otpCaptor.capture(), anyString());

        // Générer 2 jetons distincts pour le même électeur (simulation de double clic/requêtes parallèles)
        votingService.requestOtp(elector.getMatricule(), election.getId());
        String otpCode1 = otpCaptor.getValue();
        String token1 = votingService.verifyOtpAndGenerateToken(elector.getMatricule(), election.getId(), otpCode1);

        // Simulation du délai de 60s avant la 2ème demande d'OTP
        sn.uasz.vote.entity.VoteOTP firstOtp = voteOTPRepository.findTopByUserIdAndElectionIdOrderByCreatedAtDesc(elector.getId(), election.getId()).orElseThrow();
        firstOtp.setCreatedAt(LocalDateTime.now().minusSeconds(61));
        voteOTPRepository.save(firstOtp);

        votingService.requestOtp(elector.getMatricule(), election.getId());
        String otpCode2 = otpCaptor.getValue();
        String token2 = votingService.verifyOtpAndGenerateToken(elector.getMatricule(), election.getId(), otpCode2);

        // Lancer les 2 requêtes submitVote() strictement en même temps dans 2 threads
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        Callable<Void> task1 = () -> {
            barrier.await();
            try {
                votingService.submitVote(token1, election.getId(), candidacy.getId());
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Callable<Void> task2 = () -> {
            barrier.await();
            try {
                votingService.submitVote(token2, election.getId(), candidacy.getId());
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Future<Void> f1 = executor.submit(task1);
        Future<Void> f2 = executor.submit(task2);

        f1.get();
        f2.get();
        executor.shutdown();

        // Une seule requête doit réussir, la seconde doit échouer (rollback)
        assertEquals(1, successCount.get(), "Exactement 1 vote doit être validé");
        assertEquals(1, failureCount.get(), "Exactement 1 vote doit être rejeté par la contrainte anti-double-vote");

        // VÉRIFICATION D'ÉGALITÉ STRICTE (AUCUN BULLETIN FANTÔME)
        long totalBallots = ballotRepository.countByElectionId(election.getId());
        long totalAuditLogs = voterAuditLogRepository.count();

        assertEquals(1, totalBallots, "Le nombre de bulletins enregistrés en base doit être exactement de 1");
        assertEquals(1, totalAuditLogs, "Le nombre d'émargements enregistrés en base doit être exactement de 1");
        assertEquals(totalBallots, totalAuditLogs, "Le nombre de bulletins doit égaler STRICTEMENT le nombre d'émargements");
    }
}
