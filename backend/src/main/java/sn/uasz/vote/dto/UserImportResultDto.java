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
public class UserImportResultDto {
    private int totalSuccess;
    private int totalFailed;
    private List<String> errors;
}
