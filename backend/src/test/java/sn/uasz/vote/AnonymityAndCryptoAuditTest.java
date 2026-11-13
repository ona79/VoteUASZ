package sn.uasz.vote;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.CandidatureDto;
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.entity.Ballot;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.entity.VoterAuditLog;
import sn.uasz.vote.enums.*;
import sn.uasz.vote.repository.BallotRepository;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.repository.VoterAuditLogRepository;
import sn.uasz.vote.service.*;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;

/**
 * LOT C — Anonymat, dissociation schéma BDD, UUID du bulletin,
 * arrondi horaire de votedAt, ipHash salé sur IP réelle, PBKDF2 & clé >= 32 chars.
 */
@SpringBootTest
@Transactional
@ActiveProfiles("test")
class AnonymityAndCryptoAuditTest {

    @Autowired private UserRepository userRepository;
    @Autowired private BallotRepository ballotRepository;
    @Autowired private VoterAuditLogRepository voterAuditLogRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ElectionService electionService;
    @Autowired private CandidacyService candidacyService;
    @Autowired private VotingService votingService;
    @Autowired private CryptoService cryptoService;

    @Value("${app.audit.ip-salt:${app.crypto.secret-key}}")
    private String ipAuditSalt;

    @MockBean private OtpEmailService otpEmailService;

    @Test
    @DisplayName("Schéma BDD : aucun lien direct électeur <-> bulletin et ID UUID sans createdAt sur Ballot")
    void schemaDissociation_noDirectLinkBetweenVoterAndBallot() {
        List<String> ballotFields = Arrays.stream(Ballot.class.getDeclaredFields())
                .map(Field::getName).toList();
        assertFalse(ballotFields.contains("user"));
        assertFalse(ballotFields.contains("userId"));
        assertFalse(ballotFields.contains("voter"));
        assertFalse(ballotFields.contains("createdAt"), "Ballot ne doit plus exposer createdAt");
        assertEquals(UUID.class, Arrays.stream(Ballot.class.getDeclaredFields())
                .filter(f -> f.getName().equals("id")).findFirst().orElseThrow().getType());

        List<String> auditFields = Arrays.stream(VoterAuditLog.class.getDeclaredFields())
                .map(Field::getName).toList();
        assertFalse(auditFields.contains("ballot"));
        assertFalse(auditFields.contains("ballotId"));
        assertFalse(auditFields.contains("candidatureId"));
    }

    @Test
    @DisplayName("Vote enregistré : Ballot avec UUID, votedAt arrondi à l'heure et ipHash salé sur IP réelle")
    void submitVote_usesUuidBallotRoundedVotedAtAndSaltedRealIpHash() {
        User cand = userRepository.save(User.builder()
                .matricule("LOTC_CAND").nom("Diop").prenom("Moussa").email("lotc_cand@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.CANDIDAT)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFO").niveau("L3").build());
        User elec = userRepository.save(User.builder()
                .matricule("LOTC_ELEC").nom("Fall").prenom("Aminata").email("lotc_elec@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFO").niveau("L3").build());

        ElectionDto election = electionService.createElection(ElectionDto.builder()
                .titre("Scrutin Anonymat").description("Test").type(TypeElection.DELEGUE)
                .targetUfr("UFR_SAT").targetFiliere("INFO").targetNiveau("L3")
                .dateDebut(LocalDateTime.now().minusHours(1))
                .dateFin(LocalDateTime.now().plusHours(4)).build());
        CandidatureDto c = candidacyService.submitCandidacy(
                CandidatureDto.builder().electionId(election.getId()).build(), cand.getMatricule());
        candidacyService.validateCandidacy(c.getId(), true, null);
        electionService.changeStatus(election.getId(), ElectionStatus.CAMPAGNE);
        electionService.changeStatus(election.getId(), ElectionStatus.VOTE_OUVERT);

        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq(elec.getEmail()), otp.capture(), anyString());
        votingService.requestOtp(elec.getMatricule(), election.getId());
        String token = votingService.verifyOtpAndGenerateToken(elec.getMatricule(), election.getId(), otp.getValue());

        String clientIp = "203.0.113.42";
        votingService.submitVote(token, election.getId(), c.getId(), clientIp);

        Ballot savedBallot = ballotRepository.findByElectionId(election.getId()).get(0);
        assertNotNull(savedBallot.getId());

        VoterAuditLog log = voterAuditLogRepository.findByUserIdAndElectionId(elec.getId(), election.getId()).orElseThrow();
        assertEquals(0, log.getVotedAt().getMinute());
        assertEquals(0, log.getVotedAt().getSecond());
        assertEquals(0, log.getVotedAt().getNano());

        String expectedIpHash = cryptoService.hash(ipAuditSalt + ":" + clientIp);
        assertEquals(expectedIpHash, log.getIpHash());
        assertNotEquals(cryptoService.hash("USER_IP_" + elec.getId()), log.getIpHash());
    }

    @Test
    @DisplayName("CryptoService refuse une clé < 32 caractères au démarrage et dérive via PBKDF2 sinon")
    void cryptoService_rejectsShortKeyAndDerivesPbkdf2() {
        CryptoService shortKeyService = new CryptoService();
        ReflectionTestUtils.setField(shortKeyService, "secretKey", "too-short-key");
        assertThrows(IllegalStateException.class, shortKeyService::validateAndInitKey);

        CryptoService validService = new CryptoService();
        ReflectionTestUtils.setField(validService, "secretKey", "ValidSecretKeyWithAtLeast32Chars!!");
        assertDoesNotThrow(validService::validateAndInitKey);
        String enc = validService.encrypt("CHOICE:1");
        assertEquals("CHOICE:1", validService.decrypt(enc));
    }
}

