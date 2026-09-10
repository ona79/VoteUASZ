package sn.uasz.vote.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.enums.TypeElection;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.repository.UserRepository;

import java.time.LocalDateTime;

/**
 * Initialiseur de données de démonstration au démarrage de l'application VoteUASZ.
 * Actif uniquement en mode hors-test (@Profile("!test")).
 */
@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ElectionRepository electionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("👉 Initialisation des comptes de démo pré-provisionnés UASZ...");

        if (!userRepository.existsByMatricule("ADMIN001")) {
            userRepository.save(User.builder()
                    .matricule("ADMIN001")
                    .nom("Diallo")
                    .prenom("SuperAdmin")
                    .email("admin@uasz.sn")
                    .password(passwordEncoder.encode("AdminSecure2026!"))
                    .role(Role.SUPER_ADMIN)
                    .typeElecteur(TypeElecteur.PATS)
                    .ufr("ADMINISTRATION")
                    .active(true)
                    .build());
        }

        if (!userRepository.existsByMatricule("COMM001")) {
            userRepository.save(User.builder()
                    .matricule("COMM001")
                    .nom("Sow")
                    .prenom("Président Commission")
                    .email("commission@uasz.sn")
                    .password(passwordEncoder.encode("CommSecure2026!"))
                    .role(Role.COMMISSION_ELECTORALE)
                    .typeElecteur(TypeElecteur.ENSEIGNANT)
                    .ufr("UFR_SAT")
                    .active(true)
                    .build());
        }

        if (!userRepository.existsByMatricule("CAND202301")) {
            userRepository.save(User.builder()
                    .matricule("CAND202301")
                    .nom("Ndiaye")
                    .prenom("Awa")
                    .email("candidate@uasz.sn")
                    .password(passwordEncoder.encode("CandSecure2026!"))
                    .role(Role.CANDIDAT)
                    .typeElecteur(TypeElecteur.ETUDIANT)
                    .ufr("UFR_SAT")
                    .filiere("INFORMATIQUE")
                    .niveau("L3")
                    .active(true)
                    .build());
        }

        if (!userRepository.existsByMatricule("20230001")) {
            userRepository.save(User.builder()
                    .matricule("20230001")
                    .nom("Sarr")
                    .prenom("Moussa")
                    .email("moussa@uasz.sn")
                    .password(passwordEncoder.encode("ElecteurSecure2026!"))
                    .role(Role.ELECTEUR)
                    .typeElecteur(TypeElecteur.ETUDIANT)
                    .ufr("UFR_SAT")
                    .filiere("INFORMATIQUE")
                    .niveau("L3")
                    .active(true)
                    .build());
        }

        if (electionRepository.count() == 0) {
            log.info("👉 Création d'une élection exemple pour les tests manuels...");

            electionRepository.save(Election.builder()
                    .titre("Élection Délégué L3 Informatique 2026")
                    .description("Scrutin officiel pour l'élection du délégué de classe de la promotion L3 Informatique (UFR SAT).")
                    .type(TypeElection.DELEGUE)
                    .statut(ElectionStatus.VOTE_OUVERT)
                    .targetUfr("UFR_SAT")
                    .targetFiliere("INFORMATIQUE")
                    .targetNiveau("L3")
                    .dateDebut(LocalDateTime.now().minusHours(2))
                    .dateFin(LocalDateTime.now().plusHours(24))
                    .createdAt(LocalDateTime.now())
                    .build());
        }

        log.info("✅ Comptes de démo prêts pour l'utilisation (ADMIN001, COMM001, CAND202301, 20230001).");
    }
}
