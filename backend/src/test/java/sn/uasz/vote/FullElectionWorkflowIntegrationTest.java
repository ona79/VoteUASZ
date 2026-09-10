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
import sn.uasz.vote.dto.*;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.*;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.*;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
public class FullElectionWorkflowIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ElectionService electionService;

    @Autowired
    private CandidacyService candidacyService;

    @Autowired
    private CampaignService campaignService;

    @Autowired
    private VotingService votingService;

    @Autowired
    private AuditService auditService;

    @Autowired
    private PdfReportService pdfReportService;

    /**
     * MockBean pour OtpEmailService : empêche l'envoi réel d'emails pendant les tests
     * et permet de capturer l'OTP via ArgumentCaptor.
     */
    @MockBean
    private OtpEmailService otpEmailService;

    private User adminUser;
    private User commissionUser;
    private User candidateUser;
    private User elector1;
    private User elector2;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.save(User.builder()
                .matricule("ADMIN001")
                .nom("Diallo")
                .prenom("SuperAdmin")
                .email("admin@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.SUPER_ADMIN)
                .typeElecteur(TypeElecteur.PATS)
                .ufr("ADMINISTRATION")
                .build());

        commissionUser = userRepository.save(User.builder()
                .matricule("COMM001")
                .nom("Sow")
                .prenom("PresidentCommission")
                .email("commission@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.COMMISSION_ELECTORALE)
                .typeElecteur(TypeElecteur.ENSEIGNANT)
                .ufr("UFR_SAT")
                .build());

        candidateUser = userRepository.save(User.builder()
                .matricule("CAND001")
                .nom("Ndiaye")
                .prenom("Awa")
                .email("candidate@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.CANDIDAT)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFORMATIQUE")
                .niveau("L3")
                .build());

        elector1 = userRepository.save(User.builder()
                .matricule("ELECT001")
                .nom("Faye")
                .prenom("Moussa")
                .email("moussa@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFORMATIQUE")
                .niveau("L3")
                .build());

        elector2 = userRepository.save(User.builder()
                .matricule("ELECT002")
                .nom("Diop")
                .prenom("Fatou")
                .email("fatou@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFORMATIQUE")
                .niveau("L3")
                .build());
    }

    @Test
    @DisplayName("Test d'intégration bout-en-bout du workflow d'élection sécurisée VoteUASZ")
    void testFullElectionWorkflow() {
        // 1. Création d'une élection par l'Admin
        ElectionDto newElection = ElectionDto.builder()
                .titre("Élection Délégué L3 Informatique 2026")
                .description("Élection du délégué de la promotion L3 Informatique UASZ")
                .type(TypeElection.DELEGUE)
                .targetUfr("UFR_SAT")
                .targetFiliere("INFORMATIQUE")
                .targetNiveau("L3")
                .dateDebut(LocalDateTime.now().minusHours(1))
                .dateFin(LocalDateTime.now().plusHours(5))
                .build();

        ElectionDto election = electionService.createElection(newElection);
        assertNotNull(election.getId());
        assertEquals(ElectionStatus.CONFIGURATION, election.getStatut());

        // 2. Soumission d'une candidature
        CandidatureDto candidacyReq = CandidatureDto.builder()
                .electionId(election.getId())
                .nomListe("Liste Émergence Informatique")
                .photoUrl("https://uasz.sn/photos/awa.jpg")
                .programmePdf("https://uasz.sn/pdf/programme_awa.pdf")
                .cvUrl("https://uasz.sn/pdf/cv_awa.pdf")
                .build();

        CandidatureDto submittedCandidacy = candidacyService.submitCandidacy(candidacyReq, candidateUser.getMatricule());
        assertEquals(CandidacyStatus.PENDING, submittedCandidacy.getStatut());

        // 3. Validation de la candidature par la Commission Électorale
        CandidatureDto validatedCandidacy = candidacyService.validateCandidacy(submittedCandidacy.getId(), true, null);
        assertEquals(CandidacyStatus.APPROVED, validatedCandidacy.getStatut());

        // 4. Passage à la phase CAMPAGNE et publication d'une vidéo
        election = electionService.changeStatus(election.getId(), ElectionStatus.CAMPAGNE);
        assertEquals(ElectionStatus.CAMPAGNE, election.getStatut());

        CampaignPostDto post = campaignService.createCampaignPost(CampaignPostDto.builder()
                .candidatureId(validatedCandidacy.getId())
                .titre("Mon Message Vidéo aux Étudiants")
                .contenu("Découvrez notre programme pour moderniser nos laboratoires de TP.")
                .videoEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")
                .build(), candidateUser.getMatricule());
        assertNotNull(post.getId());

        // 5. Passage à la phase VOTE_OUVERT
        election = electionService.changeStatus(election.getId(), ElectionStatus.VOTE_OUVERT);
        assertEquals(ElectionStatus.VOTE_OUVERT, election.getStatut());

        // 6. Procédure de vote pour Électeur 1
        // L'OTP est capturé via ArgumentCaptor (jamais retourné dans la réponse HTTP)
        ArgumentCaptor<String> otpCaptor1 = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq("moussa@uasz.sn"), otpCaptor1.capture(), anyString());

        votingService.requestOtp(elector1.getMatricule(), election.getId());
        String otpCode1 = otpCaptor1.getValue();
        assertNotNull(otpCode1);
        assertEquals(6, otpCode1.length(), "L'OTP doit être un code à 6 chiffres");

        String voteToken1 = votingService.verifyOtpAndGenerateToken(elector1.getMatricule(), election.getId(), otpCode1);
        assertNotNull(voteToken1);

        VoteResponseDto response1 = votingService.submitVote(voteToken1, election.getId(), validatedCandidacy.getId());
        assertTrue(response1.isSuccess());
        assertNotNull(response1.getBallotHash());

        // 7. Verification Anti-double-vote pour Électeur 1
        final Long testElectionId = election.getId();
        final String mat1 = elector1.getMatricule();
        assertThrows(IllegalStateException.class, () -> {
            votingService.requestOtp(mat1, testElectionId);
        });

        // 8. Procédure de vote pour Électeur 2
        ArgumentCaptor<String> otpCaptor2 = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendOtpByEmail(eq("fatou@uasz.sn"), otpCaptor2.capture(), anyString());

        votingService.requestOtp(elector2.getMatricule(), election.getId());
        String otpCode2 = otpCaptor2.getValue();

        String voteToken2 = votingService.verifyOtpAndGenerateToken(elector2.getMatricule(), election.getId(), otpCode2);
        VoteResponseDto response2 = votingService.submitVote(voteToken2, election.getId(), validatedCandidacy.getId());
        assertTrue(response2.isSuccess());

        // 9. Vérification des résultats live
        LiveResultsDto liveResults = votingService.getLiveResults(election.getId());
        assertEquals(2, liveResults.getTotalVotes());
        assertEquals(100.0, liveResults.getCandidateResults().get(0).getPercentage());

        // 10. Clôture de l'élection — le PDF est généré automatiquement à cette étape
        election = electionService.changeStatus(election.getId(), ElectionStatus.DEPOUILLEMENT);
        election = electionService.changeStatus(election.getId(), ElectionStatus.PUBLICATION);
        election = electionService.changeStatus(election.getId(), ElectionStatus.CLOTURE);
        assertEquals(ElectionStatus.CLOTURE, election.getStatut());

        // 11. Vérification du journal d'audit et du rapport PDF
        AuditService.AuditReportDto auditReport = auditService.getAuditReport(election.getId());
        assertEquals(2, auditReport.getTotalVotersRegistered());
        assertEquals(2, auditReport.getTotalBallotsRecorded());

        assertNotNull(pdfReportService.generateElectionPdfReport(election.getId()));
    }
}
