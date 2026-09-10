package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.Complaint;
import sn.uasz.vote.enums.ComplaintStatus;

import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByElectionId(Long electionId);
    List<Complaint> findByAuteurId(Long userId);
    List<Complaint> findByElectionIdAndStatut(Long electionId, ComplaintStatus statut);
}
