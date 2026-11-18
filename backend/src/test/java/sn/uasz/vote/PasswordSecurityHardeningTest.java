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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.entity.PasswordResetToken;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.PasswordResetTokenRepository;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.OtpEmailService;
import sn.uasz.vote.service.UserImportService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
class PasswordSecurityHardeningTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserImportService userImportService;

    @MockBean private OtpEmailService otpEmailService;

    private User createUser(String matricule, String email, String rawPassword, boolean mustChangePassword) {
        return userRepository.save(User.builder()
                .matricule(matricule)
                .nom("Test")
                .prenom("Security")
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT")
                .filiere("INFO")
                .niveau("L3")
                .active(true)
                .mustChangePassword(mustChangePassword)
                .build());
    }

    @Test
    @DisplayName("Reset password : le 6e essai est refusé même avec le bon code")
    void resetPassword_sixthAttemptRejectedEvenWithValidCode() throws Exception {
        createUser("SEC_RST_6", "sec6@uasz.sn", "OldPass123!", false);
        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendPasswordResetEmail(eq("sec6@uasz.sn"), codeCaptor.capture());

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"SEC_RST_6\"}"))
                .andExpect(status().isOk());

        String validCode = codeCaptor.getValue();
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/reset-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"identifier\":\"SEC_RST_6\",\"code\":\"000000\",\"newPassword\":\"NewPass123!\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Code de réinitialisation invalide ou expiré."));
        }

        // 6e essai avec le BON code -> refusé
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"SEC_RST_6\",\"code\":\"" + validCode + "\",\"newPassword\":\"NewPass123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Code de réinitialisation invalide ou expiré."));
    }

    @Test
    @DisplayName("Reset password : réponse 400 identique pour identifiant inconnu et code erroné")
    void resetPassword_identicalResponseForUnknownIdentifierAndWrongCode() throws Exception {
        createUser("SEC_IDEM", "secidem@uasz.sn", "OldPass123!", false);
        doNothing().when(otpEmailService).sendPasswordResetEmail(eq("secidem@uasz.sn"), anyString());

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"SEC_IDEM\"}"))
                .andExpect(status().isOk());

        MvcResult unknownRes = mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"UNKNOWN_USER_XYZ\",\"code\":\"123456\",\"newPassword\":\"NewPass123!\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();

        MvcResult wrongCodeRes = mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"SEC_IDEM\",\"code\":\"999999\",\"newPassword\":\"NewPass123!\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();

        assertEquals(unknownRes.getResponse().getContentAsString(), wrongCodeRes.getResponse().getContentAsString());
    }

    @Test
    @DisplayName("Forgot password : un second appel dans les 60 s n'envoie pas d'e-mail")
    void forgotPassword_secondCallWithin60sDoesNotSendEmail() throws Exception {
        createUser("SEC_COOL", "seccool@uasz.sn", "OldPass123!", false);
        doNothing().when(otpEmailService).sendPasswordResetEmail(eq("seccool@uasz.sn"), anyString());

        MvcResult first = mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"SEC_COOL\"}"))
                .andExpect(status().isOk())
                .andReturn();

        MvcResult second = mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"SEC_COOL\"}"))
                .andExpect(status().isOk())
                .andReturn();

        assertEquals(first.getResponse().getContentAsString(), second.getResponse().getContentAsString());
        verify(otpEmailService, times(1)).sendPasswordResetEmail(eq("seccool@uasz.sn"), anyString());
    }

    @Test
    @DisplayName("Reset password : un code expiré est refusé avec le message générique")
    void resetPassword_expiredCodeRejected() throws Exception {
        User user = createUser("SEC_EXP", "secexp@uasz.sn", "OldPass123!", false);
        passwordResetTokenRepository.save(PasswordResetToken.builder()
                .user(user)
                .codeHash(passwordEncoder.encode("654321"))
                .expiresAt(LocalDateTime.now().minusMinutes(1))
                .used(false)
                .attemptsCount(0)
                .build());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"SEC_EXP\",\"code\":\"654321\",\"newPassword\":\"NewPass123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Code de réinitialisation invalide ou expiré."));
    }

    @Test
    @DisplayName("Rate limit 429 sur /auth/forgot-password et /auth/reset-password")
    void forgotAndResetPassword_rateLimitedReturns429() throws Exception {
        String ipForgot = "198.51.100.71";
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(post("/api/v1/auth/forgot-password")
                            .with(req -> { req.setRemoteAddr(ipForgot); return req; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"identifier\":\"NON_EXISTENT\"}"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .with(req -> { req.setRemoteAddr(ipForgot); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"NON_EXISTENT\"}"))
                .andExpect(status().isTooManyRequests());

        String ipReset = "198.51.100.72";
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(post("/api/v1/auth/reset-password")
                            .with(req -> { req.setRemoteAddr(ipReset); return req; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"identifier\":\"NON_EXISTENT\",\"code\":\"123456\",\"newPassword\":\"NewPass123!\"}"))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .with(req -> { req.setRemoteAddr(ipReset); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"NON_EXISTENT\",\"code\":\"123456\",\"newPassword\":\"NewPass123!\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("mustChangePassword=true bloque /vote/request-otp en 403 PASSWORD_CHANGE_REQUIRED mais autorise refresh, change-password et logout")
    void mustChangePassword_blocksProtectedEndpointsWith403ButAllowsExemptEndpoints() throws Exception {
        createUser("MCP_USER_01", "mcp01@uasz.sn", "InitPass123!", true);

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"matriculeOrEmail\":\"MCP_USER_01\",\"password\":\"InitPass123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andReturn();

        JsonNode loginJson = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String jwt = loginJson.get("token").asText();
        String refresh = loginJson.get("refreshToken").asText();

        // 1. Endpoint protégé bloqué en 403 PASSWORD_CHANGE_REQUIRED
        mockMvc.perform(post("/api/v1/vote/request-otp")
                        .header("Authorization", "Bearer " + jwt)
                        .param("electionId", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));

        // 2. /refresh autorisé (et expose toujours mustChangePassword=true)
        MvcResult refreshRes = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andReturn();
        String rotatedRefresh = objectMapper.readTree(refreshRes.getResponse().getContentAsString())
                .get("refreshToken").asText();

        // 3. /change-password refuse le même mot de passe
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"InitPass123!\",\"newPassword\":\"InitPass123!\"}"))
                .andExpect(status().isBadRequest());

        // 4. /change-password avec un nouveau mot de passe repasse mustChangePassword à false
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"InitPass123!\",\"newPassword\":\"StrongNewPass456!\"}"))
                .andExpect(status().isOk());

        User updated = userRepository.findByMatricule("MCP_USER_01").orElseThrow();
        assertFalse(updated.isMustChangePassword());

        // 5. /logout reste autorisé même si mustChangePassword est true
        createUser("MCP_LOGOUT", "mcplogout@uasz.sn", "InitPass123!", true);
        MvcResult logoutLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"matriculeOrEmail\":\"MCP_LOGOUT\",\"password\":\"InitPass123!\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String logoutJwt = objectMapper.readTree(logoutLogin.getResponse().getContentAsString()).get("token").asText();
        String logoutRt = objectMapper.readTree(logoutLogin.getResponse().getContentAsString()).get("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + logoutJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + logoutRt + "\"}"))
                .andExpect(status().isOk());

        assertNotNull(rotatedRefresh);
    }

    @Test
    @DisplayName("Reset password repasse mustChangePassword à false")
    void mustChangePassword_resetPasswordClearsFlag() throws Exception {
        createUser("MCP_RST", "mcprst@uasz.sn", "InitPass123!", true);
        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        doNothing().when(otpEmailService).sendPasswordResetEmail(eq("mcprst@uasz.sn"), codeCaptor.capture());

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"MCP_RST\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"MCP_RST\",\"code\":\"" + codeCaptor.getValue() + "\",\"newPassword\":\"ResetPass999!\"}"))
                .andExpect(status().isOk());

        User updated = userRepository.findByMatricule("MCP_RST").orElseThrow();
        assertFalse(updated.isMustChangePassword());
    }

    @Test
    @DisplayName("Import CSV met mustChangePassword à true pour ELECTEUR et CANDIDAT")
    void csvImport_setsMustChangePasswordTrueForElecteurAndCandidat() {
        String csv = "matricule,nom,prenom,email,telephone,role,typeElecteur,ufr,filiere,niveau\n"
                + "CSV_E_01,Diallo,Amadou,csve01@uasz.sn,771112233,ELECTEUR,ETUDIANT,UFR_SAT,INFO,L3\n"
                + "CSV_C_01,Ndiaye,Fatou,csvc01@uasz.sn,774445566,CANDIDAT,ETUDIANT,UFR_SAT,INFO,L3\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "users.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        var result = userImportService.importUsersFromCsv(file);
        assertEquals(2, result.getTotalSuccess());
        assertTrue(userRepository.findByMatricule("CSV_E_01").orElseThrow().isMustChangePassword());
        assertTrue(userRepository.findByMatricule("CSV_C_01").orElseThrow().isMustChangePassword());
    }
}
