package sn.uasz.vote.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.test.context.ActiveProfiles;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Seeders — Non chargés hors du profil dev")
class DemoAndDataSeedersProfileTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("DemoDataSeeder et DataInitializer sont restreints au profil dev et absents du contexte test/prod")
    void seeders_areRestrictedToDevProfileAndNotLoadedInTest() {
        assertFalse(applicationContext.containsBean("demoDataSeeder"));
        assertFalse(applicationContext.containsBean("dataInitializer"));

        ConditionalOnProperty demoCond = DemoDataSeeder.class.getAnnotation(ConditionalOnProperty.class);
        assertNotNull(demoCond);
        assertArrayEquals(new String[]{"app.seed-demo-data"}, demoCond.name());
        assertEquals("true", demoCond.havingValue());
        assertFalse(demoCond.matchIfMissing());

        Profile initProfile = DataInitializer.class.getAnnotation(Profile.class);
        assertNotNull(initProfile);
        assertTrue(Arrays.asList(initProfile.value()).contains("dev"));
        assertFalse(Arrays.asList(initProfile.value()).contains("prod"));
        assertFalse(Arrays.asList(initProfile.value()).contains("test"));
    }
}
