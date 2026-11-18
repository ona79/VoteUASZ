package sn.uasz.vote.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.entity.Ballot;
import sn.uasz.vote.entity.CampaignPost;
import sn.uasz.vote.entity.Candidature;
import sn.uasz.vote.entity.Complaint;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.entity.VoterAuditLog;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ComplaintStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.enums.Role;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.enums.TypeElection;
import sn.uasz.vote.repository.BallotRepository;
import sn.uasz.vote.repository.CampaignPostRepository;
import sn.uasz.vote.repository.CandidatureRepository;
import sn.uasz.vote.repository.ComplaintRepository;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.repository.PasswordResetTokenRepository;
import sn.uasz.vote.repository.RefreshTokenRepository;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.repository.VoteOTPRepository;
import sn.uasz.vote.repository.VoteTokenRepository;
import sn.uasz.vote.repository.VoterAuditLogRepository;
import sn.uasz.vote.service.AuditService;
import sn.uasz.vote.service.CryptoService;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Seeder de démonstration UASZ exécutable une seule fois sur demande explicite
 * via la variable d'environnement {@code SEED_DEMO_DATA=true}.
 *
 * <p>Garde-fous :
 * <ul>
 *   <li>Désactivé par défaut ({@code app.seed-demo-data=false}).</li>
 *   <li>Idempotent : vérifie et pose un marqueur en base ({@code seed_markers})
 *       afin de ne jamais s'exécuter deux fois ni écraser de futurs scrutins.</li>
 *   <li>Utilise les variables {@code DEFAULT_ELECTEUR_PASSWORD} et
 *       {@code DEFAULT_CANDIDAT_PASSWORD} sans aucun mot de passe en clair.</li>
 *   <li>Chiffre les bulletins et calcule la chaîne SHA-256 avec la clé active
 *       ({@code CRYPTO_SECRET}) de l'environnement cible.</li>
 * </ul>
 * </p>
 */
