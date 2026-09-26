package sn.uasz.vote;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import sn.uasz.vote.dto.LoginRequest;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.OtpEmailService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthBruteForceTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private OtpEmailService otpEmailService;

    private String matricule;
    private String correctPassword;

    @BeforeEach
    void setUp() {
        String uniqueId = String.valueOf(System.currentTimeMillis());
        matricule = "ELECT_BF_AUTH_" + uniqueId;
        correctPassword = "ElecteurSecure2026!";

        userRepository.save(User.builder()
                .matricule(matricule)
                .nom("Sarr")
                .prenom("Abdoulaye")
                .email("abdoulaye." + uniqueId + "@uasz.sn")
                .password(passwordEncoder.encode(correctPassword))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .active(true)
                .build());
    }

    @Test
    @DisplayName("Test de protection contre le brute force : verrouillage après 5 tentatives de connexion échouées")
    void testAccountLockoutAfterFailedLogins() throws Exception {
        LoginRequest wrongRequest = new LoginRequest(matricule, "MauvaisMotDePasse123!");

        // 1. Envoi de 4 requêtes avec mauvais mot de passe -> rejetées avec BadCredentials
        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(wrongRequest)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Matricule ou mot de passe incorrect. Vérifiez vos identifiants et réessayez."));
        }

        // 2. 5ème tentative échouée -> verrouille le compte pendant 5 min (401 Locked)
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Votre compte est temporairement verrouillé. Réessayez dans quelques minutes."));

        // 3. 6ème tentative avec le BON mot de passe -> DOIT être rejetée (compte toujours verrouillé)
        LoginRequest correctRequest = new LoginRequest(matricule, correctPassword);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Votre compte est temporairement verrouillé. Réessayez dans quelques minutes."));

        // 4. Déverrouillage : simuler l'expiration de la période de 5 minutes
        User user = userRepository.findByMatricule(matricule).orElseThrow();
        user.setLockedUntil(java.time.LocalDateTime.now().minusSeconds(1));
        userRepository.save(user);

        // 5. Tentative ultérieure avec le BON mot de passe après expiration du verrou → Succès (200 OK)
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }
}
