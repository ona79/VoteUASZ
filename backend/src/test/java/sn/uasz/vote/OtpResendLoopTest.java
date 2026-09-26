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
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.entity.VoteOTP;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElection;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.repository.VoteOTPRepository;
import sn.uasz.vote.service.ElectionService;
import sn.uasz.vote.service.OtpEmailService;
import sn.uasz.vote.service.VotingService;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;

@SpringBootTest
@ActiveProfiles("test")
public class OtpResendLoopTest {

    @Autowired private UserRepository userRepository;
    @Autowired private VoteOTPRepository voteOTPRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ElectionService electionService;
    @Autowired private VotingService votingService;

    @MockBean private OtpEmailService otpEmailService;

    private User elector;
    private ElectionDto election;

    @BeforeEach
    void setUp() {
        elector = userRepository.save(User.builder()
                .matricule("ELECT_RESEND_01")
                .nom("Diallo")
                .prenom("Mamadou")
                .email("resend_test@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFORMATIQUE")
                .niveau("L3")
                .build());

        election = electionService.createElection(ElectionDto.builder()
                .titre("Élection Test Redemande OTP")
                .description("Test de répétition de demande d'OTP avec cooldown")
                .type(TypeElection.DELEGUE)
                .targetUfr("UFR_SAT")
                .targetFiliere("INFORMATIQUE")
                .targetNiveau("L3")
                .dateDebut(LocalDateTime.now().minusHours(1))
                .dateFin(LocalDateTime.now().plusHours(5))
                .build());

        electionService.changeStatus(election.getId(), ElectionStatus.CAMPAGNE);
        election = electionService.changeStatus(election.getId(), ElectionStatus.VOTE_OUVERT);
    }

    private void simulateTimePassed() {
        voteOTPRepository.findTopByUserIdAndElectionIdOrderByCreatedAtDesc(elector.getId(), election.getId()).ifPresent(otp -> {
            otp.setCreatedAt(LocalDateTime.now().minusSeconds(61));
            voteOTPRepository.save(otp);
        });
    }

    @Test
    @DisplayName("Vérification que la réémission d'OTP fonctionne correctement une fois le cooldown de 60s respecté")
    void testOtpResendWithCooldownPassed() {
        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq(elector.getEmail()), otpCaptor.capture(), anyString());

        // Cycle 1: Demande 1
        votingService.requestOtp(elector.getMatricule(), election.getId());

        // Cycle 2: Après 60s
        simulateTimePassed();
        assertDoesNotThrow(() -> votingService.requestOtp(elector.getMatricule(), election.getId()));

        // Cycle 3: Après 60s
        simulateTimePassed();
        assertDoesNotThrow(() -> votingService.requestOtp(elector.getMatricule(), election.getId()));
        String thirdOtp = otpCaptor.getValue();
        assertNotNull(thirdOtp);

        String token = votingService.verifyOtpAndGenerateToken(elector.getMatricule(), election.getId(), thirdOtp);
        assertNotNull(token);
    }
}

