package sn.uasz.vote.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import sn.uasz.vote.dto.VoteRequestDto;
import sn.uasz.vote.dto.VoteResponseDto;
import sn.uasz.vote.security.CustomUserDetailsService;
import sn.uasz.vote.security.JwtAuthenticationFilter;
import sn.uasz.vote.security.JwtTokenProvider;
import sn.uasz.vote.security.SecurityConfig;
import sn.uasz.vote.service.VotingService;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VoteController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@DisplayName("Tests VoteController — Cœur du système de vote sécurisé")
class VoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VotingService votingService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/v1/vote/request-otp
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("OTP Request — 200 OK pour un électeur authentifié éligible")
    @WithMockUser(username = "ELECT001", roles = "ELECTEUR")
    void requestOtp_shouldReturn200_whenEligible() throws Exception {
        when(votingService.requestOtp(eq("ELECT001"), eq(1L)))
                .thenReturn("123456");

        mockMvc.perform(post("/api/v1/vote/request-otp")
                        .param("electionId", "1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.otpCode").value("123456"));
    }

    @Test
    @DisplayName("OTP Request — 403 Forbidden sans authentification")
    void requestOtp_shouldReturn403_whenNotAuthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/vote/request-otp")
                        .param("electionId", "1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("OTP Request — Exception si double vote (déjà voté)")
    @WithMockUser(username = "ELECT001", roles = "ELECTEUR")
    void requestOtp_shouldThrowException_whenAlreadyVoted() {
        when(votingService.requestOtp(eq("ELECT001"), eq(1L)))
                .thenThrow(new IllegalStateException("Vous avez déjà participé à cette élection."));

        assertThrows(Exception.class, () ->
                mockMvc.perform(post("/api/v1/vote/request-otp")
                        .param("electionId", "1")
                        .with(csrf()))
        );
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/v1/vote/verify-otp
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("OTP Verify — 200 OK : OTP valide → VoteToken délivré")
    @WithMockUser(username = "ELECT001", roles = "ELECTEUR")
    void verifyOtp_shouldReturn200_whenOtpValid() throws Exception {
        when(votingService.verifyOtpAndGenerateToken(eq("ELECT001"), eq(1L), eq("654321")))
                .thenReturn("token-uuid-unique");

        mockMvc.perform(post("/api/v1/vote/verify-otp")
                        .param("electionId", "1")
                        .param("otpCode", "654321")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.voteToken").value("token-uuid-unique"));
    }

    @Test
    @DisplayName("OTP Verify — 403 Forbidden sans authentification")
    void verifyOtp_shouldReturn403_whenNotAuthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/vote/verify-otp")
                        .param("electionId", "1")
                        .param("otpCode", "000000"))
                .andExpect(status().isForbidden());
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/v1/vote/submit
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Submit Vote — 200 OK avec VoteToken et candidature valides")
    @WithMockUser(username = "ELECT001", roles = "ELECTEUR")
    void submitVote_shouldReturn200_whenTokenAndCandidatureValid() throws Exception {
        VoteRequestDto request = VoteRequestDto.builder()
                .voteToken("valid-token")
                .electionId(1L)
                .candidatureId(10L)
                .build();

        VoteResponseDto response = VoteResponseDto.builder()
                .success(true)
                .ballotHash("sha256-hash-ballot")
                .build();

        when(votingService.submitVote(eq("valid-token"), eq(1L), eq(10L)))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/vote/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.ballotHash").value("sha256-hash-ballot"));
    }

    @Test
    @DisplayName("Submit Vote — 400 Bad Request si electionId ou candidatureId manquant (@NotNull)")
    @WithMockUser(username = "ELECT001", roles = "ELECTEUR")
    void submitVote_shouldReturn400_whenRequiredFieldsMissing() throws Exception {
        String bodyInvalide = "{\"voteToken\":\"tok\"}";

        mockMvc.perform(post("/api/v1/vote/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyInvalide)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Submit Vote — 403 Forbidden sans authentification")
    void submitVote_shouldReturn403_whenNotAuthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/vote/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
