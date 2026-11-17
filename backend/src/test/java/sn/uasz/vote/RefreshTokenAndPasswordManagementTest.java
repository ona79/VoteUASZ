package sn.uasz.vote;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.OtpEmailService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
class RefreshTokenAndPasswordManagementTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private OtpEmailService otpEmailService;

    private User createTestUser(String matricule, String email, String rawPassword) {
        return userRepository.save(User.builder()
                .matricule(matricule)
                .nom("Test")
                .prenom("User")
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFO")
                .niveau("L3")
                .active(true)
                .build());
    }

    @Test
    @DisplayName("Login délivre un refreshToken, /refresh effectue la rotation et /logout le révoque")
    void refreshToken_rotationAndLogout() throws Exception {
        createTestUser("RT_USER_01", "rt01@uasz.sn", "Pass1234!");

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"matriculeOrEmail\":\"RT_USER_01\",\"password\":\"Pass1234!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        JsonNode loginJson = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String firstRefresh = loginJson.get("refreshToken").asText();

        // Rotation via /refresh
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + firstRefresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        String secondRefresh = objectMapper.readTree(refreshResult.getResponse().getContentAsString())
                .get("refreshToken").asText();
        assertNotEquals(firstRefresh, secondRefresh);

        // L'ancien refresh token révoqué doit être rejeté
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + firstRefresh + "\"}"))
                .andExpect(status().isUnauthorized());

        // Logout révoque le second refresh token
        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + secondRefresh + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + secondRefresh + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Mot de passe oublié envoie un code et /reset-password met à jour le mot de passe")
    void forgotAndResetPassword_flowWorks() throws Exception {
        createTestUser("RST_USER_01", "rst01@uasz.sn", "OldPass123!");

        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendPasswordResetEmail(eq("rst01@uasz.sn"), codeCaptor.capture());

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"RST_USER_01\"}"))
                .andExpect(status().isOk());

        String resetCode = codeCaptor.getValue();
        assertNotNull(resetCode);
        assertEquals(6, resetCode.length());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"RST_USER_01\",\"code\":\"" + resetCode + "\",\"newPassword\":\"NewPass456!\"}"))
                .andExpect(status().isOk());

        // L'ancien mot de passe échoue, le nouveau réussit
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"matriculeOrEmail\":\"RST_USER_01\",\"password\":\"OldPass123!\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"matriculeOrEmail\":\"RST_USER_01\",\"password\":\"NewPass456!\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Changement de mot de passe authentifié exige le mot de passe actuel et révoque les refresh tokens")
    void changePassword_authenticatedFlow() throws Exception {
        createTestUser("CHG_USER_01", "chg01@uasz.sn", "InitPass123!");

        // Non authentifié -> 401
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"InitPass123!\",\"newPassword\":\"UpdatedPass99!\"}"))
                .andExpect(status().isUnauthorized());

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"matriculeOrEmail\":\"CHG_USER_01\",\"password\":\"InitPass123!\"}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String jwt = json.get("token").asText();
        String refresh = json.get("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"InitPass123!\",\"newPassword\":\"UpdatedPass99!\"}"))
                .andExpect(status().isOk());

        // Le refresh token précédent est révoqué
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isUnauthorized());

        // Connexion avec le nouveau mot de passe
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"matriculeOrEmail\":\"CHG_USER_01\",\"password\":\"UpdatedPass99!\"}"))
                .andExpect(status().isOk());
    }
}
