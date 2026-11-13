package sn.uasz.vote.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;

import java.util.regex.Pattern;

/**
 * Bootstrap du premier compte SUPER_ADMIN en production.
 *
 * <p>Ce composant est actif sur tous les profils sauf {@code dev} (couvert par DataInitializer)
 * et {@code test} (les tests gèrent leur propre BDD).</p>
 *
 * <p>Comportement idempotent :
 * <ul>
 *   <li>Si un SUPER_ADMIN existe déjà en base → rien n'est fait.</li>
 *   <li>Si aucun SUPER_ADMIN n'existe ET les variables {@code ADMIN_MATRICULE}, {@code ADMIN_EMAIL},
 *       {@code ADMIN_PASSWORD} sont définies ET le mot de passe est fort (12+ car., maj, min,
 *       chiffre, symbole) → le compte est créé.</li>
 *   <li>Si aucun SUPER_ADMIN n'existe ET les variables sont manquantes → erreur fatale au démarrage
 *       avec un message explicite (l'appli refuse de démarrer).</li>
 *   <li>Si le mot de passe est trop faible → erreur fatale au démarrage.</li>
 * </ul>
 * </p>
 *
 * <p><strong>Sécurité</strong> : le mot de passe n'est jamais loggué. Seul le matricule est
 * affiché dans les logs de création.</p>
 */
@Slf4j
@Component
@Profile("!dev & !test")
@RequiredArgsConstructor
public class AdminBootstrapInitializer implements CommandLineRunner {

    /**
     * Politique de mot de passe fort : 12+ caractères, au moins 1 majuscule, 1 minuscule,
     * 1 chiffre et 1 caractère spécial.
     */
    private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{12,}$"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.matricule:}")
    private String adminMatricule;

    @Value("${app.bootstrap-admin.email:}")
    private String adminEmail;

    @Value("${app.bootstrap-admin.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        // Si un SUPER_ADMIN existe déjà → idempotent, rien à faire
        if (userRepository.existsByRole(Role.SUPER_ADMIN)) {
            log.info("[AdminBootstrap] Un compte SUPER_ADMIN existe déjà en base. Bootstrap ignoré.");
            return;
        }

        // Aucun SUPER_ADMIN en base → les variables sont obligatoires
        boolean matriculeAbsent = adminMatricule == null || adminMatricule.isBlank();
        boolean emailAbsent = adminEmail == null || adminEmail.isBlank();
        boolean passwordAbsent = adminPassword == null || adminPassword.isBlank();

        if (matriculeAbsent || emailAbsent || passwordAbsent) {
            String manquantes = String.join(", ",
                    matriculeAbsent ? "ADMIN_MATRICULE" : "",
                    emailAbsent    ? "ADMIN_EMAIL"    : "",
                    passwordAbsent ? "ADMIN_PASSWORD"  : ""
            ).replaceAll("(^,\\s*)|(,\\s*$)|(,\\s*,)", "").strip();

            throw new IllegalStateException(
                    "[AdminBootstrap] ERREUR FATALE : Aucun compte SUPER_ADMIN n'existe en base, " +
                    "mais les variables d'environnement obligatoires sont manquantes ou vides : " +
                    manquantes + ". " +
                    "Définissez ADMIN_MATRICULE, ADMIN_EMAIL et ADMIN_PASSWORD avant de démarrer l'application."
            );
        }

        // Validation de la force du mot de passe
        if (!STRONG_PASSWORD_PATTERN.matcher(adminPassword).matches()) {
            throw new IllegalStateException(
                    "[AdminBootstrap] ERREUR FATALE : ADMIN_PASSWORD trop faible. " +
                    "Le mot de passe doit contenir au minimum 12 caractères avec " +
                    "au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial."
            );
        }

        // Création du compte SUPER_ADMIN initial
        userRepository.save(User.builder()
                .matricule(adminMatricule.trim())
                .nom("Admin")
                .prenom("UASZ")
                .email(adminEmail.trim())
                .password(passwordEncoder.encode(adminPassword))
                .role(Role.SUPER_ADMIN)
                .typeElecteur(TypeElecteur.PATS)
                .ufr("ADMINISTRATION")
                .active(true)
                .build());

        // NE PAS loguer le mot de passe — uniquement le matricule
        log.info("[AdminBootstrap] Premier compte SUPER_ADMIN créé avec succès : {}. " +
                 "Connectez-vous et changez le mot de passe dès que possible.", adminMatricule.trim());
    }
}

