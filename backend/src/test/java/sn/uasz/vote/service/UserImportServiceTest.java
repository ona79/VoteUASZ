package sn.uasz.vote.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import sn.uasz.vote.dto.UserImportResultDto;
import sn.uasz.vote.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserImportService — Import CSV des Électeurs")
class UserImportServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserImportService userImportService;

    @BeforeEach
    void setUp() {
        lenient().when(passwordEncoder.encode(any())).thenReturn("$2a$hash");
    }

    @Test
    @DisplayName("Import CSV valide doit créer des utilisateurs en base")
    void importCsv_validFile_createsUsers() throws Exception {
        String csvContent = "matricule,nom,prenom,email,telephone,role,type_electeur,ufr,filiere,niveau\n"
                + "20230001,Sarr,Amadou,amadou@uasz.sn,771234567,ELECTEUR,ETUDIANT,UFR_SAT,INFORMATIQUE,L3\n"
                + "20230002,Fall,Khadija,khadija@uasz.sn,772345678,ELECTEUR,ETUDIANT,UFR_SAT,INFORMATIQUE,L3\n";

        MockMultipartFile file = new MockMultipartFile("file", "electeurs.csv",
                "text/csv", csvContent.getBytes());

        when(userRepository.existsByMatricule(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        assertEquals(2, result.getTotalSuccess());
        assertEquals(0, result.getTotalFailed());
        assertTrue(result.getErrors().isEmpty());
        verify(userRepository, times(2)).save(any());
    }

    @Test
    @DisplayName("Import CSV avec doublon de matricule doit signaler une erreur")
    void importCsv_duplicateMatricule_reportsError() throws Exception {
        String csvContent = "20230001,Sarr,Amadou,amadou@uasz.sn,771234567,ELECTEUR,ETUDIANT,UFR_SAT,INFORMATIQUE,L3\n";
        MockMultipartFile file = new MockMultipartFile("file", "electeurs.csv",
                "text/csv", csvContent.getBytes());

        when(userRepository.existsByMatricule("20230001")).thenReturn(true);

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        assertEquals(0, result.getTotalSuccess());
        assertEquals(1, result.getTotalFailed());
        assertEquals(1, result.getErrors().size());
        assertTrue(result.getErrors().get(0).contains("20230001"));
    }

    @Test
    @DisplayName("Import CSV avec doublon d'email doit signaler une erreur")
    void importCsv_duplicateEmail_reportsError() throws Exception {
        String csvContent = "20230001,Sarr,Amadou,amadou@uasz.sn,771234567,ELECTEUR,ETUDIANT,UFR_SAT,INFORMATIQUE,L3\n";
        MockMultipartFile file = new MockMultipartFile("file", "electeurs.csv",
                "text/csv", csvContent.getBytes());

        when(userRepository.existsByMatricule("20230001")).thenReturn(false);
        when(userRepository.existsByEmail("amadou@uasz.sn")).thenReturn(true);

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        assertEquals(0, result.getTotalSuccess());
        assertEquals(1, result.getTotalFailed());
        assertTrue(result.getErrors().get(0).contains("amadou@uasz.sn"));
    }

    @Test
    @DisplayName("Import CSV avec ligne incomplète (champs insuffisants) doit signaler une erreur")
    void importCsv_incompleteLine_reportsError() throws Exception {
        String csvContent = "20230001,Sarr,Amadou\n"; // Seulement 3 champs au lieu de 8+
        MockMultipartFile file = new MockMultipartFile("file", "electeurs.csv",
                "text/csv", csvContent.getBytes());

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        assertEquals(0, result.getTotalSuccess());
        assertEquals(1, result.getTotalFailed());
        assertFalse(result.getErrors().isEmpty());
    }

    @Test
    @DisplayName("Import CSV avec en-tête uniquement (fichier vide) doit retourner zéro succès")
    void importCsv_headerOnly_zeroSuccess() throws Exception {
        String csvContent = "matricule,nom,prenom,email,telephone,role,type_electeur,ufr,filiere,niveau\n";
        MockMultipartFile file = new MockMultipartFile("file", "electeurs.csv",
                "text/csv", csvContent.getBytes());

        UserImportResultDto result = userImportService.importUsersFromCsv(file);

        assertEquals(0, result.getTotalSuccess());
        assertEquals(0, result.getTotalFailed());
        verify(userRepository, never()).save(any());
    }
}
