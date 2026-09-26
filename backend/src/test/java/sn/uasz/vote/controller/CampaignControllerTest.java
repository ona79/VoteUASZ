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
import sn.uasz.vote.dto.CampaignPostDto;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.security.CustomUserDetailsService;
import sn.uasz.vote.security.JwtAuthenticationFilter;
import sn.uasz.vote.security.JwtTokenProvider;
import sn.uasz.vote.security.SecurityConfig;
import sn.uasz.vote.service.CampaignService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CampaignController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@DisplayName("Tests CampaignController — Endpoints de publication de campagne")
class CampaignControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CampaignService campaignService;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    @WithMockUser(username = "CAND001", roles = "CANDIDAT")
    @DisplayName("POST /api/v1/candidatures/3/posts — 200 OK pour rôle CANDIDAT")
    void createPost_candidaturePath_shouldReturn200_whenCandidat() throws Exception {
        CampaignPostDto req = CampaignPostDto.builder()
                .titre("Notre Programme L3")
                .contenu("Présentation des objectifs.")
                .videoEmbedUrl("https://youtube.com/watch?v=123")
                .build();

        CampaignPostDto res = CampaignPostDto.builder()
                .id(10L)
                .candidatureId(3L)
                .titre("Notre Programme L3")
                .contenu("Présentation des objectifs.")
                .videoEmbedUrl("https://youtube.com/watch?v=123")
                .build();

        when(campaignService.createCampaignPost(any(CampaignPostDto.class), eq("CAND001"))).thenReturn(res);

        mockMvc.perform(post("/api/v1/candidatures/3/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.candidatureId").value(3))
                .andExpect(jsonPath("$.titre").value("Notre Programme L3"));
    }

    @Test
    @DisplayName("GET /api/v1/candidatures/3/posts — 200 OK pour utilisateur public")
    void getPostsByCandidature_shouldReturn200_public() throws Exception {
        CampaignPostDto post1 = CampaignPostDto.builder().id(1L).candidatureId(3L).titre("Post 1").build();
        when(campaignService.getPostsByCandidature(3L)).thenReturn(List.of(post1));

        mockMvc.perform(get("/api/v1/candidatures/3/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].titre").value("Post 1"));
    }
}
