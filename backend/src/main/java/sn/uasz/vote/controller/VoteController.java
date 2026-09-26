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
    public ResponseEntity<Map<String, String>> requestOtp(
            @RequestParam(required = false) Long electionId,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        Long targetId = electionId;
        if (targetId == null && body != null && body.containsKey("electionId")) {
            Object idVal = body.get("electionId");
            if (idVal instanceof Number n) {
                targetId = n.longValue();
            } else if (idVal != null) {
                targetId = Long.valueOf(idVal.toString());
            }
        }
        if (targetId == null) {
            throw new IllegalArgumentException("Le paramètre electionId est obligatoire.");
        }

        votingService.requestOtp(auth.getName(), targetId);
        return ResponseEntity.ok(Map.of(
                "message", "Code OTP envoyé par e-mail (valable 5 minutes). Consultez votre boîte mail."
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(
            @RequestParam(required = false) Long electionId,
            @RequestParam(required = false) String otpCode,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        Long targetId = electionId;
        String code = otpCode;

        if (targetId == null && body != null && body.containsKey("electionId")) {
            Object idVal = body.get("electionId");
            if (idVal instanceof Number n) {
                targetId = n.longValue();
            } else if (idVal != null) {
                targetId = Long.valueOf(idVal.toString());
            }
        }
        if ((code == null || code.isBlank()) && body != null && body.containsKey("otpCode")) {
            Object codeVal = body.get("otpCode");
            if (codeVal != null) {
                code = codeVal.toString();
            }
        }

        if (targetId == null || code == null || code.isBlank()) {
            throw new IllegalArgumentException("Les paramètres electionId et otpCode sont obligatoires.");
        }

        String voteToken = votingService.verifyOtpAndGenerateToken(auth.getName(), targetId, code);
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
