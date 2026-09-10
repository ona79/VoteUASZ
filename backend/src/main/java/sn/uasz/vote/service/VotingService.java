package sn.uasz.vote.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.uasz.vote.dto.LiveResultsDto;
import sn.uasz.vote.dto.VoteResponseDto;
import sn.uasz.vote.entity.*;
import sn.uasz.vote.enums.CandidacyStatus;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VotingService {

    private final UserRepository userRepository;
    private final ElectionRepository electionRepository;
    private final CandidatureRepository candidatureRepository;
    private final VoteOTPRepository voteOTPRepository;
    private final VoteTokenRepository voteTokenRepository;
    private final BallotRepository ballotRepository;
    private final VoterAuditLogRepository voterAuditLogRepository;
    private final ElectionService electionService;
    private final EligibilityService eligibilityService;
    private final CryptoService cryptoService;
    private final PasswordEncoder passwordEncoder;
    private final SimpMessagingTemplate messagingTemplate;
    private final OtpEmailService otpEmailService;

    private final SecureRandom random = new SecureRandom();

    @Transactional
    public void requestOtp(String userMatricule, Long electionId) {
        User user = userRepository.findByMatricule(userMatricule)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé"));

        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new IllegalArgumentException("Élection non trouvée"));

        if (election.getStatut() != ElectionStatus.VOTE_OUVERT) {
            throw new IllegalStateException("Le vote n'est pas ouvert pour cette élection.");
        }

        if (!eligibilityService.isEligible(user, election)) {
            throw new IllegalStateException(eligibilityService.getIneligibilityReason(user, election));
        }

        if (voterAuditLogRepository.existsByUserIdAndElectionId(user.getId(), electionId)) {
            throw new IllegalStateException("Vous avez déjà voté pour cette élection !");
        }

        String rawOtp = String.format("%06d", random.nextInt(1000000));
        String codeHash = passwordEncoder.encode(rawOtp);

        VoteOTP otp = VoteOTP.builder()
                .user(user)
                .election(election)
                .codeHash(codeHash)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();

        voteOTPRepository.save(otp);

        // Envoi sécurisé par e-mail — l'OTP n'est JAMAIS retourné dans la réponse HTTP
        log.info("[OTP] Code généré et envoyé par e-mail pour l'utilisateur {} (élection #{}).", userMatricule, electionId);
        otpEmailService.sendOtpByEmail(user.getEmail(), rawOtp, election.getTitre());
    }

    @Transactional
    public String verifyOtpAndGenerateToken(String userMatricule, Long electionId, String rawOtp) {
        User user = userRepository.findByMatricule(userMatricule)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé"));

        VoteOTP otp = voteOTPRepository.findTopByUserIdAndElectionIdAndUsedFalseOrderByCreatedAtDesc(user.getId(), electionId)
                .orElseThrow(() -> new IllegalArgumentException("Aucun code OTP actif trouvé. Veuillez en solliciter un nouveau."));

        if (otp.isExpired()) {
            throw new IllegalStateException("Le code OTP a expiré (durée de validité 5 minutes dépassée).");
        }

        if (!passwordEncoder.matches(rawOtp, otp.getCodeHash())) {
            throw new IllegalArgumentException("Code OTP incorrect.");
        }

        otp.setUsed(true);
        voteOTPRepository.save(otp);

        String rawToken = UUID.randomUUID().toString();
        String tokenHash = cryptoService.hash(rawToken + "_" + user.getId() + "_" + System.currentTimeMillis());

        VoteToken voteToken = VoteToken.builder()
                .tokenHash(tokenHash)
                .user(user)
                .election(otp.getElection())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build();

        voteTokenRepository.save(voteToken);

        return tokenHash;
    }

    @Transactional
    public VoteResponseDto submitVote(String tokenHash, Long electionId, Long candidatureId) {
        VoteToken voteToken = voteTokenRepository.findByTokenHashAndUsedFalse(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Jeton de vote invalide ou déjà utilisé."));

        if (LocalDateTime.now().isAfter(voteToken.getExpiresAt())) {
            throw new IllegalStateException("Le jeton de vote a expiré.");
        }

        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new IllegalArgumentException("Élection non trouvée"));

        if (election.getStatut() != ElectionStatus.VOTE_OUVERT) {
            throw new IllegalStateException("La période de vote est fermée.");
        }

        User user = voteToken.getUser();
        if (voterAuditLogRepository.existsByUserIdAndElectionId(user.getId(), electionId)) {
            throw new IllegalStateException("Anti-double-vote : Vous avez déjà un vote comptabilisé pour cette élection.");
        }

        Candidature candidature = candidatureRepository.findById(candidatureId)
                .orElseThrow(() -> new IllegalArgumentException("Candidature sélectionnée introuvable"));

        if (candidature.getStatut() != CandidacyStatus.APPROVED || !candidature.getElection().getId().equals(electionId)) {
            throw new IllegalArgumentException("Candidature non valide pour cette élection.");
        }

        // 1. Chiffrement du vote & création du Bulletin Anonyme
        String votePayload = "CHOICE:" + candidatureId + ":ELECTION:" + electionId + ":NONCE:" + UUID.randomUUID();
        String encryptedPayload = cryptoService.encrypt(votePayload);
        String ballotHash = cryptoService.hash(encryptedPayload + "_" + System.nanoTime());

        Ballot ballot = Ballot.builder()
                .election(election)
                .candidatureId(candidatureId)
                .encryptedPayload(encryptedPayload)
                .ballotHash(ballotHash)
                .build();
        ballotRepository.save(ballot);

        // 2. Émargement de l'électeur (VoterAuditLog sans lien vers le bulletin)
        VoterAuditLog auditLog = VoterAuditLog.builder()
                .user(user)
                .election(election)
                .votedAt(LocalDateTime.now())
                .ipHash(cryptoService.hash("USER_IP_" + user.getId()))
                .build();
        voterAuditLogRepository.save(auditLog);

        // 3. Invalidation immédiate du jeton à usage unique
        voteToken.setUsed(true);
        voteTokenRepository.save(voteToken);

        // 4. Diffusion WebSocket en direct des nouveaux résultats
        LiveResultsDto liveResults = getLiveResults(electionId);
        messagingTemplate.convertAndSend("/topic/results/" + electionId, liveResults);

        return VoteResponseDto.builder()
                .success(true)
                .message("Votre vote a été enregistré avec succès et de manière anonyme.")
                .ballotHash(ballotHash)
                .build();
    }

    public LiveResultsDto getLiveResults(Long electionId) {
        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new IllegalArgumentException("Élection non trouvée ID: " + electionId));

        List<Candidature> candidatures = candidatureRepository.findByElectionIdAndStatut(electionId, CandidacyStatus.APPROVED);
        long totalVotes = ballotRepository.countByElectionId(electionId);

        List<LiveResultsDto.CandidatureResultDto> candidateResults = new ArrayList<>();
        for (Candidature c : candidatures) {
            long count = ballotRepository.countByElectionIdAndCandidatureId(electionId, c.getId());
            double percentage = totalVotes > 0 ? ((double) count / totalVotes) * 100.0 : 0.0;

            candidateResults.add(LiveResultsDto.CandidatureResultDto.builder()
                    .candidatureId(c.getId())
                    .nomCandidat(c.getCandidat().getPrenom() + " " + c.getCandidat().getNom())
                    .nomListe(c.getNomListe())
                    .voteCount(count)
                    .percentage(Math.round(percentage * 100.0) / 100.0)
                    .build());
        }

        return LiveResultsDto.builder()
                .electionId(electionId)
                .electionTitre(election.getTitre())
                .totalVotes(totalVotes)
                .candidateResults(candidateResults)
                .build();
    }
}