@Slf4j
@Component
@Order(10)
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true")
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {

    private static final String MARKER_ID = "UASZ_DEMO_2026";

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final ElectionRepository electionRepository;
    private final CandidatureRepository candidatureRepository;
    private final CampaignPostRepository campaignPostRepository;
    private final BallotRepository ballotRepository;
    private final VoterAuditLogRepository voterAuditLogRepository;
    private final ComplaintRepository complaintRepository;
    private final VoteOTPRepository voteOTPRepository;
    private final VoteTokenRepository voteTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final CryptoService cryptoService;
    private final AuditService auditService;

    @Value("${app.default-electeur-password}")
    private String defaultElecteurPassword;

    @Value("${app.default-candidat-password}")
    private String defaultCandidatPassword;

    @Value("${app.audit.ip-salt:VoteUASZ-Default-IP-Salt}")
    private String ipAuditSalt;

    @Override
    @Transactional
    public void run(String... args) {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS seed_markers ("
                + "id VARCHAR(64) PRIMARY KEY, "
                + "executed_at TIMESTAMP NOT NULL)"
        );

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM seed_markers WHERE id = ?",
                Integer.class,
                MARKER_ID
        );
        if (count != null && count > 0) {
            log.info("[DemoDataSeeder] Marqueur '{}' déjà présent en base. Seeding ignoré.", MARKER_ID);
            return;
        }

        log.info("[DemoDataSeeder] Nettoyage des données de test et injection du jeu de données UASZ...");
        cleanNonAdminData();

        String electeurHash = passwordEncoder.encode(defaultElecteurPassword);
        String candidatHash = passwordEncoder.encode(defaultCandidatPassword);

        List<User> l3Voters = createVoters(electeurHash);
        List<User> candidates = createCandidates(candidatHash);
        createCommission(electeurHash);

        LocalDateTime now = LocalDateTime.now();

        // 1. CONFIGURATION
        electionRepository.save(Election.builder()
                .titre("Élection du délégué de L2 Mathématiques 2026")
                .description("Scrutin annuel pour l'élection du délégué de promotion de Licence 2 Mathématiques (UFR Sciences et Technologies).")
                .type(TypeElection.DELEGUE)
                .statut(ElectionStatus.CONFIGURATION)
                .targetUfr("UFR_SAT")
                .targetFiliere("MATHEMATIQUES")
                .targetNiveau("L2")
                .dateDebut(now.plusDays(5))
                .dateFin(now.plusDays(7))
                .build());

        // 2. CAMPAGNE (DUFR)
        Election dufrElection = electionRepository.save(Election.builder()
                .titre("Élection du Directeur de l'UFR Sciences et Technologies 2026")
                .description("Renouvellement du mandat de direction de l'UFR Sciences et Technologies (UFR SAT) à l'Université Assane Seck de Ziguinchor.")
                .type(TypeElection.DUFR)
                .statut(ElectionStatus.CAMPAGNE)
                .targetUfr("UFR_SAT")
                .dateDebut(now.plusDays(2))
                .dateFin(now.plusDays(4))
                .build());

        // 3. VOTE_OUVERT (L3 Informatique)
        Election l3InfoElection = electionRepository.save(Election.builder()
                .titre("Élection du délégué de L3 Informatique 2026")
                .description("Scrutin officiel pour l'élection du délégué de classe de la promotion L3 Informatique (UFR SAT).")
                .type(TypeElection.DELEGUE)
                .statut(ElectionStatus.VOTE_OUVERT)
                .targetUfr("UFR_SAT")
                .targetFiliere("INFORMATIQUE")
                .targetNiveau("L3")
                .dateDebut(now.minusHours(3))
                .dateFin(now.plusHours(24))
                .build());

        // 4. PUBLICATION (L1 Droit)
        Election l1DroitElection = electionRepository.save(Election.builder()
                .titre("Élection du délégué de L1 Droit 2026")
                .description("Scrutin officiel pour l'élection du délégué de promotion de Licence 1 Droit (UFR SJAG).")
                .type(TypeElection.DELEGUE)
                .statut(ElectionStatus.PUBLICATION)
                .targetUfr("UFR_SJAG")
                .targetFiliere("DROIT")
                .targetNiveau("L1")
                .dateDebut(now.minusHours(10))
                .dateFin(now.plusHours(2))
                .build());

        // 5. CLOTURE (Vice-recteur)
        Election vrElection = electionRepository.save(Election.builder()
                .titre("Élection du Vice-recteur 2026")
                .description("Scrutin universitaire général pour l'élection du Vice-recteur de l'Université Assane Seck de Ziguinchor.")
                .type(TypeElection.VICE_RECTEUR)
                .statut(ElectionStatus.CLOTURE)
                .dateDebut(now.minusHours(20))
                .dateFin(now.plusHours(2))
                .build());

        String[] photos = {
                "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80"
        };
        String[] posters = {
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80",
                "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
                "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80"
        };
        String[] videos = {
                "https://www.youtube.com/watch?v=M7lc1UVf-VE",
                "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
                "https://www.youtube.com/watch?v=LXb3EKWsInQ",
                "https://www.youtube.com/watch?v=jNQXAC9IVRw"
        };
        String pdfProg = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
        String pdfCv = "https://pdfobject.com/pdf/sample.pdf";

        // L3 Info: 4 candidatures APPROVED + 4 publications
        List<Candidature> l3Cands = new ArrayList<>();
        String[][] postsText = {
                {
                        "Pour une L3 Informatique connectée, solidaire et ambitieuse",
                        "Chères et chers camarades de la promotion L3 Informatique,\n\n"
                        + "Notre filière est au cœur de la transformation numérique de l'Université Assane Seck de Ziguinchor. "
                        + "Mon programme s'articule autour de trois axes concrets : l'amélioration des conditions d'accès aux salles machines "
                        + "en dehors des heures de cours, la mise en place d'un tutorat hebdomadaire entre promotions sur l'algorithmique, "
                        + "les bases de données et le génie logiciel, et une transparence totale dans la communication avec le département.\n\n"
                        + "Sur le plan pédagogique, je m'engage à négocier avec l'administration un calendrier de devoirs et de projets "
                        + "mieux réparti sur le semestre afin d'éviter la surcharge en fin de module.\n\n"
                        + "Enfin, nous lancerons le « Club Dev & Open Source UASZ » pour préparer collectivement les stages de fin de cycle."
                },
                {
                        "Innovation, Entraide et Réussite Collective en L3 Info",
                        "Camarades de L3 Informatique, ensemble modernisons notre cadre d'apprentissage avec des ateliers pratiques et un meilleur suivi des équipements."
                },
                {
                        "Proximité, Écoute et Transparence pour notre Promotion",
                        "Chers étudiants, être déléguée signifie porter fidèlement votre voix auprès du département et du rectorat."
                },
                {
                        "Bâtir l'Excellence Numérique à l'UFR SAT",
                        "Chers collègues de promotion, je m'engage à défendre vos intérêts académiques et sociaux avec rigueur."
                }
        };

        for (int i = 0; i < 4; i++) {
            User cand = candidates.get(i);
            Candidature c = candidatureRepository.save(Candidature.builder()
                    .election(l3InfoElection)
                    .candidat(cand)
                    .nomListe((cand.getPrenom() + " " + cand.getNom()).trim())
                    .photoUrl(photos[i])
                    .programmePdf(pdfProg)
                    .cvUrl(pdfCv)
                    .statut(CandidacyStatus.APPROVED)
                    .build());
            l3Cands.add(c);
            campaignPostRepository.save(CampaignPost.builder()
                    .candidature(c)
                    .titre(postsText[i][0])
                    .contenu(postsText[i][1])
                    .afficheUrl(posters[i])
                    .videoEmbedUrl(videos[i])
                    .build());
        }

        // DUFR: 1 APPROVED, 1 PENDING, 1 REJECTED
        Candidature dufr1 = candidatureRepository.save(Candidature.builder()
                .election(dufrElection).candidat(candidates.get(0))
                .nomListe("Awa Ndiaye").photoUrl(photos[0]).programmePdf(pdfProg).cvUrl(pdfCv)
                .statut(CandidacyStatus.APPROVED).build());
        campaignPostRepository.save(CampaignPost.builder()
                .candidature(dufr1)
                .titre("Moderniser les laboratoires et la gouvernance de l'UFR SAT")
                .contenu("Programme axé sur l'équipement des laboratoires, la numérisation des procédures et l'appui à la recherche.")
                .afficheUrl(posters[0]).videoEmbedUrl(videos[0]).build());
        candidatureRepository.save(Candidature.builder()
                .election(dufrElection).candidat(candidates.get(1))
                .nomListe("Cheikh Tidiane Diop").photoUrl(photos[1]).programmePdf(pdfProg).cvUrl(pdfCv)
                .statut(CandidacyStatus.PENDING).build());
        candidatureRepository.save(Candidature.builder()
                .election(dufrElection).candidat(candidates.get(2))
                .nomListe("Fatou Binetou Sarr").photoUrl(photos[2]).programmePdf(pdfProg).cvUrl(pdfCv)
                .statut(CandidacyStatus.REJECTED)
                .motifRejet("Dossier incomplet : le programme PDF fourni ne respecte pas le format réglementaire de la charte électorale UASZ.")
                .build());

        // L1 Droit: 2 candidatures APPROVED
        Candidature l1c1 = candidatureRepository.save(Candidature.builder()
                .election(l1DroitElection).candidat(candidates.get(0))
                .nomListe("Awa Ndiaye").photoUrl(photos[0]).programmePdf(pdfProg).cvUrl(pdfCv)
                .statut(CandidacyStatus.APPROVED).build());
        Candidature l1c2 = candidatureRepository.save(Candidature.builder()
                .election(l1DroitElection).candidat(candidates.get(1))
                .nomListe("Cheikh Tidiane Diop").photoUrl(photos[1]).programmePdf(pdfProg).cvUrl(pdfCv)
                .statut(CandidacyStatus.APPROVED).build());

        // Vice-Recteur: 2 candidatures APPROVED
        Candidature vrc1 = candidatureRepository.save(Candidature.builder()
                .election(vrElection).candidat(candidates.get(2))
                .nomListe("Fatou Binetou Sarr").photoUrl(photos[2]).programmePdf(pdfProg).cvUrl(pdfCv)
                .statut(CandidacyStatus.APPROVED).build());
        Candidature vrc2 = candidatureRepository.save(Candidature.builder()
                .election(vrElection).candidat(candidates.get(3))
                .nomListe("Moussa Fall").photoUrl(photos[3]).programmePdf(pdfProg).cvUrl(pdfCv)
                .statut(CandidacyStatus.APPROVED).build());

        // Votes chiffrés + chaîne SHA-256 pour L3 Info (25 votes : 10, 7, 5, 3)
        List<Long> l3Choices = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            l3Choices.add(l3Cands.get(0).getId());
        }
        for (int i = 0; i < 7; i++) {
            l3Choices.add(l3Cands.get(1).getId());
        }
        for (int i = 0; i < 5; i++) {
            l3Choices.add(l3Cands.get(2).getId());
        }
        for (int i = 0; i < 3; i++) {
            l3Choices.add(l3Cands.get(3).getId());
        }
        castSeededVotes(l3InfoElection, l3Voters.subList(0, 25), l3Choices);

        // Votes pour L1 Droit (3 votes)
        List<User> l1Voters = userRepository.findAll().stream()
                .filter(u -> u.getMatricule().startsWith("2026L1D")).limit(3).toList();
        castSeededVotes(l1DroitElection, l1Voters, List.of(l1c1.getId(), l1c1.getId(), l1c2.getId()));

        // Votes pour Vice-Recteur (4 votes)
        List<User> vrVoters = userRepository.findAll().stream()
                .filter(u -> u.getMatricule().startsWith("2026L2M") || u.getMatricule().startsWith("2026L2L"))
                .limit(4).toList();
        castSeededVotes(vrElection, vrVoters, List.of(vrc1.getId(), vrc1.getId(), vrc1.getId(), vrc2.getId()));

        // Vérification cryptographique des chaînes
        if (!auditService.verifyBallotChain(ballotRepository.findByElectionIdOrderBySequenceNumberAsc(l3InfoElection.getId()))) {
            throw new IllegalStateException("Chaîne de bulletins invalide après seeding L3 Info.");
        }

        // 3 Réclamations réalistes
        complaintRepository.save(Complaint.builder()
                .election(l1DroitElection)
                .auteur(l1Voters.get(0))
                .sujet("Latence lors de la réception du code OTP")
                .description("Le message contenant le code OTP a mis environ 45 secondes à arriver lors de l'ouverture du scrutin L1 Droit.")
                .statut(ComplaintStatus.PENDING)
                .build());
        complaintRepository.save(Complaint.builder()
                .election(vrElection)
                .auteur(vrVoters.get(0))
                .sujet("Demande de vérification du taux de participation affiché")
                .description("Je souhaite confirmer que les émargements de l'UFR LL ont bien été pris en compte dans le PV final.")
                .statut(ComplaintStatus.RESOLVED)
                .reponseCommission("Vérification effectuée dans le journal d'audit SHA-256 : l'ensemble des émargements est comptabilisé.")
                .build());
        complaintRepository.save(Complaint.builder()
                .election(l1DroitElection)
                .auteur(l1Voters.get(1))
                .sujet("Contestation de la clôture anticipée alléguée")
                .description("Un camarade n'a pas pu soumettre son bulletin après l'heure de clôture officielle du scrutin.")
                .statut(ComplaintStatus.REJECTED)
                .reponseCommission("Réclamation rejetée : les journaux horaires confirment que le scrutin est resté ouvert sur toute la plage prévue.")
                .build());

        jdbcTemplate.update(
                "INSERT INTO seed_markers (id, executed_at) VALUES (?, CURRENT_TIMESTAMP)",
                MARKER_ID
        );
        log.info("[DemoDataSeeder] Jeu de données UASZ injecté avec succès et marqueur '{}' enregistré.", MARKER_ID);
    }

    private void cleanNonAdminData() {
        campaignPostRepository.deleteAll();
        candidatureRepository.deleteAll();
        complaintRepository.deleteAll();
        ballotRepository.deleteAll();
        voterAuditLogRepository.deleteAll();
        voteOTPRepository.deleteAll();
        voteTokenRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        electionRepository.deleteAll();
        List<User> nonAdmins = userRepository.findAll().stream()
                .filter(u -> u.getRole() != Role.SUPER_ADMIN)
                .toList();
        userRepository.deleteAll(nonAdmins);
    }

    private void castSeededVotes(Election election, List<User> voters, List<Long> choices) {
        String previousHash = "GENESIS";
        LocalDateTime truncatedHour = LocalDateTime.now().truncatedTo(ChronoUnit.HOURS);
        for (int i = 0; i < voters.size(); i++) {
            long seq = i + 1L;
            Long candId = choices.get(i);
            String payload = "CHOICE:" + candId + ":ELECTION:" + election.getId() + ":NONCE:" + UUID.randomUUID();
            String encrypted = cryptoService.encrypt(payload);
            String ballotHash = cryptoService.hash(previousHash + "|" + encrypted + "|" + seq);

            ballotRepository.save(Ballot.builder()
                    .election(election)
                    .candidatureId(candId)
                    .encryptedPayload(encrypted)
                    .ballotHash(ballotHash)
                    .previousHash(previousHash)
                    .sequenceNumber(seq)
                    .build());

            voterAuditLogRepository.save(VoterAuditLog.builder()
                    .user(voters.get(i))
                    .election(election)
                    .votedAt(truncatedHour)
                    .ipHash(cryptoService.hash(ipAuditSalt + ":127.0.0.1"))
                    .build());

            previousHash = ballotHash;
        }
    }

    private List<User> createVoters(String passwordHash) {
        String[][] l3Names = {
                {"Ba", "Aminata"}, {"Camara", "Ousmane"}, {"Cisse", "Mariama"}, {"Coly", "Landing"},
                {"Dieme", "Khadija"}, {"Diedhiou", "Bakary"}, {"Diouf", "Aissatou"}, {"Drame", "Modou"},
                {"Faye", "Ndeye Fatou"}, {"Gaye", "Abdou"}, {"Gomis", "Pascaline"}, {"Gueye", "Pape Samba"},
                {"Kane", "Coumba"}, {"Kebe", "Alassane"}, {"Mbodj", "Rokhaya"}, {"Mbengue", "Serigne"},
                {"Mendy", "Jean Paul"}, {"Ndao", "Sokhna"}, {"Ndour", "Bassirou"}, {"Ngom", "Astou"},
                {"Niang", "Malick"}, {"Sagna", "Ansoumana"}, {"Sane", "Binta"}, {"Seck", "Lamine"},
                {"Sene", "Seynabou"}, {"Sonko", "Oumar"}, {"Sy", "Dieynaba"}, {"Thiam", "Boubacar"}
        };
        List<User> l3List = new ArrayList<>();
        for (int i = 0; i < l3Names.length; i++) {
            String mat = String.format("2026L3I%03d", i + 1);
            String email = (l3Names[i][1] + "." + l3Names[i][0]).toLowerCase().replace(" ", "") + "@etu.uasz.example";
            l3List.add(userRepository.save(User.builder()
                    .matricule(mat).nom(l3Names[i][0]).prenom(l3Names[i][1]).email(email)
                    .telephone(String.format("770000%03d", 101 + i))
                    .password(passwordHash).role(Role.ELECTEUR).typeElecteur(TypeElecteur.ETUDIANT)
                    .ufr("UFR_SAT").filiere("INFORMATIQUE").niveau("L3").active(true).build()));
        }

        String[][] others = {
                {"2026L2M001", "Badiane", "Issa", "UFR_SAT", "MATHEMATIQUES", "L2"},
                {"2026L2M002", "Diagne", "Mame Diarra", "UFR_SAT", "MATHEMATIQUES", "L2"},
                {"2026L2M003", "Konte", "Demba", "UFR_SAT", "MATHEMATIQUES", "L2"},
                {"2026L2M004", "Tine", "Ndeye Amy", "UFR_SAT", "MATHEMATIQUES", "L2"},
                {"2026L1D001", "Balde", "Mamadou", "UFR_SJAG", "DROIT", "L1"},
                {"2026L1D002", "Dabo", "Hawa", "UFR_SJAG", "DROIT", "L1"},
                {"2026L1D003", "Manga", "Michel", "UFR_SJAG", "DROIT", "L1"},
                {"2026L1D004", "Sadio", "Yacine", "UFR_SJAG", "DROIT", "L1"},
                {"2026L1D005", "Toure", "Souleymane", "UFR_SJAG", "DROIT", "L1"},
                {"2026L2L001", "Beye", "Adama", "UFR_LL", "LETTRES", "L2"},
                {"2026L2L002", "Fofana", "Kadiatou", "UFR_LL", "LETTRES", "L2"},
                {"2026L2L003", "Samb", "Ibrahima", "UFR_LL", "LETTRES", "L2"}
        };
        for (int i = 0; i < others.length; i++) {
            String[] o = others[i];
            String email = (o[2] + "." + o[1]).toLowerCase().replace(" ", "") + "@etu.uasz.example";
            userRepository.save(User.builder()
                    .matricule(o[0]).nom(o[1]).prenom(o[2]).email(email)
                    .telephone(String.format("770000%03d", 201 + i))
                    .password(passwordHash).role(Role.ELECTEUR).typeElecteur(TypeElecteur.ETUDIANT)
                    .ufr(o[3]).filiere(o[4]).niveau(o[5]).active(true).build());
        }
        return l3List;
    }

    private List<User> createCandidates(String passwordHash) {
        String[][] cands = {
                {"CAND202601", "Ndiaye", "Awa", "awa.ndiaye@etu.uasz.example"},
                {"CAND202602", "Diop", "Cheikh Tidiane", "cheikh.diop@etu.uasz.example"},
                {"CAND202603", "Sarr", "Fatou Binetou", "fatou.sarr@etu.uasz.example"},
                {"CAND202604", "Fall", "Moussa", "moussa.fall@etu.uasz.example"}
        };
        List<User> list = new ArrayList<>();
        for (int i = 0; i < cands.length; i++) {
            list.add(userRepository.save(User.builder()
                    .matricule(cands[i][0]).nom(cands[i][1]).prenom(cands[i][2]).email(cands[i][3])
                    .telephone(String.format("770000%03d", 501 + i))
                    .password(passwordHash).role(Role.CANDIDAT).typeElecteur(TypeElecteur.ETUDIANT)
                    .ufr("UFR_SAT").filiere("INFORMATIQUE").niveau("L3").active(true).build()));
        }
        return list;
    }

    private void createCommission(String passwordHash) {
        userRepository.save(User.builder()
                .matricule("COMM202601").nom("Sow").prenom("Ibrahima")
                .email("commission.electorale@uasz.example").telephone("770000601")
                .password(passwordHash).role(Role.COMMISSION_ELECTORALE).typeElecteur(TypeElecteur.ENSEIGNANT)
                .ufr("UFR_SAT").active(true).build());
    }
}
