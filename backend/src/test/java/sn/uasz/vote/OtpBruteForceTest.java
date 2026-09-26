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
public class OtpBruteForceTest {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ElectionService electionService;
    @Autowired private VotingService votingService;

    @MockBean private OtpEmailService otpEmailService;

    private User elector;
    private ElectionDto election;

    @BeforeEach
    void setUp() {
        elector = userRepository.save(User.builder()
                .matricule("ELECT_BF_01")
                .nom("Diallo")
                .prenom("Mamadou")
                .email("bf_test@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFORMATIQUE")
                .niveau("L3")
                .build());

        election = electionService.createElection(ElectionDto.builder()
                .titre("Élection Test Brute Force OTP")
                .description("Test de résistance au brute force OTP")
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

    @Autowired private VoteOTPRepository voteOTPRepository;

    @Test
    @DisplayName("Test de protection contre le brute force : blocage après 5 tentatives échouées")
    void testOtpBruteForceProtection() {
        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq(elector.getEmail()), otpCaptor.capture(), anyString());

        // 1. Demande d'OTP (génère 1 code valide à 6 chiffres)
        votingService.requestOtp(elector.getMatricule(), election.getId());
        String validOtpCode = otpCaptor.getValue();
        assertNotNull(validOtpCode);

        // 2. Envoi de 4 mauvais codes OTP -> tous rejetés avec IllegalArgumentException
        String[] wrongCodes = {"000000", "111111", "222222", "333333"};
        for (String wrongCode : wrongCodes) {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                votingService.verifyOtpAndGenerateToken(elector.getMatricule(), election.getId(), wrongCode)
            );
            assertTrue(ex.getMessage().contains("incorrect"));
        }

        // 3. 5ème mauvaise tentative -> invalide l'OTP et renvoie IllegalStateException
        IllegalStateException ex5 = assertThrows(IllegalStateException.class, () ->
            votingService.verifyOtpAndGenerateToken(elector.getMatricule(), election.getId(), "444444")
        );
        assertTrue(ex5.getMessage().contains("Trop de tentatives incorrectes"));

        // 4. 6ème tentative avec le BON code OTP -> rejetée avec le même message
        IllegalStateException ex6 = assertThrows(IllegalStateException.class, () ->
            votingService.verifyOtpAndGenerateToken(elector.getMatricule(), election.getId(), validOtpCode)
        );
        assertTrue(ex6.getMessage().contains("Trop de tentatives incorrectes"),
                "Le bon code OTP doit être rejeté après 5 échecs");

        // 5. Demander un nouvel OTP génère un nouveau code valide (après simulation des 60s de cooldown)
        sn.uasz.vote.entity.VoteOTP firstOtp = voteOTPRepository.findTopByUserIdAndElectionIdOrderByCreatedAtDesc(elector.getId(), election.getId()).orElseThrow();
        firstOtp.setCreatedAt(LocalDateTime.now().minusSeconds(61));
        voteOTPRepository.save(firstOtp);

        votingService.requestOtp(elector.getMatricule(), election.getId());
        String newValidOtpCode = otpCaptor.getValue();
        assertNotNull(newValidOtpCode);

        String token = votingService.verifyOtpAndGenerateToken(elector.getMatricule(), election.getId(), newValidOtpCode);
        assertNotNull(token, "Le nouvel OTP sollicité permet de générer un jeton de vote");
    }
}
