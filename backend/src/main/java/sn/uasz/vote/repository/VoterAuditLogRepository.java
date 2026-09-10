package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.VoterAuditLog;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoterAuditLogRepository extends JpaRepository<VoterAuditLog, Long> {
    boolean existsByUserIdAndElectionId(Long userId, Long electionId);
    Optional<VoterAuditLog> findByUserIdAndElectionId(Long userId, Long electionId);
    List<VoterAuditLog> findByElectionId(Long electionId);
    long countByElectionId(Long electionId);
}
