package sn.uasz.vote.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.enums.TypeElection;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("EligibilityService — Vérification Dynamique d'Éligibilité (Compétence 3)")
class EligibilityServiceTest {

    private EligibilityService eligibilityService;

    @BeforeEach
    void setUp() {
        eligibilityService = new EligibilityService();
    }

    // === ÉLECTION TYPE DÉLÉGUÉ ===

    @Test
    @DisplayName("DELEGUE : Étudiant de la même UFR/Filière/Niveau doit être éligible")
    void delegue_studentSameUfrFiliereNiveau_isEligible() {
        User student = buildUser("UFR_SAT", "INFORMATIQUE", "L3", TypeElecteur.ETUDIANT);
        Election election = buildElection(TypeElection.DELEGUE, "UFR_SAT", "INFORMATIQUE", "L3");
        assertTrue(eligibilityService.isEligible(student, election));
    }

    @Test
    @DisplayName("DELEGUE : Enseignant ne doit PAS être éligible")
    void delegue_teacher_isNotEligible() {
        User teacher = buildUser("UFR_SAT", "INFORMATIQUE", "L3", TypeElecteur.ENSEIGNANT);
        Election election = buildElection(TypeElection.DELEGUE, "UFR_SAT", "INFORMATIQUE", "L3");
        assertFalse(eligibilityService.isEligible(teacher, election));
    }

    @Test
    @DisplayName("DELEGUE : Étudiant d'une autre filière ne doit PAS être éligible")
    void delegue_studentWrongFiliere_isNotEligible() {
        User student = buildUser("UFR_SAT", "CHIMIE", "L3", TypeElecteur.ETUDIANT);
        Election election = buildElection(TypeElection.DELEGUE, "UFR_SAT", "INFORMATIQUE", "L3");
        assertFalse(eligibilityService.isEligible(student, election));
    }

    @Test
    @DisplayName("DELEGUE : Étudiant d'un autre niveau ne doit PAS être éligible")
    void delegue_studentWrongNiveau_isNotEligible() {
        User student = buildUser("UFR_SAT", "INFORMATIQUE", "L2", TypeElecteur.ETUDIANT);
        Election election = buildElection(TypeElection.DELEGUE, "UFR_SAT", "INFORMATIQUE", "L3");
        assertFalse(eligibilityService.isEligible(student, election));
    }

    @Test
    @DisplayName("DELEGUE : Étudiant d'un autre UFR ne doit PAS être éligible")
    void delegue_studentWrongUfr_isNotEligible() {
        User student = buildUser("UFR_SCIENCES_JURIDIQUES", "DROIT", "L3", TypeElecteur.ETUDIANT);
        Election election = buildElection(TypeElection.DELEGUE, "UFR_SAT", "INFORMATIQUE", "L3");
        assertFalse(eligibilityService.isEligible(student, election));
    }

    @Test
    @DisplayName("DELEGUE : Si pas de filtre niveau, tous niveaux de la filière sont éligibles")
    void delegue_noNiveauFilter_allLevelsEligible() {
        User student = buildUser("UFR_SAT", "INFORMATIQUE", "M1", TypeElecteur.ETUDIANT);
        Election election = buildElection(TypeElection.DELEGUE, "UFR_SAT", "INFORMATIQUE", null);
        assertTrue(eligibilityService.isEligible(student, election));
    }

    // === ÉLECTION TYPE DUFR ===

    @Test
    @DisplayName("DUFR : Étudiant du bon UFR doit être éligible")
    void dufr_studentSameUfr_isEligible() {
        User student = buildUser("UFR_SAT", "INFORMATIQUE", "L3", TypeElecteur.ETUDIANT);
        Election election = buildElection(TypeElection.DUFR, "UFR_SAT", null, null);
        assertTrue(eligibilityService.isEligible(student, election));
    }

    @Test
    @DisplayName("DUFR : Enseignant du même UFR doit être éligible")
    void dufr_teacherSameUfr_isEligible() {
        User teacher = buildUser("UFR_SAT", null, null, TypeElecteur.ENSEIGNANT);
        Election election = buildElection(TypeElection.DUFR, "UFR_SAT", null, null);
        assertTrue(eligibilityService.isEligible(teacher, election));
    }

    @Test
    @DisplayName("DUFR : Personnel d'un autre UFR ne doit PAS être éligible")
    void dufr_userWrongUfr_isNotEligible() {
        User pats = buildUser("UFR_LETTRES", null, null, TypeElecteur.PATS);
        Election election = buildElection(TypeElection.DUFR, "UFR_SAT", null, null);
        assertFalse(eligibilityService.isEligible(pats, election));
    }

    // === ÉLECTION TYPE VICE-RECTEUR ===

    @Test
    @DisplayName("VICE_RECTEUR : Tout membre actif doit être éligible, quel que soit son UFR")
    void viceRecteur_anyActiveMember_isEligible() {
        User student = buildUser("UFR_SAT", "INFORMATIQUE", "L3", TypeElecteur.ETUDIANT);
        User teacher = buildUser("UFR_LETTRES", null, null, TypeElecteur.ENSEIGNANT);
        User pats = buildUser("ADMINISTRATION", null, null, TypeElecteur.PATS);

        Election election = buildElection(TypeElection.VICE_RECTEUR, null, null, null);

        assertTrue(eligibilityService.isEligible(student, election));
        assertTrue(eligibilityService.isEligible(teacher, election));
        assertTrue(eligibilityService.isEligible(pats, election));
    }

    // === CAS LIMITES ===

    @Test
    @DisplayName("Utilisateur inactif ne doit jamais être éligible")
    void inactiveUser_neverEligible() {
        User inactiveUser = buildUser("UFR_SAT", "INFORMATIQUE", "L3", TypeElecteur.ETUDIANT);
        inactiveUser.setActive(false);
        Election election = buildElection(TypeElection.VICE_RECTEUR, null, null, null);
        assertFalse(eligibilityService.isEligible(inactiveUser, election));
    }

    @Test
    @DisplayName("Utilisateur null ne doit jamais être éligible")
    void nullUser_neverEligible() {
        Election election = buildElection(TypeElection.VICE_RECTEUR, null, null, null);
        assertFalse(eligibilityService.isEligible(null, election));
    }

    @Test
    @DisplayName("Le message d'inéligibilité doit être explicite pour un enseignant en scrutin DELEGUE")
    void ineligibilityReason_teacherInDelegue_explicitMessage() {
        User teacher = buildUser("UFR_SAT", "INFORMATIQUE", "L3", TypeElecteur.ENSEIGNANT);
        Election election = buildElection(TypeElection.DELEGUE, "UFR_SAT", "INFORMATIQUE", "L3");
        String reason = eligibilityService.getIneligibilityReason(teacher, election);
        assertTrue(reason.contains("étudiants"));
    }

    // === Helpers ===

    private User buildUser(String ufr, String filiere, String niveau, TypeElecteur typeElecteur) {
        User user = new User();
        user.setUfr(ufr);
        user.setFiliere(filiere);
        user.setNiveau(niveau);
        user.setTypeElecteur(typeElecteur);
        user.setActive(true);
        return user;
    }

    private Election buildElection(TypeElection type, String targetUfr, String targetFiliere, String targetNiveau) {
        Election election = new Election();
        election.setType(type);
        election.setTargetUfr(targetUfr);
        election.setTargetFiliere(targetFiliere);
        election.setTargetNiveau(targetNiveau);
        return election;
    }
}
