package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.enums.ElectionStatus;

import java.util.List;

@Repository
public interface ElectionRepository extends JpaRepository<Election, Long> {
    List<Election> findByStatut(ElectionStatus statut);
}
