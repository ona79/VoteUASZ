package sn.uasz.vote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.VoteRequestDto;
import sn.uasz.vote.dto.VoteResponseDto;
import sn.uasz.vote.service.VotingService;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/vote")
@RequiredArgsConstructor
public class VoteController {

    private final VotingService votingService;

    @PostMapping("/request-otp")
    public ResponseEntity<Map<String, String>> requestOtp(@RequestParam Long electionId, Authentication auth) {
        votingService.requestOtp(auth.getName(), electionId);
        return ResponseEntity.ok(Map.of(
                "message", "Code OTP envoyé par e-mail (valable 5 minutes). Consultez votre boîte mail."
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(
            @RequestParam Long electionId,
            @RequestParam String otpCode,
            Authentication auth) {
        String voteToken = votingService.verifyOtpAndGenerateToken(auth.getName(), electionId, otpCode);
        return ResponseEntity.ok(Map.of(
                "message", "OTP validé. Jeton temporaire de vote à usage unique délivré.",
                "voteToken", voteToken
        ));
    }

    @PostMapping("/submit")
    public ResponseEntity<VoteResponseDto> submitVote(@Valid @RequestBody VoteRequestDto request) {
        VoteResponseDto response = votingService.submitVote(
                request.getVoteToken(),
                request.getElectionId(),
                request.getCandidatureId()
        );
        return ResponseEntity.ok(response);
    }
}
