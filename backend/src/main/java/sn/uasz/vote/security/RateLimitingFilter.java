package sn.uasz.vote.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Filtre de rate limiting par adresse IP (fenêtre glissante de 60 secondes)
 * protégeant les endpoints sensibles d'authentification et d'OTP.
 */
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    public static final int MAX_REQUESTS_PER_MINUTE = 20;
    private static final long WINDOW_MS = 60_000L;

    private static final Set<String> RATE_LIMITED_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/vote/request-otp",
            "/api/v1/vote/verify-otp"
    );

    private final ConcurrentHashMap<String, Deque<Long>> requestTimestampsByIp = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        if ("POST".equalsIgnoreCase(request.getMethod()) && RATE_LIMITED_PATHS.contains(uri)) {
            String clientIp = extractClientIp(request);
            String bucketKey = clientIp + ":" + uri;
            long now = System.currentTimeMillis();

            Deque<Long> timestamps = requestTimestampsByIp.computeIfAbsent(bucketKey, k -> new ArrayDeque<>());
            boolean allowed;
            synchronized (timestamps) {
                while (!timestamps.isEmpty() && now - timestamps.peekFirst() >= WINDOW_MS) {
                    timestamps.pollFirst();
                }
                if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                    allowed = false;
                } else {
                    timestamps.addLast(now);
                    allowed = true;
                }
            }

            if (!allowed) {
                log.warn("[RATE LIMIT 429] IP {} bloquée sur {}", clientIp, uri);
                response.setStatus(429);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                        "{\"error\":\"Too Many Requests\",\"message\":\"Trop de requêtes depuis cette adresse IP. Veuillez patienter une minute.\"}"
                );
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    public static String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}

