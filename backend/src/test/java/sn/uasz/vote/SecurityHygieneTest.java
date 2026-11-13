package sn.uasz.vote;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import sn.uasz.vote.config.DataInitializer;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * LOT D — Hygiène de sécurité : DataInitializer restreint au profil dev,
 * headers X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHygieneTest {

    @Autowired private ApplicationContext context;
    @Autowired private MockMvc mockMvc;

    @Test
    @DisplayName("DataInitializer est annoté @Profile(\"dev\") et absent hors profil dev")
    void dataInitializer_restrictedToDevProfile() {
        Profile profile = DataInitializer.class.getAnnotation(Profile.class);
        assertNotNull(profile);
        assertArrayEquals(new String[]{"dev"}, profile.value());
        assertEquals(0, context.getBeansOfType(DataInitializer.class).size());
    }

    @Test
    @DisplayName("Headers de sécurité HTTP présents hors profil dev (DENY, nosniff, Referrer-Policy)")
    void securityHeaders_presentInNonDevProfile() throws Exception {
        mockMvc.perform(get("/api/v1/elections"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }
}

