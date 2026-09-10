package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.VoteOTP;

import java.util.Optional;

@Repository
public interface VoteOTPRepository extends JpaRepository<VoteOTP, Long> {
    Optional<VoteOTP> findTopByUserIdAndElectionIdAndUsedFalseOrderByCreatedAtDesc(Long userId, Long electionId);
}
