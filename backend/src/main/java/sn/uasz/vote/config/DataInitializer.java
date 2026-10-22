package sn.uasz.vote.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import sn.uasz.vote.entity.CampaignPost;
import sn.uasz.vote.entity.Candidature;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.enums.TypeElection;
import sn.uasz.vote.repository.CampaignPostRepository;
import sn.uasz.vote.repository.CandidatureRepository;
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
    private final CandidatureRepository candidatureRepository;
    private final CampaignPostRepository campaignPostRepository;
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

        User cand1 = userRepository.findByMatricule("CAND202301").orElseGet(() ->
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
                    .build())
        );

        User cand2 = userRepository.findByMatricule("CAND202302").orElseGet(() ->
            userRepository.save(User.builder()
                    .matricule("CAND202302")
                    .nom("Diop")
                    .prenom("Cheikh Tidiane")
                    .email("cheikh.diop@uasz.sn")
                    .password(passwordEncoder.encode("CandSecure2026!"))
                    .role(Role.CANDIDAT)
                    .typeElecteur(TypeElecteur.ETUDIANT)
                    .ufr("UFR_SAT")
                    .filiere("INFORMATIQUE")
                    .niveau("L3")
                    .active(true)
                    .build())
        );

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

        Election delegueElection = electionRepository.findAll().stream()
                .filter(e -> e.getTitre().contains("L3 Informatique"))
                .findFirst()
                .orElseGet(() -> electionRepository.save(Election.builder()
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
                        .build()));

        // Ensure candidatures for delegueElection
        if (candidatureRepository.findByElectionId(delegueElection.getId()).isEmpty()) {
            log.info("👉 Création des candidatures de démo pour le scrutin L3...");
            Candidature c1 = candidatureRepository.save(Candidature.builder()
                    .election(delegueElection)
                    .candidat(cand1)
                    .nomListe("Awa Ndiaye")
                    .photoUrl("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80")
                    .programmePdf("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
                    .statut(CandidacyStatus.APPROVED)
                    .build());

            campaignPostRepository.save(CampaignPost.builder()
                    .candidature(c1)
                    .titre("Pour une promotion unie et dynamique")
                    .contenu("Chers étudiants de L3 Informatique, mon engagement repose sur l'entraide, des ateliers de révision et un partenariat fort avec l'administration.")
                    .afficheUrl("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80")
                    .videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
                    .build());

            Candidature c2 = candidatureRepository.save(Candidature.builder()
                    .election(delegueElection)
                    .candidat(cand2)
                    .nomListe("Cheikh Tidiane Diop")
                    .photoUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80")
                    .programmePdf("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
                    .statut(CandidacyStatus.APPROVED)
                    .build());

            campaignPostRepository.save(CampaignPost.builder()
                    .candidature(c2)
                    .titre("Innovation, Équité et Réussite pour Tous")
                    .contenu("Modernisons nos conditions de travail en laboratoire, facilitons l'accès aux ressources numériques et valorisons les projets étudiants.")
                    .afficheUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80")
                    .videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
                    .build());
        }

        // Ensure election in CAMPAGNE exists
        boolean hasCampagne = electionRepository.findAll().stream().anyMatch(e -> e.getStatut() == ElectionStatus.CAMPAGNE);
        if (!hasCampagne) {
            electionRepository.save(Election.builder()
                    .titre("Élection Délégué UFR SAT 2026")
                    .description("Élection des représentants étudiants au conseil de l'UFR des Sciences et Technologies.")
                    .type(TypeElection.DUFR)
                    .statut(ElectionStatus.CAMPAGNE)
                    .targetUfr("UFR_SAT")
                    .dateDebut(LocalDateTime.now().minusDays(1))
                    .dateFin(LocalDateTime.now().plusDays(5))
                    .createdAt(LocalDateTime.now())
                    .build());
        }

        // Ensure election in CONFIGURATION exists
        boolean hasConfig = electionRepository.findAll().stream().anyMatch(e -> e.getStatut() == ElectionStatus.CONFIGURATION);
        if (!hasConfig) {
            electionRepository.save(Election.builder()
                    .titre("Élection Vice-Recteur Étudiant 2026")
                    .description("Scrutin universitaire général pour la représentation étudiante au rectorat UASZ.")
                    .type(TypeElection.VICE_RECTEUR)
                    .statut(ElectionStatus.CONFIGURATION)
                    .targetUfr("UFR_SAT")
                    .dateDebut(LocalDateTime.now().plusDays(2))
                    .dateFin(LocalDateTime.now().plusDays(10))
                    .createdAt(LocalDateTime.now())
                    .build());
        }

        log.info("✅ Comptes de démo prêts pour l'utilisation (ADMIN001, COMM001, CAND202301, CAND202302, 20230001).");
    }
}
