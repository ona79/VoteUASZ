package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.Candidature;
import sn.uasz.vote.enums.CandidacyStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidatureRepository extends JpaRepository<Candidature, Long> {
    List<Candidature> findByElectionId(Long electionId);
    List<Candidature> findByElectionIdAndStatut(Long electionId, CandidacyStatus statut);
    Optional<Candidature> findByElectionIdAndCandidatId(Long electionId, Long userId);
    List<Candidature> findByCandidatMatricule(String matricule);
}
