package sn.uasz.vote;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.CandidatureDto;
import sn.uasz.vote.dto.ComplaintDto;
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.*;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.CandidacyService;
import sn.uasz.vote.service.ComplaintService;
import sn.uasz.vote.service.ElectionService;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * LOT B — Contrôle d'accès résultats/candidatures, validation DTO/URLs/dates,
 * modification/suppression d'élection en CONFIGURATION, rate limiting IP (429),
 * et fenêtre légale des réclamations.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
class AccessValidationAndRateLimitTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ElectionRepository electionRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ElectionService electionService;
    @Autowired private CandidacyService candidacyService;
    @Autowired private ComplaintService complaintService;

    private ElectionDto configElection;

    @BeforeEach
    void setUp() {
        userRepository.save(User.builder()
                .matricule("LOTB_ADMIN").nom("Diallo").prenom("Admin").email("lotb_admin@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.SUPER_ADMIN)
                .typeElecteur(TypeElecteur.PATS).ufr("ADMIN").build());
        userRepository.save(User.builder()
                .matricule("LOTB_CAND1").nom("Ndiaye").prenom("Cand1").email("lotb_c1@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.CANDIDAT)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFO").niveau("L3").build());
        userRepository.save(User.builder()
                .matricule("LOTB_CAND2").nom("Diop").prenom("Cand2").email("lotb_c2@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.CANDIDAT)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFO").niveau("L3").build());
        userRepository.save(User.builder()
                .matricule("LOTB_ELEC").nom("Sarr").prenom("Elec").email("lotb_e@uasz.sn")
                .password(passwordEncoder.encode("Pass123!")).role(Role.ELECTEUR)
                .typeElecteur(TypeElecteur.ETUDIANT).ufr("UFR_SAT").filiere("INFO").niveau("L3").build());

        configElection = electionService.createElection(ElectionDto.builder()
                .titre("Scrutin Lot B").description("Test").type(TypeElection.DELEGUE)
                .targetUfr("UFR_SAT").targetFiliere("INFO").targetNiveau("L3")
                .dateDebut(LocalDateTime.now().minusHours(1))
                .dateFin(LocalDateTime.now().plusHours(4))
                .build());
    }

    @Test
    @DisplayName("GET /results/{id} refusé sans auth (401) et refusé à un électeur pendant VOTE_OUVERT (403)")
    void resultsAccess_enforcesAuthAndPhase() throws Exception {
        electionService.changeStatus(configElection.getId(), ElectionStatus.CAMPAGNE);
        electionService.changeStatus(configElection.getId(), ElectionStatus.VOTE_OUVERT);

        mockMvc.perform(get("/api/v1/results/" + configElection.getId()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/results/" + configElection.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("LOTB_ELEC").roles("ELECTEUR")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/results/" + configElection.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("COMM").roles("COMMISSION_ELECTORALE")))
                .andExpect(status().isOk());

        electionService.changeStatus(configElection.getId(), ElectionStatus.DEPOUILLEMENT);
        mockMvc.perform(get("/api/v1/results/" + configElection.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("LOTB_ELEC").roles("ELECTEUR")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /candidacies/election/{id} : anonyme=401, électeur=APPROVED uniquement, commission=toutes")
    void candidaciesAccess_filtersPendingAndRejected() throws Exception {
        CandidatureDto c1 = candidacyService.submitCandidacy(
                CandidatureDto.builder().electionId(configElection.getId()).build(), "LOTB_CAND1");
        CandidatureDto c2 = candidacyService.submitCandidacy(
                CandidatureDto.builder().electionId(configElection.getId()).build(), "LOTB_CAND2");
        candidacyService.validateCandidacy(c1.getId(), true, null);
        candidacyService.validateCandidacy(c2.getId(), false, "Dossier incomplet");

        mockMvc.perform(get("/api/v1/candidacies/election/" + configElection.getId()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/candidacies/election/" + configElection.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("LOTB_ELEC").roles("ELECTEUR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].statut").value("APPROVED"));

        mockMvc.perform(get("/api/v1/candidacies/election/" + configElection.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("COMM").roles("COMMISSION_ELECTORALE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser(username = "LOTB_ADMIN", roles = "SUPER_ADMIN")
    @DisplayName("Validation DTO : @Valid rejette champs vides, URL non-HTTP et dateDebut >= dateFin en JSON 400")
    void validation_rejectsInvalidDtosAndDates() throws Exception {
        // Titre vide + champs manquants -> 400 avec map errors
        mockMvc.perform(post("/api/v1/elections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.titre").exists());

        // dateDebut >= dateFin -> 400
        ElectionDto badDates = ElectionDto.builder()
                .titre("Dates inversées").type(TypeElection.VICE_RECTEUR)
                .dateDebut(LocalDateTime.now().plusDays(2))
                .dateFin(LocalDateTime.now().plusDays(1))
                .build();
        mockMvc.perform(post("/api/v1/elections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badDates)))
                .andExpect(status().isBadRequest());

        // URL javascript: -> 400
        CandidatureDto badUrl = CandidatureDto.builder()
                .electionId(configElection.getId())
                .photoUrl("javascript:alert(1)")
                .build();
        mockMvc.perform(post("/api/v1/candidacies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badUrl)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.photoUrl").exists());
    }

    @Test
    @WithMockUser(username = "LOTB_ADMIN", roles = "SUPER_ADMIN")
    @DisplayName("PUT/DELETE /api/v1/elections/{id} autorisés en CONFIGURATION, refusés (409) après")
    void updateAndDeleteElection_onlyInConfiguration() throws Exception {
        ElectionDto updated = ElectionDto.builder()
                .titre("Scrutin Modifié").description("Maj").type(TypeElection.DELEGUE)
                .dateDebut(LocalDateTime.now().minusHours(1))
                .dateFin(LocalDateTime.now().plusHours(6))
                .build();

        mockMvc.perform(put("/api/v1/elections/" + configElection.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titre").value("Scrutin Modifié"));

        electionService.changeStatus(configElection.getId(), ElectionStatus.CAMPAGNE);

        mockMvc.perform(delete("/api/v1/elections/" + configElection.getId()))
                .andExpect(status().isConflict());

        // Création d'une autre élection en CONFIGURATION puis suppression OK (204)
        ElectionDto temp = electionService.createElection(updated);
        mockMvc.perform(delete("/api/v1/elections/" + temp.getId()))
                .andExpect(status().isNoContent());
        assertFalse(electionRepository.existsById(temp.getId()));
    }

    @Test
    @DisplayName("Réclamations : refusées avant PUBLICATION/CLOTURE, acceptées après, refusées > 48h")
    void complaints_onlyAllowedAfterPublicationOrClotureWithin48h() {
        ComplaintDto dto = ComplaintDto.builder()
                .electionId(configElection.getId())
                .sujet("Contestation")
                .description("Détail de la contestation")
                .build();

        // En CONFIGURATION / VOTE_OUVERT -> refusé
        assertThrows(IllegalStateException.class,
                () -> complaintService.submitComplaint(dto, "LOTB_ELEC"));

        electionService.changeStatus(configElection.getId(), ElectionStatus.CAMPAGNE);
        electionService.changeStatus(configElection.getId(), ElectionStatus.VOTE_OUVERT);
        assertThrows(IllegalStateException.class,
                () -> complaintService.submitComplaint(dto, "LOTB_ELEC"));

        electionService.changeStatus(configElection.getId(), ElectionStatus.DEPOUILLEMENT);
        electionService.changeStatus(configElection.getId(), ElectionStatus.PUBLICATION);
        assertNotNull(complaintService.submitComplaint(dto, "LOTB_ELEC").getId());

        // Passé 48h après dateFin -> refusé
        Election e = electionRepository.findById(configElection.getId()).orElseThrow();
        e.setDateFin(LocalDateTime.now().minusHours(49));
        electionRepository.save(e);
        assertThrows(IllegalStateException.class,
                () -> complaintService.submitComplaint(dto, "LOTB_ELEC"));
    }

    @Test
    @DisplayName("Rate limiting IP : la 21e requête POST /auth/login dans la minute retourne 429")
    void rateLimiting_returns429After20RequestsPerMinute() throws Exception {
        // Avec ClientIpResolver.resolve(), c'est request.getRemoteAddr() qui est utilisé
        // (MockMvc utilise 127.0.0.1). Un header X-Forwarded-For forgé n'est PAS pris en compte.
        String body = "{\"matriculeOrEmail\":\"INCONNU\",\"password\":\"wrong\"}";

        for (int i = 0; i < 20; i++) {
            int status = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, status, "Requête #" + (i + 1) + " ne doit pas être bloquée");
        }

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("Too Many Requests"));
    }
}

