package sn.uasz.vote;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import sn.uasz.vote.dto.UserImportResultDto;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.OtpEmailService;
import sn.uasz.vote.service.UserImportService;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@ExtendWith(OutputCaptureExtension.class)
public class SuperAdminCsvImportTest {

    @Autowired
    private UserImportService userImportService;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private OtpEmailService otpEmailService;

    @Test
    @DisplayName("Vérification de l'import CSV d'un compte avec rôle SUPER_ADMIN sous identité administrateur — Log WARN généré")
    @org.springframework.security.test.context.support.WithMockUser(username = "ADMIN_OPERATOR_01", roles = "SUPER_ADMIN")
    void testImportSuperAdminUserViaCsv(CapturedOutput output) {
        String uniqueId = String.valueOf(System.currentTimeMillis());
        String superAdminMatricule = "ADMIN_CSV_" + uniqueId;
        String superAdminEmail = "admin.csv." + uniqueId + "@uasz.sn";

        // CSV Header + 1 ligne avec rôle SUPER_ADMIN
        String csvContent = "matricule,nom,prenom,email,telephone,role,typeElecteur,ufr,filiere,niveau\n" +
                superAdminMatricule + ",Diouf,Saliou," + superAdminEmail + ",770000000,SUPER_ADMIN,PATS,ADMINISTRATION,INFORMATIQUE,PERMANENT\n";

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "users.csv",
                "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8)
        );

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        // Vérification de la réussite de l'importation
        assertEquals(1, result.getTotalSuccess(), "L'import de l'utilisateur SUPER_ADMIN doit réussir");
        assertEquals(0, result.getTotalFailed());

        // Vérification en base de données
        Optional<User> importedUserOpt = userRepository.findByMatricule(superAdminMatricule);
        assertTrue(importedUserOpt.isPresent(), "L'utilisateur doit être présent en base");

        User importedUser = importedUserOpt.get();
        assertEquals(Role.SUPER_ADMIN, importedUser.getRole(), "Le rôle attribué doit bien être SUPER_ADMIN");
        assertTrue(importedUser.isActive(), "Le compte importé doit être actif par défaut");

        // Vérification du log WARN de traçabilité
        assertTrue(output.getOut().contains("[CRÉATION COMPTE PRIVILÉGIÉ]"),
                "Un log WARN spécifique doit figurer pour la création d'un compte SUPER_ADMIN");
        assertTrue(output.getOut().contains("ADMIN_OPERATOR_01"),
                "Le log doit mentionner l'identifiant de l'administrateur ayant effectué l'import");
        assertTrue(output.getOut().contains(superAdminMatricule),
                "Le log doit mentionner le matricule du compte créé");
    }

    @Test
    @DisplayName("Vérification de l'import CSV d'un compte avec rôle COMMISSION_ELECTORALE — Log WARN généré")
    @org.springframework.security.test.context.support.WithMockUser(username = "ADMIN_OPERATOR_02", roles = "SUPER_ADMIN")
    void testImportCommissionElectoraleUserViaCsv(CapturedOutput output) {
        String uniqueId = String.valueOf(System.currentTimeMillis() + 2);
        String commMatricule = "COMM_CSV_" + uniqueId;
        String commEmail = "comm.csv." + uniqueId + "@uasz.sn";

        String csvContent = "matricule,nom,prenom,email,telephone,role,typeElecteur,ufr,filiere,niveau\n" +
                commMatricule + ",Ba,Moussa," + commEmail + ",779998877,COMMISSION_ELECTORALE,PER:ENSEIGNANT,UFR_SAT,INFORMATIQUE,PERMANENT\n";

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "users.csv",
                "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8)
        );

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        assertEquals(1, result.getTotalSuccess());
        assertTrue(output.getOut().contains("[CRÉATION COMPTE PRIVILÉGIÉ]"),
                "Un log WARN spécifique doit figurer pour la création d'un compte COMMISSION_ELECTORALE");
        assertTrue(output.getOut().contains("ADMIN_OPERATOR_02"));
    }

    @Test
    @DisplayName("Vérification de l'import CSV d'un compte standard ELECTEUR — Log INFO standard, pas de WARN privilège")
    @org.springframework.security.test.context.support.WithMockUser(username = "ADMIN_OPERATOR_01", roles = "SUPER_ADMIN")
    void testImportStandardElecteurViaCsv(CapturedOutput output) {
        String uniqueId = String.valueOf(System.currentTimeMillis() + 1);
        String electeurMatricule = "ELECT_CSV_" + uniqueId;
        String electeurEmail = "electeur.csv." + uniqueId + "@uasz.sn";

        String csvContent = "matricule,nom,prenom,email,telephone,role,typeElecteur,ufr,filiere,niveau\n" +
                electeurMatricule + ",Faye,Ousmane," + electeurEmail + ",771112233,ELECTEUR,ETUDIANT,UFR_SAT,INFORMATIQUE,L3\n";

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "users.csv",
                "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8)
        );

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        assertEquals(1, result.getTotalSuccess());
        Optional<User> importedUserOpt = userRepository.findByMatricule(electeurMatricule);
        assertTrue(importedUserOpt.isPresent());
        assertEquals(Role.ELECTEUR, importedUserOpt.get().getRole());

        // Doit avoir un log d'import classique mais PAS de log WARN compte privilégié
        assertFalse(output.getOut().contains("[CRÉATION COMPTE PRIVILÉGIÉ]"),
                "Le log WARN de compte privilégié ne doit pas figurer pour un simple électeur");
    }
}

