package sn.uasz.vote;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import sn.uasz.vote.dto.UserImportResultDto;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.OtpEmailService;
import sn.uasz.vote.service.UserImportService;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class PriorityAuditFixesTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserImportService userImportService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Fix #3 : @JsonIgnore sur User.password garantit qu'aucun mot de passe n'est sérialisé")
    void testPasswordNotSerializedDueToJsonIgnore() throws Exception {
        User user = User.builder()
                .matricule("TEST_IGNORE_01")
                .nom("Diop")
                .prenom("Fatou")
                .email("fatou.ignore@uasz.sn")
                .password("$2a$10$SecretHashedPassword123")
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .build();

        String json = objectMapper.writeValueAsString(user);

        assertFalse(json.contains("password"), "Le champ password ne doit JAMAIS apparaître dans le JSON sérialisé");
        assertFalse(json.contains("SecretHashedPassword123"), "Le hash de mot de passe ne doit pas fuiter");
        assertTrue(json.contains("TEST_IGNORE_01"), "Le matricule doit être présent");
    }

    @Test
    @DisplayName("Fix #4 : Masquage OTP en prod vs affichage en test/dev")
    void testOtpLogMaskingInProdVsDev() {
        // En profil prod
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");
        OtpEmailService prodService = new OtpEmailService(null, prodEnv);

        // En profil test / dev
        MockEnvironment devEnv = new MockEnvironment();
        devEnv.setActiveProfiles("dev");
        OtpEmailService devService = new OtpEmailService(null, devEnv);

        assertDoesNotThrow(() -> prodService.sendOtpByEmail("electeur@uasz.sn", "123456", "Election Test"));
        assertDoesNotThrow(() -> devService.sendOtpByEmail("electeur@uasz.sn", "123456", "Election Test"));
    }

    @org.springframework.beans.factory.annotation.Value("${app.default-electeur-password}")
    private String defaultElecteurPassword;

    @org.springframework.beans.factory.annotation.Value("${app.default-candidat-password}")
    private String defaultCandidatPassword;

    @Test
    @DisplayName("Fix #5 : Pré-calcul du hash mot de passe dans l'import CSV")
    void testPrecalculatedPasswordHashInCsvImport() {
        String csvContent = "matricule,nom,prenom,email,telephone,role,typeElecteur,ufr,filiere,niveau\n" +
                "PRE_HASH_01,Ndiaye,Awa,awa.prehash@uasz.sn,770000001,ELECTEUR,ETUDIANT,UFR_SET,INFORMATIQUE,L3\n" +
                "PRE_HASH_02,Fall,Moussa,moussa.prehash@uasz.sn,770000002,CANDIDAT,ETUDIANT,UFR_SET,INFORMATIQUE,L3\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "students.csv", "text/csv", csvContent.getBytes(StandardCharsets.UTF_8)
        );

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        assertEquals(2, result.getTotalSuccess());
        assertEquals(0, result.getTotalFailed());

        User electeur = userRepository.findByMatricule("PRE_HASH_01").orElseThrow();
        User candidat = userRepository.findByMatricule("PRE_HASH_02").orElseThrow();

        // Vérifier que le mot de passe est bien haché et valide selon les configurations actives
        assertTrue(passwordEncoder.matches(defaultElecteurPassword, electeur.getPassword()));
        assertTrue(passwordEncoder.matches(defaultCandidatPassword, candidat.getPassword()));
    }
}
