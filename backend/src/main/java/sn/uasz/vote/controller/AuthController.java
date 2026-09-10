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
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getMatriculeOrEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        User user = userRepository.findByMatricule(request.getMatriculeOrEmail())
                .orElseGet(() -> userRepository.findByEmail(request.getMatriculeOrEmail()).orElseThrow());

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
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> payload) {
        String emailOrMatricule = payload.get("identifier");
        User user = userRepository.findByMatricule(emailOrMatricule)
                .orElseGet(() -> userRepository.findByEmail(emailOrMatricule)
                        .orElseThrow(() -> new IllegalArgumentException("Identifiant non trouvé")));

        // Simulation d'envoi d'instructions de réinitialisation
        return ResponseEntity.ok(Map.of("message", "Instructions de réinitialisation envoyées à " + user.getEmail()));
    }
}
