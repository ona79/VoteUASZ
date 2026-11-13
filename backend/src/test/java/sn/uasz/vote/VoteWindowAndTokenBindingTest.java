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
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.CandidatureDto;
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.*;
import sn.uasz.vote.repository.BallotRepository;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.*;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;

/**
 * LOT A — Sécurité du vote :
 *  - fenêtre temporelle dateDebut <= now <= dateFin (en plus du statut VOTE_OUVERT)
 *  - jeton de vote lié à son élection
 *  - re-vérification de l'éligibilité au moment du dépôt du bulletin
 */
@SpringBootTest
@Transactional
@ActiveProfiles("test")
class VoteWindowAndTokenBindingTest {

    @Autowired private UserRepository userRepository;
    @Autowired private ElectionRepository electionRepository;
    @Autowired private BallotRepository ballotRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ElectionService electionService;
    @Autowired private CandidacyService candidacyService;
    @Autowired private VotingService votingService;

    @MockBean private OtpEmailService otpEmailService;

    private User candidat;
    private User electeur;

    @BeforeEach
    void setUp() {
        candidat = userRepository.save(User.builder()
                .matricule("WIN_CAND").nom("Ba").prenom("Ali").email("win_cand@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.CANDIDAT)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFORMATIQUE").niveau("L3")
                .build());
        electeur = userRepository.save(User.builder()
                .matricule("WIN_ELEC").nom("Sy").prenom("Awa").email("win_elec@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFORMATIQUE").niveau("L3")
                .build());
    }

    /** Crée une élection DELEGUE L3 Info, une candidature approuvée, et la passe en VOTE_OUVERT. */
    private long[] openElection(String titre, LocalDateTime debut, LocalDateTime fin) {
        ElectionDto e = electionService.createElection(ElectionDto.builder()
                .titre(titre).description("Test").type(TypeElection.DELEGUE)
                .targetUfr("UFR_SAT").targetFiliere("INFORMATIQUE").targetNiveau("L3")
                .dateDebut(debut).dateFin(fin).build());
        CandidatureDto c = candidacyService.submitCandidacy(
                CandidatureDto.builder().electionId(e.getId()).build(), candidat.getMatricule());
        candidacyService.validateCandidacy(c.getId(), true, null);
        electionService.changeStatus(e.getId(), ElectionStatus.CAMPAGNE);
        electionService.changeStatus(e.getId(), ElectionStatus.VOTE_OUVERT);
        return new long[]{e.getId(), c.getId()};
    }

    private String obtainToken(long electionId) {
        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq(electeur.getEmail()), otp.capture(), anyString());
        votingService.requestOtp(electeur.getMatricule(), electionId);
        return votingService.verifyOtpAndGenerateToken(electeur.getMatricule(), electionId, otp.getValue());
    }

    @Test
    @DisplayName("requestOtp refusé avant dateDebut même si le statut est VOTE_OUVERT")
    void requestOtp_beforeStart_isRejected() {
        long[] ids = openElection("Futur", LocalDateTime.now().plusHours(2), LocalDateTime.now().plusHours(5));
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> votingService.requestOtp(electeur.getMatricule(), ids[0]));
        assertTrue(ex.getMessage().contains("pas encore commencé"), ex.getMessage());
    }

    @Test
    @DisplayName("requestOtp refusé après dateFin même si le statut est resté VOTE_OUVERT")
    void requestOtp_afterEnd_isRejected() {
        long[] ids = openElection("Passé", LocalDateTime.now().minusHours(5), LocalDateTime.now().minusMinutes(1));
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> votingService.requestOtp(electeur.getMatricule(), ids[0]));
        assertTrue(ex.getMessage().contains("terminé"), ex.getMessage());
    }

    @Test
    @DisplayName("submitVote refusé si dateFin est dépassée entre l'obtention du jeton et le dépôt")
    void submitVote_afterEnd_isRejected() {
        long[] ids = openElection("Fin imminente", LocalDateTime.now().minusHours(1), LocalDateTime.now().plusHours(1));
        String token = obtainToken(ids[0]);

        Election e = electionRepository.findById(ids[0]).orElseThrow();
        e.setDateFin(LocalDateTime.now().minusSeconds(1));
        electionRepository.save(e);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> votingService.submitVote(token, ids[0], ids[1]));
        assertTrue(ex.getMessage().contains("terminé"), ex.getMessage());
        assertEquals(0, ballotRepository.countByElectionId(ids[0]));
    }

    @Test
    @DisplayName("Un jeton obtenu pour l'élection A ne peut pas être utilisé sur l'élection B")
    void submitVote_tokenFromOtherElection_isRejected() {
        LocalDateTime d = LocalDateTime.now().minusHours(1);
        LocalDateTime f = LocalDateTime.now().plusHours(3);
        long[] a = openElection("Election A", d, f);
        long[] b = openElection("Election B", d, f);
        String tokenA = obtainToken(a[0]);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> votingService.submitVote(tokenA, b[0], b[1]));
        assertTrue(ex.getMessage().contains("pas valide pour cette élection"), ex.getMessage());
        assertEquals(0, ballotRepository.countByElectionId(b[0]));
        assertFalse(votingService.hasUserVoted(electeur.getMatricule(), b[0]));
    }

    @Test
    @DisplayName("Un électeur devenu non éligible entre l'OTP et le dépôt voit son bulletin refusé")
    void submitVote_voterNoLongerEligible_isRejected() {
        long[] ids = openElection("Eligibilite", LocalDateTime.now().minusHours(1), LocalDateTime.now().plusHours(3));
        String token = obtainToken(ids[0]);

        User u = userRepository.findByMatricule(electeur.getMatricule()).orElseThrow();
        u.setFiliere("MATHEMATIQUES");
        userRepository.save(u);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> votingService.submitVote(token, ids[0], ids[1]));
        assertTrue(ex.getMessage().contains("filière"), ex.getMessage());
        assertEquals(0, ballotRepository.countByElectionId(ids[0]));
    }

    @Test
    @DisplayName("Dans la fenêtre et avec le bon jeton, le vote est accepté")
    void submitVote_insideWindow_isAccepted() {
        long[] ids = openElection("Nominal", LocalDateTime.now().minusHours(1), LocalDateTime.now().plusHours(3));
        String token = obtainToken(ids[0]);
        assertTrue(votingService.submitVote(token, ids[0], ids[1]).isSuccess());
        assertEquals(1, ballotRepository.countByElectionId(ids[0]));
    }
}

