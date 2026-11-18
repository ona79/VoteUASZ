package sn.uasz.vote.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.LoginRequest;
import sn.uasz.vote.dto.LoginResponse;
import sn.uasz.vote.entity.PasswordResetToken;
import sn.uasz.vote.entity.RefreshToken;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.repository.PasswordResetTokenRepository;
import sn.uasz.vote.repository.RefreshTokenRepository;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.security.JwtTokenProvider;
import sn.uasz.vote.service.CryptoService;
import sn.uasz.vote.service.OtpEmailService;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "Connexion JWT, refresh token et gestion de mot de passe")
public class AuthController {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MAX_RESET_ATTEMPTS = 5;
    private static final long FORGOT_PASSWORD_COOLDOWN_SECONDS = 60L;
    private static final String GENERIC_RESET_ERROR = "Code de réinitialisation invalide ou expiré.";

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final CryptoService cryptoService;
    private final OtpEmailService otpEmailService;

    @Value("${app.jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    @PostMapping("/login")
    @Operation(summary = "Authentifier un utilisateur par matricule ou e-mail et retourner un JWT et un refresh token")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        String identifier = request.getMatriculeOrEmail();
        User user = findUserByIdentifier(identifier);

        if (user != null && user.getLockedUntil() != null && LocalDateTime.now().isBefore(user.getLockedUntil())) {
            throw new LockedException(
                    "Votre compte est temporairement verrouillé suite à plusieurs tentatives d'authentification échouées."
            );
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(identifier, request.getPassword())
            );

            if (user != null && (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null)) {
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
                userRepository.save(user);
            }

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);

            if (user == null) {
                user = userRepository.findByMatricule(identifier)
                        .orElseGet(() -> userRepository.findByEmail(identifier).orElseThrow());
            }

