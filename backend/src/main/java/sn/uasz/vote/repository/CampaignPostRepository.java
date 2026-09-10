package sn.uasz.vote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sn.uasz.vote.entity.CampaignPost;

import java.util.List;

@Repository
public interface CampaignPostRepository extends JpaRepository<CampaignPost, Long> {
    List<CampaignPost> findByCandidatureId(Long candidatureId);
    List<CampaignPost> findByCandidatureElectionId(Long electionId);
}
