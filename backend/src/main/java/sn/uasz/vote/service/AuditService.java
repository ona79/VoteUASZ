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
    private final CryptoService cryptoService;

    public AuditReportDto getAuditReport(Long electionId) {
        List<VoterAuditLog> auditLogs = voterAuditLogRepository.findByElectionId(electionId);
        List<Ballot> ballots = ballotRepository.findByElectionIdOrderBySequenceNumberAsc(electionId);

        List<AuditLogEntryDto> anonymizedLogs = auditLogs.stream().map(log -> AuditLogEntryDto.builder()
                .votedAt(log.getVotedAt())
                .ipHash(log.getIpHash())
                .build()
        ).collect(Collectors.toList());

        List<String> ballotHashes = ballots.stream()
                .map(Ballot::getBallotHash)
                .collect(Collectors.toList());

        List<BallotChainEntryDto> ballotChain = ballots.stream()
                .map(b -> BallotChainEntryDto.builder()
                        .sequenceNumber(b.getSequenceNumber())
                        .ballotHash(b.getBallotHash())
                        .previousHash(b.getPreviousHash())
                        .build())
                .collect(Collectors.toList());

        boolean chainValid = verifyBallotChain(ballots);

        return AuditReportDto.builder()
                .electionId(electionId)
                .totalVotersRegistered(auditLogs.size())
                .totalBallotsRecorded(ballots.size())
                .chainValid(chainValid)
                .anonymizedLogs(anonymizedLogs)
                .ballotHashes(ballotHashes)
                .ballotChain(ballotChain)
                .build();
    }

    public boolean verifyBallotChain(List<Ballot> ballots) {
        String expectedPreviousHash = "GENESIS";
        for (Ballot ballot : ballots) {
            if (!expectedPreviousHash.equals(ballot.getPreviousHash())) {
                return false;
            }
            String expectedHash = cryptoService.hash(
                    ballot.getPreviousHash() + "|" + ballot.getEncryptedPayload() + "|" + ballot.getSequenceNumber()
            );
            if (!expectedHash.equals(ballot.getBallotHash())) {
                return false;
            }
            expectedPreviousHash = ballot.getBallotHash();
        }
        return true;
    }

    public String generateAuditCsv(Long electionId) {
        AuditReportDto report = getAuditReport(electionId);
        StringBuilder csv = new StringBuilder();
        csv.append("Type,Timestamp,Hash_IP_ou_Ballot,Previous_Hash\n");
        for (AuditLogEntryDto log : report.getAnonymizedLogs()) {
            csv.append("EMARGEMENT,").append(log.getVotedAt()).append(",").append(log.getIpHash()).append(",N/A\n");
        }
        for (BallotChainEntryDto entry : report.getBallotChain()) {
            csv.append("BULLETIN,SEQ_").append(entry.getSequenceNumber()).append(",")
                    .append(entry.getBallotHash()).append(",").append(entry.getPreviousHash()).append("\n");
        }
        return csv.toString();
    }

    @Data
    @Builder
    public static class AuditReportDto {
        private Long electionId;
        private int totalVotersRegistered;
        private int totalBallotsRecorded;
        private boolean chainValid;
        private List<AuditLogEntryDto> anonymizedLogs;
        private List<String> ballotHashes;
        private List<BallotChainEntryDto> ballotChain;
    }

    @Data
    @Builder
    public static class BallotChainEntryDto {
        private Long sequenceNumber;
        private String ballotHash;
        private String previousHash;
    }

    @Data
    @Builder
    public static class AuditLogEntryDto {
        private LocalDateTime votedAt;
        private String ipHash;
    }
}
