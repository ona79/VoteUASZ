package sn.uasz.vote.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import sn.uasz.vote.dto.LoginRequest;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.security.CustomUserDetailsService;
import sn.uasz.vote.security.JwtAuthenticationFilter;
import sn.uasz.vote.security.JwtTokenProvider;
import sn.uasz.vote.security.SecurityConfig;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@DisplayName("Tests AuthController — Authentification et Sécurité JWT")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/v1/auth/login
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Login — 200 OK avec identifiants valides (Électeur)")
    void login_shouldReturn200_withValidCredentials() throws Exception {
        LoginRequest request = new LoginRequest("20230001", "ElecteurSecure2026!");

        var mockAuth = new UsernamePasswordAuthenticationToken(
                "20230001", null,
                List.of(new SimpleGrantedAuthority("ROLE_ELECTEUR"))
        );

        User mockUser = User.builder()
                .id(1L).matricule("20230001")
                .nom("Diallo").prenom("Mamadou")
                .email("mamadou@uasz.sn")
                .role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT)
                .ufr("UFR_SAT").filiere("INFORMATIQUE").niveau("L3")
                .build();

        when(authenticationManager.authenticate(any())).thenReturn(mockAuth);
        when(tokenProvider.generateToken(any())).thenReturn("jwt-token-electeur");
        when(userRepository.findByMatricule("20230001")).thenReturn(Optional.of(mockUser));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token-electeur"))
                .andExpect(jsonPath("$.matricule").value("20230001"))
                .andExpect(jsonPath("$.role").value("ELECTEUR"));
    }

    @Test
    @DisplayName("Login — 401 Unauthorized avec mot de passe incorrect")
    void login_shouldReturn401_withBadCredentials() throws Exception {
        LoginRequest request = new LoginRequest("20230001", "MauvaisMotDePasse");

        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Identifiants invalides"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Login — 400 Bad Request si corps vide ou champs manquants")
    void login_shouldReturn400_whenBodyIsEmpty() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Login — 200 OK avec l'email comme identifiant (Admin)")
    void login_shouldReturn200_withEmailAsIdentifier() throws Exception {
        LoginRequest request = new LoginRequest("admin@uasz.sn", "AdminSecure2026!");

        var mockAuth = new UsernamePasswordAuthenticationToken(
                "admin@uasz.sn", null,
                List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))
        );

        User mockAdmin = User.builder()
                .id(99L).matricule("ADMIN001")
                .nom("Admin").prenom("Super")
                .email("admin@uasz.sn")
                .role(Role.SUPER_ADMIN)
                .typeElecteur(TypeElecteur.PATS)
                .build();

        when(authenticationManager.authenticate(any())).thenReturn(mockAuth);
        when(tokenProvider.generateToken(any())).thenReturn("jwt-token-admin");
        when(userRepository.findByMatricule("admin@uasz.sn")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("admin@uasz.sn")).thenReturn(Optional.of(mockAdmin));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token-admin"))
                .andExpect(jsonPath("$.role").value("SUPER_ADMIN"));
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/v1/auth/forgot-password
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Forgot Password — 200 OK avec identifiant existant")
    void forgotPassword_shouldReturn200_whenUserExists() throws Exception {
        User mockUser = User.builder().email("moussa@uasz.sn").matricule("20230001").build();
        when(userRepository.findByMatricule("20230001")).thenReturn(Optional.of(mockUser));

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("identifier", "20230001")))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Instructions de réinitialisation envoyées à moussa@uasz.sn"));
    }

    @Test
    @DisplayName("Forgot Password — 400 Bad Request si identifiant introuvable")
    void forgotPassword_shouldThrowException_whenUserNotFound() throws Exception {
        when(userRepository.findByMatricule("INCONNU")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("INCONNU")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("identifier", "INCONNU")))
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }
}
