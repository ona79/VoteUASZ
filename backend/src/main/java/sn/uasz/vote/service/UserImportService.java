package sn.uasz.vote.service;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
public class UserImportService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserImportResultDto importUsersFromCsv(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int failedCount = 0;

        try (CSVReader csvReader = new CSVReaderBuilder(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)).build()) {
            String[] line;
            int lineNumber = 0;
            while ((line = csvReader.readNext()) != null) {
                lineNumber++;
                if (lineNumber == 1 && line[0].toLowerCase().contains("matricule")) {
                    continue; // Saut de l'en-tête
                }
                if (line.length < 8) {
                    errors.add("Ligne " + lineNumber + " : Format invalide (champs insuffisants)");
                    failedCount++;
                    continue;
                }

                String matricule = line[0].trim();
                String nom = line[1].trim();
                String prenom = line[2].trim();
                String email = line[3].trim();
                String telephone = line[4].trim();
                String roleStr = line[5].trim();
                String typeElecteurStr = line[6].trim();
                String ufr = line[7].trim();
                String filiere = line.length > 8 ? line[8].trim() : "";
                String niveau = line.length > 9 ? line[9].trim() : "";

                if (userRepository.existsByMatricule(matricule)) {
                    errors.add("Ligne " + lineNumber + " : Matricule " + matricule + " existe déjà.");
                    failedCount++;
                    continue;
                }

                if (userRepository.existsByEmail(email)) {
                    errors.add("Ligne " + lineNumber + " : Email " + email + " existe déjà.");
                    failedCount++;
                    continue;
                }

                Role role = Role.ELECTEUR;
                try {
                    role = Role.valueOf(roleStr.toUpperCase());
                } catch (Exception ignored) {}

                TypeElecteur typeElecteur = TypeElecteur.ETUDIANT;
                try {
                    typeElecteur = TypeElecteur.valueOf(typeElecteurStr.toUpperCase());
                } catch (Exception ignored) {}

                String defaultPassword = passwordEncoder.encode("PassUasz2026!");

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
            }
        } catch (Exception e) {
            errors.add("Erreur lors de la lecture du fichier CSV : " + e.getMessage());
        }

        return UserImportResultDto.builder()
                .totalSuccess(successCount)
                .totalFailed(failedCount)
                .errors(errors)
                .build();
    }
}
