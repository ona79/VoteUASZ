package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.PasswordResetToken;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(Long userId);

    Optional<PasswordResetToken> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("UPDATE PasswordResetToken p SET p.used = true WHERE p.user.id = :userId AND p.used = false")
    void invalidateAllUnusedByUserId(@Param("userId") Long userId);
}
