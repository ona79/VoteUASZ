package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.User;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByMatricule(String matricule);
    Optional<User> findByEmail(String email);
    boolean existsByMatricule(String matricule);
    boolean existsByEmail(String email);
}
