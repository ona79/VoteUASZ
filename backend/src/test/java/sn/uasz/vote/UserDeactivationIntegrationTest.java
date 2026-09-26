package sn.uasz.vote;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.security.JwtTokenProvider;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class UserDeactivationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @org.springframework.boot.test.mock.mockito.MockBean
    private sn.uasz.vote.service.OtpEmailService otpEmailService;

    private User testUser;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        String uniqueId = String.valueOf(System.currentTimeMillis());
        testUser = userRepository.save(User.builder()
                .matricule("ELECT_DEACT_" + uniqueId)
                .nom("Diop")
                .prenom("Awa")
                .email("awa.deact." + uniqueId + "@uasz.sn")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .active(true)
                .build());

        // Génération d'un token JWT valide
        jwtToken = jwtTokenProvider.generateTokenFromMatricule(testUser.getMatricule());
    }

    @Test
    @DisplayName("Vérification du comportement d'un token JWT lors de l'accès à un endpoint protégé")
    void testTokenAccessBeforeAndAfterDeactivation() throws Exception {
        // 1. Accès avec compte ACTIF -> Doit être accepté (200 OK)
        mockMvc.perform(get("/api/v1/complaints/my-complaints")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());

        // 2. Désactivation du compte en base de données
        testUser.setActive(false);
        userRepository.save(testUser);

        // 3. Nouvelle requête avec le MÊME token JWT (non réémis)
        mockMvc.perform(get("/api/v1/complaints/my-complaints")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isUnauthorized()); // ou isForbidden() selon le comportement
    }
}
