package sn.uasz.vote.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                log.info("[JWT Filter] Request {} {} — Token JWT reçu (début: '{}...')",
                        method, uri, jwt.substring(0, Math.min(jwt.length(), 20)));

                if (tokenProvider.validateToken(jwt)) {
                    String matricule = tokenProvider.getMatriculeFromToken(jwt);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(matricule);

                    if (userDetails.isEnabled()) {
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        log.info("[JWT Filter] SUCCESS — Utilisateur '{}' authentifié avec succès pour {} {} (Rôles: {})",
                                matricule, method, uri, userDetails.getAuthorities());
                    } else {
                        log.warn("[JWT Filter] FAIL — Compte désactivé pour l'utilisateur '{}' sur {} {}", matricule, method, uri);
                    }
                } else {
                    log.warn("[JWT Filter] FAIL — Token JWT invalide ou expiré pour {} {}", method, uri);
                }
            } else {
                log.debug("[JWT Filter] Aucun token JWT trouvé dans le header 'Authorization' pour {} {}", method, uri);
            }
        } catch (Exception ex) {
            log.error("[JWT Filter] EXCEPTION lors du traitement JWT pour " + method + " " + uri + ": " + ex.getMessage(), ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7).trim();
        }
        return null;
    }
}