            String rawRefreshToken = issueRefreshToken(user);
            return ResponseEntity.ok(buildLoginResponse(jwt, rawRefreshToken, user));

        } catch (BadCredentialsException ex) {
            if (user != null) {
                int newAttempts = user.getFailedLoginAttempts() + 1;
                user.setFailedLoginAttempts(newAttempts);
                if (newAttempts >= 5) {
                    user.setLockedUntil(LocalDateTime.now().plusMinutes(5));
                    userRepository.save(user);
                    throw new LockedException(
                            "Votre compte est temporairement verrouillé suite à plusieurs tentatives d'authentification échouées."
                    );
                }
                userRepository.save(user);
            }
            throw ex;
        }
    }

    @PostMapping("/refresh")
    @Transactional
    @Operation(summary = "Renouveler le JWT d'accès via un refresh token valide (avec rotation)")
    public ResponseEntity<LoginResponse> refresh(@RequestBody Map<String, String> payload) {
        String rawRefreshToken = payload != null ? payload.get("refreshToken") : null;
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new IllegalArgumentException("Le refresh token est obligatoire.");
        }

        String tokenHash = cryptoService.hash(rawRefreshToken.trim());
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadCredentialsException("Refresh token invalide."));

        if (stored.isRevoked() || stored.isExpired()) {
            throw new BadCredentialsException("Refresh token expiré ou révoqué.");
        }

        User user = stored.getUser();
        if (!user.isActive()) {
            throw new DisabledException("Ce compte utilisateur est désactivé.");
        }
        if (user.getLockedUntil() != null && LocalDateTime.now().isBefore(user.getLockedUntil())) {
            throw new LockedException("Votre compte est temporairement verrouillé.");
        }

        // Rotation : révoquer l'ancien et en émettre un nouveau
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        String newJwt = tokenProvider.generateTokenFromMatricule(user.getMatricule());
        String newRefreshToken = issueRefreshToken(user);
        return ResponseEntity.ok(buildLoginResponse(newJwt, newRefreshToken, user));
    }

    @PostMapping("/logout")
    @Transactional
    @Operation(summary = "Révoquer le refresh token de la session courante")
    public ResponseEntity<Map<String, String>> logout(@RequestBody(required = false) Map<String, String> payload,
                                                      Authentication authentication) {
        String rawRefreshToken = payload != null ? payload.get("refreshToken") : null;
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenRepository.findByTokenHash(cryptoService.hash(rawRefreshToken.trim()))
                    .ifPresent(rt -> {
                        rt.setRevoked(true);
                        refreshTokenRepository.save(rt);
                    });
        } else if (authentication != null && authentication.isAuthenticated()) {
            userRepository.findByMatricule(authentication.getName())
                    .ifPresent(user -> refreshTokenRepository.revokeAllByUserId(user.getId()));
        }
        return ResponseEntity.ok(Map.of("message", "Déconnexion effectuée."));
    }

    @PostMapping("/forgot-password")
    @Transactional
    @Operation(summary = "Demander la réinitialisation du mot de passe (réponse neutre)")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> payload) {
        String emailOrMatricule = payload != null ? payload.get("identifier") : null;
        if (emailOrMatricule != null && !emailOrMatricule.isBlank()) {
            User user = findUserByIdentifier(emailOrMatricule.trim());
            if (user != null && user.isActive()) {
                boolean inCooldown = passwordResetTokenRepository
                        .findTopByUserIdOrderByCreatedAtDesc(user.getId())
                        .map(last -> last.getCreatedAt() != null
                                && last.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(FORGOT_PASSWORD_COOLDOWN_SECONDS)))
                        .orElse(false);

                if (!inCooldown) {
                    passwordResetTokenRepository.invalidateAllUnusedByUserId(user.getId());
                    String rawCode = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
                    PasswordResetToken resetToken = PasswordResetToken.builder()
                            .user(user)
                            .codeHash(passwordEncoder.encode(rawCode))
                            .expiresAt(LocalDateTime.now().plusMinutes(15))
                            .used(false)
                            .attemptsCount(0)
                            .build();
                    passwordResetTokenRepository.save(resetToken);
                    otpEmailService.sendPasswordResetEmail(user.getEmail(), rawCode);
                }
            }
        }

        // Réponse neutre et constante pour prévenir toute énumération de comptes
        return ResponseEntity.ok(Map.of("message", "Si ce compte existe, les instructions ont été envoyées."));
    }

    @PostMapping("/reset-password")
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    @Operation(summary = "Réinitialiser le mot de passe avec le code reçu par e-mail")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> payload) {
        String identifier = payload != null ? payload.get("identifier") : null;
        String code = payload != null ? payload.get("code") : null;
        String newPassword = payload != null ? payload.get("newPassword") : null;

        if (identifier == null || identifier.isBlank() || code == null || code.isBlank() || newPassword == null) {
            throw new IllegalArgumentException(GENERIC_RESET_ERROR);
        }
        validatePasswordStrength(newPassword);

        User user = findUserByIdentifier(identifier.trim());
        if (user == null) {
            throw new IllegalArgumentException(GENERIC_RESET_ERROR);
        }

        PasswordResetToken resetToken = passwordResetTokenRepository
                .findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new IllegalArgumentException(GENERIC_RESET_ERROR));

        if (resetToken.getAttemptsCount() >= MAX_RESET_ATTEMPTS || resetToken.isExpired()) {
            resetToken.setUsed(true);
            passwordResetTokenRepository.save(resetToken);
            throw new IllegalArgumentException(GENERIC_RESET_ERROR);
        }

        if (!passwordEncoder.matches(code.trim(), resetToken.getCodeHash())) {
            int nextAttempts = resetToken.getAttemptsCount() + 1;
            resetToken.setAttemptsCount(nextAttempts);
            if (nextAttempts >= MAX_RESET_ATTEMPTS) {
                resetToken.setUsed(true);
            }
            passwordResetTokenRepository.save(resetToken);
            throw new IllegalArgumentException(GENERIC_RESET_ERROR);
        }

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setMustChangePassword(false);
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserId(user.getId());

        return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès."));
    }

    @PostMapping("/change-password")
    @Transactional
    @Operation(summary = "Modifier le mot de passe de l'utilisateur connecté")
    public ResponseEntity<Map<String, String>> changePassword(@RequestBody Map<String, String> payload,
                                                              Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BadCredentialsException("Authentification requise.");
        }
        String currentPassword = payload != null ? payload.get("currentPassword") : null;
        String newPassword = payload != null ? payload.get("newPassword") : null;

        if (currentPassword == null || currentPassword.isBlank() || newPassword == null) {
            throw new IllegalArgumentException("Le mot de passe actuel et le nouveau mot de passe sont obligatoires.");
        }
        validatePasswordStrength(newPassword);

        User user = userRepository.findByMatricule(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadCredentialsException("Le mot de passe actuel est incorrect.");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'ancien mot de passe.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserId(user.getId());

        return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès."));
    }

    private User findUserByIdentifier(String identifier) {
        return userRepository.findByMatricule(identifier)
                .orElseGet(() -> userRepository.findByEmail(identifier).orElse(null));
    }

    private String issueRefreshToken(User user) {
        String rawRefreshToken = UUID.randomUUID() + "-" + UUID.randomUUID();
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(cryptoService.hash(rawRefreshToken))
                .expiresAt(LocalDateTime.now().plusSeconds(refreshExpirationMs / 1000))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);
        return rawRefreshToken;
    }

    private LoginResponse buildLoginResponse(String jwt, String refreshToken, User user) {
        return LoginResponse.builder()
                .token(jwt)
                .refreshToken(refreshToken)
                .id(user.getId())
                .matricule(user.getMatricule())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .email(user.getEmail())
                .role(user.getRole())
                .typeElecteur(user.getTypeElecteur())
                .ufr(user.getUfr())
                .filiere(user.getFiliere())
                .niveau(user.getNiveau())
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    private void validatePasswordStrength(String password) {
        if (password.length() < 8) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit contenir au moins 8 caractères.");
        }
    }
}
