package sn.uasz.vote.service;

import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sn.uasz.vote.entity.Ballot;
import sn.uasz.vote.entity.VoterAuditLog;
import sn.uasz.vote.repository.BallotRepository;
import sn.uasz.vote.repository.VoterAuditLogRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final VoterAuditLogRepository voterAuditLogRepository;
    private final BallotRepository ballotRepository;

    public AuditReportDto getAuditReport(Long electionId) {
        List<VoterAuditLog> auditLogs = voterAuditLogRepository.findByElectionId(electionId);
        List<Ballot> ballots = ballotRepository.findByElectionId(electionId);

        List<AuditLogEntryDto> anonymizedLogs = auditLogs.stream().map(log -> AuditLogEntryDto.builder()
                .votedAt(log.getVotedAt())
                .ipHash(log.getIpHash())
                .build()
        ).collect(Collectors.toList());

        List<String> ballotHashes = ballots.stream()
                .map(Ballot::getBallotHash)
                .collect(Collectors.toList());

        return AuditReportDto.builder()
                .electionId(electionId)
                .totalVotersRegistered(auditLogs.size())
                .totalBallotsRecorded(ballots.size())
                .anonymizedLogs(anonymizedLogs)
                .ballotHashes(ballotHashes)
                .build();
    }

    @Data
    @Builder
    public static class AuditReportDto {
        private Long electionId;
        private int totalVotersRegistered;
        private int totalBallotsRecorded;
        private List<AuditLogEntryDto> anonymizedLogs;
        private List<String> ballotHashes;
    }

    @Data
    @Builder
    public static class AuditLogEntryDto {
        private LocalDateTime votedAt;
        private String ipHash;
    }
}
