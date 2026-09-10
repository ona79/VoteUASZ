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
import sn.uasz.vote.dto.ComplaintDto;
import sn.uasz.vote.enums.ComplaintStatus;
import sn.uasz.vote.security.CustomUserDetailsService;
import sn.uasz.vote.security.JwtAuthenticationFilter;
import sn.uasz.vote.security.JwtTokenProvider;
import sn.uasz.vote.security.SecurityConfig;
import sn.uasz.vote.service.ComplaintService;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ComplaintController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@DisplayName("Tests ComplaintController — Gestion des Réclamations Électorales")
class ComplaintControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ComplaintService complaintService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/v1/complaints — Soumettre une réclamation
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Soumettre Réclamation — 200 OK pour un électeur authentifié")
    @WithMockUser(username = "ELECT001", roles = "ELECTEUR")
    void submitComplaint_shouldReturn200_whenAuthenticated() throws Exception {
        ComplaintDto input = ComplaintDto.builder()
                .electionId(1L)
                .sujet("Irrégularité lors du dépouillement")
                .description("J'ai constaté que plusieurs bulletins ont été comptés deux fois.")
                .build();

        ComplaintDto response = ComplaintDto.builder()
                .id(42L)
                .electionId(1L)
                .sujet("Irrégularité lors du dépouillement")
                .description("J'ai constaté que plusieurs bulletins ont été comptés deux fois.")
                .statut(ComplaintStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(complaintService.submitComplaint(any(ComplaintDto.class), eq("ELECT001")))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/complaints")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.statut").value("PENDING"))
                .andExpect(jsonPath("$.sujet").value("Irrégularité lors du dépouillement"));
    }

    @Test
    @DisplayName("Soumettre Réclamation — 403 Forbidden sans authentification")
    void submitComplaint_shouldReturn403_whenNotAuthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/complaints")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/v1/complaints/my-complaints
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Mes Réclamations — 200 OK retourne la liste des réclamations de l'utilisateur")
    @WithMockUser(username = "ELECT001", roles = "ELECTEUR")
    void getMyComplaints_shouldReturn200_withList() throws Exception {
        List<ComplaintDto> complaints = List.of(
                ComplaintDto.builder().id(1L).sujet("Problème 1").statut(ComplaintStatus.PENDING).build(),
                ComplaintDto.builder().id(2L).sujet("Problème 2").statut(ComplaintStatus.RESOLVED).build()
        );

        when(complaintService.getComplaintsByUser("ELECT001")).thenReturn(complaints);

        mockMvc.perform(get("/api/v1/complaints/my-complaints")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].statut").value("PENDING"))
                .andExpect(jsonPath("$[1].statut").value("RESOLVED"));
    }

    @Test
    @DisplayName("Mes Réclamations — 403 Forbidden sans authentification")
    void getMyComplaints_shouldReturn403_whenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/complaints/my-complaints"))
                .andExpect(status().isForbidden());
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/v1/complaints/election/{id} — Accès réservé Commission/Admin
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Réclamations par Élection — 200 OK pour la Commission Électorale")
    @WithMockUser(username = "COMM001", roles = "COMMISSION_ELECTORALE")
    void getComplaintsByElection_shouldReturn200_forCommission() throws Exception {
        List<ComplaintDto> complaints = List.of(
                ComplaintDto.builder().id(10L).sujet("Réclamation élection 5").statut(ComplaintStatus.UNDER_REVIEW).build()
        );

        when(complaintService.getComplaintsByElection(5L)).thenReturn(complaints);

        mockMvc.perform(get("/api/v1/complaints/election/5")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].statut").value("UNDER_REVIEW"));
    }

    @Test
    @DisplayName("Réclamations par Élection — 403 Forbidden pour un Électeur (accès refusé)")
    @WithMockUser(username = "ELECT001", roles = "ELECTEUR")
    void getComplaintsByElection_shouldReturn403_forElecteur() throws Exception {
        mockMvc.perform(get("/api/v1/complaints/election/5")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ───────────────────────────────────────────────────────────────────────
    // PUT /api/v1/complaints/{id}/resolve — Répondre à une réclamation
    // ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Résoudre Réclamation — 200 OK pour le Super-Admin")
    @WithMockUser(username = "ADMIN001", roles = "SUPER_ADMIN")
    void resolveComplaint_shouldReturn200_forAdmin() throws Exception {
        ComplaintDto resolved = ComplaintDto.builder()
                .id(42L)
                .statut(ComplaintStatus.RESOLVED)
                .reponseCommission("Réclamation traitée après vérification du procès-verbal.")
                .build();

        when(complaintService.resolveComplaint(eq(42L), eq(ComplaintStatus.RESOLVED), anyString()))
                .thenReturn(resolved);

        mockMvc.perform(put("/api/v1/complaints/42/resolve")
                        .param("status", "RESOLVED")
                        .param("reponseCommission", "Réclamation traitée après vérification du procès-verbal.")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("RESOLVED"));
    }

    @Test
    @DisplayName("Résoudre Réclamation — 403 Forbidden pour un Candidat")
    @WithMockUser(username = "CAND001", roles = "CANDIDAT")
    void resolveComplaint_shouldReturn403_forCandidat() throws Exception {
        mockMvc.perform(put("/api/v1/complaints/42/resolve")
                        .param("status", "RESOLVED")
                        .param("reponseCommission", "Test")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }
}
