package sn.uasz.vote.service;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.opencsv.RFC4180Parser;
import com.opencsv.RFC4180ParserBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import sn.uasz.vote.dto.UserImportResultDto;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.repository.UserRepository;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserImportService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /** Mot de passe par défaut attribué aux électeurs importés via CSV.
     *  Configurable via la variable d'environnement DEFAULT_ELECTEUR_PASSWORD. */
    @Value("${app.default-electeur-password}")
    private String defaultElecteurPassword;

    @Value("${app.default-candidat-password:CHANGEME_REQUIRED_CANDIDAT_PASSWORD_2026}")
    private String defaultCandidatPassword;

    // Nombre minimum de colonnes attendues (matricule..niveau inclus)
    private static final int MIN_COLUMNS = 10;

    @Transactional
    public UserImportResultDto importUsersFromCsv(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        List<String> existingMatricules = new ArrayList<>();
        List<String> existingEmails = new ArrayList<>();
        int successCount = 0;
        int failedCount = 0;

        // Utiliser RFC4180Parser pour gérer correctement
        // les fins de fichier sans retour à la ligne final (\n absent après la dernière ligne)
        RFC4180Parser rfc4180Parser = new RFC4180ParserBuilder()
                .withSeparator(',')
                .build();

        try (CSVReader csvReader = new CSVReaderBuilder(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))
                .withCSVParser(rfc4180Parser)
                .build()) {

            String[] line;
            int lineNumber = 0;

            while ((line = csvReader.readNext()) != null) {
                lineNumber++;

                // Saut de l'en-tête
                if (lineNumber == 1 && line[0].toLowerCase().contains("matricule")) {
                    continue;
                }

                // Ignorer les lignes complètement vides
                if (line.length == 1 && line[0].trim().isEmpty()) {
                    continue;
                }

                if (line.length < MIN_COLUMNS) {
                    errors.add("Ligne " + lineNumber + " : Format invalide (" + line.length
                            + " colonne(s) trouvée(s), " + MIN_COLUMNS + " attendue(s)).");
                    failedCount++;
                    continue;
                }

                String matricule       = line[0].trim();
                String nom             = line[1].trim();
                String prenom          = line[2].trim();
                String email           = line[3].trim();
                String telephone       = line[4].trim();
                String roleStr         = line[5].trim();
                String typeElecteurStr = line[6].trim();
                String ufr             = line[7].trim();
                String filiere         = line[8].trim();
                String niveau          = line[9].trim();

                log.debug("Ligne {} — matricule={}, niveau={}, colonnes={}", lineNumber, matricule, niveau, line.length);

                // Vérification si le matricule existe déjà en base
                if (userRepository.existsByMatricule(matricule)) {
                    existingMatricules.add(matricule);
                    failedCount++;
                    continue;
                }

                // Vérification si l'email existe déjà en base
                if (userRepository.existsByEmail(email)) {
                    existingEmails.add(email);
                    failedCount++;
                    continue;
                }

                Role role = Role.ELECTEUR;
                try {
                    role = Role.valueOf(roleStr.toUpperCase());
                } catch (Exception e) {
                    log.warn("Ligne {} : rôle '{}' non reconnu, ELECTEUR utilisé par défaut.", lineNumber, roleStr);
                }

                TypeElecteur typeElecteur = TypeElecteur.ETUDIANT;
                try {
                    typeElecteur = TypeElecteur.valueOf(typeElecteurStr.toUpperCase());
                } catch (Exception e) {
                    log.warn("Ligne {} : typeElecteur '{}' non reconnu, ETUDIANT utilisé par défaut.", lineNumber, typeElecteurStr);
                }

                String rawPassword = (role == Role.CANDIDAT) ? defaultCandidatPassword : defaultElecteurPassword;
                String defaultPassword = passwordEncoder.encode(rawPassword);

                User user = User.builder()
                        .matricule(matricule)
                        .nom(nom)
                        .prenom(prenom)
                        .email(email)
                        .telephone(telephone)
                        .password(defaultPassword)
                        .role(role)
                        .typeElecteur(typeElecteur)
                        .ufr(ufr)
                        .filiere(filiere)
                        .niveau(niveau)
                        .active(true)
                        .build();

                userRepository.save(user);
                successCount++;

                var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                String adminMatricule = (auth != null && auth.getName() != null) ? auth.getName() : "SYSTEM";

                if (role == Role.SUPER_ADMIN || role == Role.COMMISSION_ELECTORALE) {
                    log.warn("[CRÉATION COMPTE PRIVILÉGIÉ] Rôle={} — Matricule='{}' (email='{}') créé par l'administrateur '{}' via import CSV",
                            role, matricule, email, adminMatricule);
                } else {
                    log.info("Ligne {} : utilisateur '{}' importé avec succès (niveau={}).", lineNumber, matricule, niveau);
                }
            }

        } catch (Exception e) {
            log.error("Erreur fatale lors de la lecture du fichier CSV : {}", e.getMessage(), e);
            errors.add("Erreur lors de la lecture du fichier CSV : " + e.getMessage());
        }

        // Synthèse explicite et regroupée des comptes déjà existants (ex: "X comptes existent déjà : 20230002, 20230003...")
        if (!existingMatricules.isEmpty()) {
            String listStr = String.join(", ", existingMatricules);
            if (existingMatricules.size() == 1) {
                errors.add("1 compte existe déjà en base de données (matricule : " + listStr + "). Ligne ignorée.");
            } else {
                errors.add(existingMatricules.size() + " comptes existent déjà en base de données (matricules : " + listStr + "). Lignes ignorées.");
            }
        }

        if (!existingEmails.isEmpty()) {
            String listStr = String.join(", ", existingEmails);
            errors.add(existingEmails.size() + " email(s) déjà utilisé(s) en base de données (" + listStr + "). Lignes ignorées.");
        }

        log.info("Import CSV terminé — succès: {}, échecs: {}", successCount, failedCount);

        return UserImportResultDto.builder()
                .totalSuccess(successCount)
                .totalFailed(failedCount)
                .errors(errors)
                .build();
    }
}
