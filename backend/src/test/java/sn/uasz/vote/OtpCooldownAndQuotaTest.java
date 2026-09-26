package sn.uasz.vote;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class OtpCooldownAndQuotaTest {

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
        voteOTPRepository.deleteAll();
        long suffix = System.currentTimeMillis() + (long)(Math.random() * 10000);
        elector = userRepository.save(User.builder()
                .matricule("ELECT_CD_" + suffix)
                .nom("Diallo")
                .prenom("Mamadou")
                .email("cooldown_" + suffix + "@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFORMATIQUE")
                .niveau("L3")
                .build());

        election = electionService.createElection(ElectionDto.builder()
                .titre("Élection Test Cooldown & Quota OTP " + suffix)
                .description("Test des limites temporelles et quotas d'OTP")
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

    @Test
    @DisplayName("1. Une 2ème demande d'OTP moins de 60s après la 1ère doit être rejetée (cooldown active)")
    void testSecondOtpRequestWithin60sIsRejected() {
        // 1ère demande
        votingService.requestOtp(elector.getMatricule(), election.getId());

        // 2ème demande immédiate -> doit échouer
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                votingService.requestOtp(elector.getMatricule(), election.getId())
        );

        assertTrue(ex.getMessage().contains("Veuillez patienter 60 secondes"),
                "Le message doit explicitement demander d'attendre 60 secondes");
    }

    @Test
    @DisplayName("2. Une demande d'OTP après le délai de 60s doit être acceptée")
    void testOtpRequestAfter60sIsAccepted() {
        // 1ère demande
        votingService.requestOtp(elector.getMatricule(), election.getId());

        // Simulation du passage de 61 secondes pour la 1ère demande
        VoteOTP firstOtp = voteOTPRepository.findTopByUserIdAndElectionIdOrderByCreatedAtDesc(elector.getId(), election.getId()).orElseThrow();
        firstOtp.setCreatedAt(LocalDateTime.now().minusSeconds(61));
        voteOTPRepository.save(firstOtp);

        // 2ème demande après 61s -> doit réussir
        assertDoesNotThrow(() -> votingService.requestOtp(elector.getMatricule(), election.getId()),
                "Une demande d'OTP effectuée après 60s doit être acceptée");
    }

    @Test
    @DisplayName("3. La 6ème demande d'OTP dans la même heure doit être rejetée pour quota dépassé")
    void test6thOtpRequestInSameHourIsRejected() {
        // Simuler 5 demandes d'OTP créées dans la dernière heure
        for (int i = 0; i < 5; i++) {
            final int step = i;
            // Ajuster le dernier OTP pour satisfaire le cooldown (61s en arrière) tout en restant dans l'heure
            voteOTPRepository.findTopByUserIdAndElectionIdOrderByCreatedAtDesc(elector.getId(), election.getId()).ifPresent(lastOtp -> {
                lastOtp.setCreatedAt(LocalDateTime.now().minusSeconds(61 + (step * 5)));
                voteOTPRepository.save(lastOtp);
            });
            votingService.requestOtp(elector.getMatricule(), election.getId());
        }

        assertEquals(5, voteOTPRepository.countByUserIdAndElectionIdAndCreatedAtAfter(
                elector.getId(), election.getId(), LocalDateTime.now().minusHours(1)));

        // Simuler 61s passées pour la 5ème demande
        voteOTPRepository.findTopByUserIdAndElectionIdOrderByCreatedAtDesc(elector.getId(), election.getId()).ifPresent(lastOtp -> {
            lastOtp.setCreatedAt(LocalDateTime.now().minusSeconds(61));
            voteOTPRepository.save(lastOtp);
        });

        // Tenter la 6ème demande d'OTP -> doit échouer pour quota dépassé
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                votingService.requestOtp(elector.getMatricule(), election.getId())
        );

        assertTrue(ex.getMessage().contains("Quota dépassé"),
                "Le message doit indiquer le dépassement de quota de 5 OTPs par heure");
    }
}
