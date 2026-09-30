package sn.uasz.vote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.LoginRequest;
import sn.uasz.vote.dto.LoginResponse;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.security.JwtTokenProvider;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        String identifier = request.getMatriculeOrEmail();
        User user = userRepository.findByMatricule(identifier)
                .orElseGet(() -> userRepository.findByEmail(identifier).orElse(null));

        if (user != null && user.getLockedUntil() != null && java.time.LocalDateTime.now().isBefore(user.getLockedUntil())) {
            throw new org.springframework.security.authentication.LockedException(
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

            return ResponseEntity.ok(LoginResponse.builder()
                    .token(jwt)
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
                    .build());

        } catch (org.springframework.security.authentication.BadCredentialsException ex) {
            if (user != null) {
                int newAttempts = user.getFailedLoginAttempts() + 1;
                user.setFailedLoginAttempts(newAttempts);
                if (newAttempts >= 5) {
                    user.setLockedUntil(java.time.LocalDateTime.now().plusMinutes(5));
                    userRepository.save(user);
                    throw new org.springframework.security.authentication.LockedException(
                            "Votre compte est temporairement verrouillé suite à plusieurs tentatives d'authentification échouées."
                    );
                }
                userRepository.save(user);
            }
            throw ex;
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> payload) {
        String emailOrMatricule = payload != null ? payload.get("identifier") : null;
        if (emailOrMatricule != null && !emailOrMatricule.isBlank()) {
            userRepository.findByMatricule(emailOrMatricule)
                    .or(() -> userRepository.findByEmail(emailOrMatricule))
                    .ifPresent(user -> {
                        // Traitement interne / envoi des instructions sans divulguer l'existence au client
                    });
        }

        // Réponse neutre et constante pour prévenir toute énumération de comptes
        return ResponseEntity.ok(Map.of("message", "Si ce compte existe, les instructions ont été envoyées."));
    }
}
