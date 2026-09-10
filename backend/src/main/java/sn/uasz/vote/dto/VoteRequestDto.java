package sn.uasz.vote.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoteRequestDto {
    @NotNull
    private Long electionId;
    
    @NotNull
    private Long candidatureId;
    
    private String otpCode;
    private String voteToken;
}
