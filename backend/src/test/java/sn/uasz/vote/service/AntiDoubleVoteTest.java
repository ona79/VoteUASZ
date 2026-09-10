package sn.uasz.vote.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import sn.uasz.vote.entity.*;
import sn.uasz.vote.enums.*;
import sn.uasz.vote.repository.*;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Anti-Double-Vote — Unicité du Suffrage par Élection")
class AntiDoubleVoteTest {

    @Mock private UserRepository userRepository;
    @Mock private ElectionRepository electionRepository;
    @Mock private CandidatureRepository candidatureRepository;
    @Mock private VoteOTPRepository voteOTPRepository;
    @Mock private VoteTokenRepository voteTokenRepository;
    @Mock private BallotRepository ballotRepository;
    @Mock private VoterAuditLogRepository voterAuditLogRepository;
    @Mock private ElectionService electionService;
    @Mock private EligibilityService eligibilityService;
    @Mock private CryptoService cryptoService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private OtpEmailService otpEmailService; // Nécessaire depuis la suppression de l'OTP en clair

    @InjectMocks
    private VotingService votingService;

    private User testUser;
    private Election testElection;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setMatricule("20230001");
        testUser.setActive(true);

        testElection = new Election();
        testElection.setId(42L);
        testElection.setStatut(ElectionStatus.VOTE_OUVERT);
    }

    @Test
    @DisplayName("Un électeur qui a déjà voté ne doit pas pouvoir demander un second OTP")
    void requestOtp_alreadyVoted_throwsException() {
        when(userRepository.findByMatricule("20230001")).thenReturn(Optional.of(testUser));
        when(electionRepository.findById(42L)).thenReturn(Optional.of(testElection));
        when(eligibilityService.isEligible(testUser, testElection)).thenReturn(true);
        when(voterAuditLogRepository.existsByUserIdAndElectionId(1L, 42L)).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                votingService.requestOtp("20230001", 42L));
        assertTrue(ex.getMessage().contains("déjà voté"));
    }

    @Test
    @DisplayName("Un électeur non éligible ne doit pas pouvoir obtenir un OTP")
    void requestOtp_ineligibleUser_throwsException() {
        when(userRepository.findByMatricule("20230001")).thenReturn(Optional.of(testUser));
        when(electionRepository.findById(42L)).thenReturn(Optional.of(testElection));
        when(eligibilityService.isEligible(testUser, testElection)).thenReturn(false);
        when(eligibilityService.getIneligibilityReason(testUser, testElection))
                .thenReturn("Vous n'appartenez pas à la filière concernée.");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                votingService.requestOtp("20230001", 42L));
        assertTrue(ex.getMessage().contains("filière"));
    }

    @Test
    @DisplayName("Soumission avec un VoteToken déjà utilisé doit être rejetée")
    void submitVote_usedToken_throwsException() {
        when(voteTokenRepository.findByTokenHashAndUsedFalse("used-token-hash")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                votingService.submitVote("used-token-hash", 42L, 101L));
        assertTrue(ex.getMessage().contains("invalide") || ex.getMessage().contains("utilisé"));
    }

    @Test
    @DisplayName("Un OTP expiré ne doit pas générer de VoteToken")
    void verifyOtp_expiredOtp_throwsException() {
        VoteOTP expiredOtp = new VoteOTP();
        expiredOtp.setCodeHash("$2a$hash_of_849201");
        expiredOtp.setExpiresAt(LocalDateTime.now().minusMinutes(1)); // Expiré
        expiredOtp.setUsed(false);

        when(userRepository.findByMatricule("20230001")).thenReturn(Optional.of(testUser));
        when(voteOTPRepository.findTopByUserIdAndElectionIdAndUsedFalseOrderByCreatedAtDesc(1L, 42L))
                .thenReturn(Optional.of(expiredOtp));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                votingService.verifyOtpAndGenerateToken("20230001", 42L, "849201"));
        assertTrue(ex.getMessage().contains("expiré") || ex.getMessage().contains("5 minutes"));
    }
}
