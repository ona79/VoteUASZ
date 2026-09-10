package sn.uasz.vote.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.enums.TypeElecteur;
import sn.uasz.vote.enums.TypeElection;

/**
 * Service dédié à la vérification dynamique de l'éligibilité d'un électeur.
 *
 * Règles d'éligibilité par type d'élection :
 *   - DELEGUE    : L'électeur doit appartenir au même UFR + Filière + Niveau que le scrutin.
 *                  Seuls les ETUDIANTS de la filière concernée votent pour leur délégué.
 *   - DUFR       : L'électeur doit appartenir au même UFR. Tous types d'électeurs (étudiants,
 *                  enseignants, PATS) de l'UFR concernée sont éligibles.
 *   - VICE_RECTEUR : Tous les membres actifs de l'UASZ sont éligibles (pas de filtre UFR/filière).
 *
 * Compétence 3 du cahier des charges : "Gérer l'authentification multi-rôles avec vérification
 * d'éligibilité dynamique selon le type d'élection".
 */
@Service
@RequiredArgsConstructor
public class EligibilityService {

    /**
     * Vérifie si un utilisateur est éligible à voter dans une élection donnée.
     *
     * @param user     L'utilisateur à vérifier (ne doit pas être null ni inactif).
     * @param election L'élection concernée (ne doit pas être null).
     * @return {@code true} si l'électeur est éligible, {@code false} sinon.
     */
    public boolean isEligible(User user, Election election) {
        if (user == null || election == null) {
            return false;
        }
        if (!user.isActive()) {
            return false;
        }

        return switch (election.getType()) {
            case DELEGUE -> isEligibleForDelegue(user, election);
            case DUFR    -> isEligibleForDufr(user, election);
            case VICE_RECTEUR -> true; // Tous les membres actifs de l'UASZ
        };
    }

    /**
     * Éligibilité pour un scrutin de type DÉLÉGUÉ.
     * Critères : ÉTUDIANT uniquement + même UFR + même filière + même niveau.
     */
    private boolean isEligibleForDelegue(User user, Election election) {
        // Seuls les étudiants élisent leur délégué de classe
        if (user.getTypeElecteur() != TypeElecteur.ETUDIANT) {
            return false;
        }

        // UFR : obligatoire si spécifié dans le collège électoral
        if (isNotBlankAndNotMatch(election.getTargetUfr(), user.getUfr())) {
            return false;
        }

        // Filière : obligatoire si spécifié
        if (isNotBlankAndNotMatch(election.getTargetFiliere(), user.getFiliere())) {
            return false;
        }

        // Niveau : obligatoire si spécifié
        if (isNotBlankAndNotMatch(election.getTargetNiveau(), user.getNiveau())) {
            return false;
        }

        return true;
    }

    /**
     * Éligibilité pour un scrutin de type DUFR.
     * Critères : tous types d'électeurs (ETUDIANT, ENSEIGNANT, PATS) de l'UFR concernée.
     */
    private boolean isEligibleForDufr(User user, Election election) {
        return !isNotBlankAndNotMatch(election.getTargetUfr(), user.getUfr());
    }

    /**
     * Helper : retourne true si la valeur cible est renseignée ET ne correspond pas à la valeur de l'utilisateur.
     */
    private boolean isNotBlankAndNotMatch(String target, String userValue) {
        if (target == null || target.isBlank()) {
            return false; // Pas de filtre => pas de blocage
        }
        return !target.equalsIgnoreCase(userValue);
    }

    /**
     * Retourne un message explicatif d'inéligibilité pour informer l'électeur.
     */
    public String getIneligibilityReason(User user, Election election) {
        if (user == null) return "Utilisateur non identifié.";
        if (!user.isActive()) return "Votre compte est désactivé.";

        if (election.getType() == TypeElection.DELEGUE) {
            if (user.getTypeElecteur() != TypeElecteur.ETUDIANT) {
                return "Seuls les étudiants peuvent voter à l'élection d'un délégué de classe.";
            }
            if (isNotBlankAndNotMatch(election.getTargetUfr(), user.getUfr())) {
                return "Vous n'appartenez pas à l'UFR " + election.getTargetUfr() + " concernée par ce scrutin.";
            }
            if (isNotBlankAndNotMatch(election.getTargetFiliere(), user.getFiliere())) {
                return "Votre filière (" + user.getFiliere() + ") ne correspond pas à la filière " + election.getTargetFiliere() + " de ce scrutin.";
            }
            if (isNotBlankAndNotMatch(election.getTargetNiveau(), user.getNiveau())) {
                return "Votre niveau (" + user.getNiveau() + ") ne correspond pas au niveau " + election.getTargetNiveau() + " de ce scrutin.";
            }
        }

        if (election.getType() == TypeElection.DUFR) {
            if (isNotBlankAndNotMatch(election.getTargetUfr(), user.getUfr())) {
                return "Vous n'appartenez pas à l'UFR " + election.getTargetUfr() + " concernée par ce scrutin.";
            }
        }

        return "Inéligible pour ce scrutin.";
    }
}
