package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.Ballot;

import java.util.List;

@Repository
public interface BallotRepository extends JpaRepository<Ballot, Long> {
    List<Ballot> findByElectionId(Long electionId);
    long countByElectionId(Long electionId);
    long countByElectionIdAndCandidatureId(Long electionId, Long candidatureId);

    @Query("SELECT b.candidatureId, COUNT(b) FROM Ballot b WHERE b.election.id = :electionId GROUP BY b.candidatureId")
    List<Object[]> countVotesGroupedByCandidature(Long electionId);
}
