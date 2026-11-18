package sn.uasz.vote.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sn.uasz.vote.entity.Ballot;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.entity.VoterAuditLog;
import sn.uasz.vote.repository.BallotRepository;
import sn.uasz.vote.repository.VoterAuditLogRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditService — Export CSV anonymisé")
class AuditCsvExportTest {

    @Mock
    private VoterAuditLogRepository voterAuditLogRepository;

    @Mock
    private BallotRepository ballotRepository;

    @Mock
    private CryptoService cryptoService;

    @InjectMocks
    private AuditService auditService;

    @Test
    @DisplayName("generateAuditCsv produit l'en-tête exact, les lignes EMARGEMENT/BULLETIN et aucune donnée identifiante")
    void generateAuditCsv_producesExpectedFormatWithoutIdentifyingData() {
        Long electionId = 10L;
        Election election = Election.builder().id(electionId).titre("Scrutin Test").build();

        User user1 = User.builder()
                .id(987654L)
                .matricule("20239999")
                .email("electeur.secret@uasz.sn")
                .build();
        User user2 = User.builder()
                .id(987655L)
                .matricule("20238888")
                .email("autre.electeur@uasz.sn")
                .build();

        LocalDateTime votedAt1 = LocalDateTime.of(2026, 5, 12, 14, 0, 0).truncatedTo(ChronoUnit.HOURS);
        LocalDateTime votedAt2 = LocalDateTime.of(2026, 5, 12, 15, 0, 0).truncatedTo(ChronoUnit.HOURS);

        VoterAuditLog log1 = VoterAuditLog.builder()
                .id(1L)
                .user(user1)
                .election(election)
                .votedAt(votedAt1)
                .ipHash("ip-hash-111")
                .build();
        VoterAuditLog log2 = VoterAuditLog.builder()
                .id(2L)
                .user(user2)
                .election(election)
                .votedAt(votedAt2)
                .ipHash("ip-hash-222")
                .build();

        Ballot ballot1 = Ballot.builder()
                .id(UUID.randomUUID())
                .election(election)
                .candidatureId(777888L)
                .encryptedPayload("AES_PAYLOAD_SECRET_1")
                .ballotHash("ballot-hash-1")
                .previousHash("GENESIS")
                .sequenceNumber(1L)
                .build();
        Ballot ballot2 = Ballot.builder()
                .id(UUID.randomUUID())
                .election(election)
                .candidatureId(777999L)
                .encryptedPayload("AES_PAYLOAD_SECRET_2")
                .ballotHash("ballot-hash-2")
                .previousHash("ballot-hash-1")
                .sequenceNumber(2L)
                .build();

        when(voterAuditLogRepository.findByElectionId(electionId)).thenReturn(List.of(log1, log2));
        when(ballotRepository.findByElectionIdOrderBySequenceNumberAsc(electionId)).thenReturn(List.of(ballot1, ballot2));
        when(cryptoService.hash("GENESIS|AES_PAYLOAD_SECRET_1|1")).thenReturn("ballot-hash-1");
        when(cryptoService.hash("ballot-hash-1|AES_PAYLOAD_SECRET_2|2")).thenReturn("ballot-hash-2");

        String csv = auditService.generateAuditCsv(electionId);
        String[] lines = csv.split("\n");

        assertEquals(5, lines.length);
        assertEquals("Type,Timestamp,Hash_IP_ou_Ballot,Previous_Hash", lines[0]);

        assertEquals("EMARGEMENT,2026-05-12T14:00,ip-hash-111,N/A", lines[1]);
        assertEquals("EMARGEMENT,2026-05-12T15:00,ip-hash-222,N/A", lines[2]);
        assertEquals(0, votedAt1.getMinute());
        assertEquals(0, votedAt1.getSecond());
        assertEquals(0, votedAt2.getMinute());
        assertEquals(0, votedAt2.getSecond());

        assertEquals("BULLETIN,SEQ_1,ballot-hash-1,GENESIS", lines[3]);
        assertEquals("BULLETIN,SEQ_2,ballot-hash-2,ballot-hash-1", lines[4]);

        assertFalse(csv.contains("20239999"));
        assertFalse(csv.contains("20238888"));
        assertFalse(csv.contains("electeur.secret@uasz.sn"));
        assertFalse(csv.contains("autre.electeur@uasz.sn"));
        assertFalse(csv.contains("987654"));
        assertFalse(csv.contains("987655"));
        assertFalse(csv.contains("777888"));
        assertFalse(csv.contains("777999"));
        assertFalse(csv.contains("AES_PAYLOAD_SECRET_1"));
        assertFalse(csv.contains("AES_PAYLOAD_SECRET_2"));
    }
}
