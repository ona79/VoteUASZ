package sn.uasz.vote.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.*;

/**
 * LOT C — Tests d'intégration pour AdminBootstrapInitializer.
 *
 * Couvre : création si aucun admin, idempotence, refus mot de passe faible,
 * refus variables manquantes, et vérification que le login fonctionne après création.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AdminBootstrapInitializer — Bootstrap du premier SUPER_ADMIN")
class AdminBootstrapInitializerTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private AdminBootstrapInitializer bootstrapInitializer;

    @BeforeEach
    void setUp() {
        bootstrapInitializer = new AdminBootstrapInitializer(userRepository, passwordEncoder);
    }

    @Test
    @Transactional
    @DisplayName("LOT C — Crée un SUPER_ADMIN quand aucun n'existe et les variables sont valides")
    void run_createsSuperAdmin_whenNoneExistsAndVarsValid() throws Exception {
        // Assure qu'aucun SUPER_ADMIN n'existe (en contexte de test la BDD est isolée par @Transactional)
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN)
                .forEach(userRepository::delete);

        setBootstrapVars("TESTADMIN01", "testadmin@uasz.sn", "StrongPass@2026!");

        bootstrapInitializer.run();

        assertTrue(userRepository.existsByRole(Role.SUPER_ADMIN),
                "Un SUPER_ADMIN doit avoir été créé");
        assertTrue(userRepository.existsByMatricule("TESTADMIN01"),
                "Le matricule doit correspondre à ADMIN_MATRICULE");

        // Vérifie que le mot de passe est haché (BCrypt)
        User created = userRepository.findByMatricule("TESTADMIN01").orElseThrow();
        assertTrue(passwordEncoder.matches("StrongPass@2026!", created.getPassword()),
                "Le mot de passe doit être haché avec BCrypt et correspondre à ADMIN_PASSWORD");
        assertTrue(created.isActive(), "Le compte doit être actif");
        assertEquals(Role.SUPER_ADMIN, created.getRole());
        assertFalse(created.getPassword().contains("StrongPass"), "Le mot de passe brut ne doit pas être stocké en clair");
    }

    @Test
    @Transactional
    @DisplayName("LOT C — Idempotent : aucune création si un SUPER_ADMIN existe déjà")
    void run_doesNothing_whenSuperAdminAlreadyExists() throws Exception {
        // Crée un SUPER_ADMIN initial
        userRepository.save(User.builder()
                .matricule("EXISTING_ADMIN").nom("Admin").prenom("Existing")
                .email("existing@uasz.sn").password(passwordEncoder.encode("AnyPass@2026!"))
                .role(Role.SUPER_ADMIN).typeElecteur(TypeElecteur.PATS).ufr("ADMIN").active(true)
                .build());

        long countBefore = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN).count();

        setBootstrapVars("NEWADMIN", "newadmin@uasz.sn", "StrongPass@2026!");

        bootstrapInitializer.run();

        long countAfter = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN).count();
        assertEquals(countBefore, countAfter,
                "Aucun nouveau SUPER_ADMIN ne doit être créé si un existe déjà");
        assertFalse(userRepository.existsByMatricule("NEWADMIN"),
                "Le nouveau matricule NEWADMIN ne doit pas avoir été créé");
    }

    @Test
    @Transactional
    @DisplayName("LOT C — Refuse de démarrer si ADMIN_PASSWORD est trop faible")
    void run_throwsIfPasswordTooWeak() {
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN)
                .forEach(userRepository::delete);

        setBootstrapVars("WEAKADMIN", "weak@uasz.sn", "faible"); // mot de passe trop court/faible

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                bootstrapInitializer::run,
                "L'application doit refuser de démarrer avec un mot de passe faible");
        assertTrue(ex.getMessage().contains("trop faible") || ex.getMessage().contains("faible"),
                "Le message d'erreur doit indiquer que le mot de passe est trop faible");
        assertFalse(userRepository.existsByMatricule("WEAKADMIN"),
                "Aucun compte ne doit avoir été créé avec un mot de passe faible");
    }

    @Test
    @Transactional
    @DisplayName("LOT C — Refuse de démarrer si ADMIN_MATRICULE est absent")
    void run_throwsIfMatriculeIsMissing() {
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN)
                .forEach(userRepository::delete);

        setBootstrapVars("", "admin@uasz.sn", "StrongPass@2026!"); // matricule vide

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                bootstrapInitializer::run,
                "L'application doit refuser de démarrer si ADMIN_MATRICULE est vide");
        assertTrue(ex.getMessage().contains("ADMIN_MATRICULE"),
                "Le message d'erreur doit identifier ADMIN_MATRICULE comme manquant");
    }

    @Test
    @Transactional
    @DisplayName("LOT C — Refuse de démarrer si ADMIN_EMAIL est absent")
    void run_throwsIfEmailIsMissing() {
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN)
                .forEach(userRepository::delete);

        setBootstrapVars("ADMINX", "", "StrongPass@2026!"); // email vide

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                bootstrapInitializer::run,
                "L'application doit refuser de démarrer si ADMIN_EMAIL est vide");
        assertTrue(ex.getMessage().contains("ADMIN_EMAIL"),
                "Le message d'erreur doit identifier ADMIN_EMAIL comme manquant");
    }

    @Test
    @Transactional
    @DisplayName("LOT C — Le mot de passe n'est jamais loggué (brut absent du compte créé)")
    void run_passwordIsNeverStoredInPlainText() throws Exception {
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN)
                .forEach(userRepository::delete);

        String plainPassword = "StrongPass@Secure2026!";
        setBootstrapVars("SECUREADMIN", "secureadmin@uasz.sn", plainPassword);

        bootstrapInitializer.run();

        User created = userRepository.findByMatricule("SECUREADMIN").orElseThrow();
        assertNotEquals(plainPassword, created.getPassword(),
                "Le mot de passe brut ne doit jamais être stocké en base");
        assertTrue(created.getPassword().startsWith("$2a$") || created.getPassword().startsWith("$2b$"),
                "Le mot de passe doit être haché avec BCrypt");
    }

    // Helper : injecte les valeurs de bootstrap via ReflectionTestUtils
    private void setBootstrapVars(String matricule, String email, String password) {
        ReflectionTestUtils.setField(bootstrapInitializer, "adminMatricule", matricule);
        ReflectionTestUtils.setField(bootstrapInitializer, "adminEmail", email);
        ReflectionTestUtils.setField(bootstrapInitializer, "adminPassword", password);
    }
}

