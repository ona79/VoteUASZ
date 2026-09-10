package sn.uasz.vote.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveResultsDto {
    private Long electionId;
    private String electionTitre;
    private long totalVotes;
    private List<CandidatureResultDto> candidateResults;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CandidatureResultDto {
        private Long candidatureId;
        private String nomCandidat;
        private String nomListe;
        private long voteCount;
        private double percentage;
    }
}
