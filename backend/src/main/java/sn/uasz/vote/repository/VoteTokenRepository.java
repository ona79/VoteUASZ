package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.VoteToken;

import java.util.Optional;

@Repository
public interface VoteTokenRepository extends JpaRepository<VoteToken, Long> {
    Optional<VoteToken> findByTokenHashAndUsedFalse(String tokenHash);
}
