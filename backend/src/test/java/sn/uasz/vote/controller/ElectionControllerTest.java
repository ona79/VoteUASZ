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
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.TypeElection;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.security.CustomUserDetailsService;
import sn.uasz.vote.security.JwtAuthenticationFilter;
import sn.uasz.vote.security.JwtTokenProvider;
import sn.uasz.vote.security.SecurityConfig;
import sn.uasz.vote.service.ElectionService;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ElectionController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@DisplayName("Tests ElectionController — Sécurité et Endpoints Élections")
class ElectionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ElectionService electionService;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    @DisplayName("GET /api/v1/elections — 200 OK pour tout le monde (public)")
    void getAllElections_shouldReturn200_public() throws Exception {
        when(electionService.getAllElections()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/elections"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "ADMIN001", roles = "SUPER_ADMIN")
    @DisplayName("POST /api/v1/elections — 200 OK avec le rôle SUPER_ADMIN")
    void createElection_shouldReturn200_whenSuperAdmin() throws Exception {
        ElectionDto dto = ElectionDto.builder()
                .titre("Élection Test 2026")
                .description("Description test")
                .type(TypeElection.DELEGUE)
                .targetUfr("UFR_SAT")
                .targetFiliere("INFORMATIQUE")
                .targetNiveau("L3")
                .dateDebut(LocalDateTime.now())
                .dateFin(LocalDateTime.now().plusDays(1))
                .build();

        ElectionDto responseDto = ElectionDto.builder()
                .id(1L)
                .titre("Élection Test 2026")
                .statut(ElectionStatus.CONFIGURATION)
                .build();

        when(electionService.createElection(any())).thenReturn(responseDto);

        mockMvc.perform(post("/api/v1/elections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.statut").value("CONFIGURATION"));
    }

    @Test
    @WithMockUser(username = "20230001", roles = "ELECTEUR")
    @DisplayName("POST /api/v1/elections — 403 Forbidden pour un Électeur")
    void createElection_shouldReturn403_whenElecteur() throws Exception {
        ElectionDto dto = ElectionDto.builder().titre("Test").build();

        mockMvc.perform(post("/api/v1/elections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }
}
