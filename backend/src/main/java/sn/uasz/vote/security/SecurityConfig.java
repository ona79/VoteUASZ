package sn.uasz.vote.security;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins:http://localhost:4200,http://localhost:8080}")
    private List<String> allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Endpoints publics
                        .requestMatchers("/api/v1/auth/**", "/ws/**", "/h2-console/**", "/swagger-ui/**", "/api-docs/**", "/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/elections", "/api/v1/elections/**", "/api/v1/results/**", "/api/v1/candidacies/**", "/api/v1/candidatures/**", "/api/v1/campaigns/**").permitAll()
                        // Création & modification des élections — SUPER_ADMIN uniquement
                        .requestMatchers(HttpMethod.POST, "/api/v1/elections", "/api/v1/elections/**").hasRole("SUPER_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/elections", "/api/v1/elections/**").hasRole("SUPER_ADMIN")
                        // Publications de campagne — CANDIDAT et SUPER_ADMIN
                        .requestMatchers(HttpMethod.POST, "/api/v1/campaigns", "/api/v1/candidatures/*/posts", "/api/v1/candidacies/*/posts").hasAnyRole("SUPER_ADMIN", "CANDIDAT")
                        // Endpoint CSV multipart — SUPER_ADMIN uniquement (doit être avant anyRequest)
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/users/import-csv").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/v1/admin/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/v1/commission/**").hasAnyRole("SUPER_ADMIN", "COMMISSION_ELECTORALE")
                        .requestMatchers("/api/v1/candidat/**").hasAnyRole("SUPER_ADMIN", "COMMISSION_ELECTORALE", "CANDIDAT")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            var auth = SecurityContextHolder.getContext().getAuthentication();
                            String user = auth != null ? auth.getName() : "ANONYMOUS";
                            Object authorities = auth != null ? auth.getAuthorities() : "NONE";

                            log.error("[FILTER 403 ACCESS DENIED] URI: {} {}, User: '{}', Rôles: {}, Raison: {}",
                                    request.getMethod(), request.getRequestURI(), user, authorities, accessDeniedException.getMessage());

                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Accès refusé par SecurityFilterChain\",\"user\":\"" + user + "\"}");
                        })
                        .authenticationEntryPoint((request, response, authException) -> {
                            log.error("[FILTER 401 UNAUTHORIZED] URI: {} {}, Raison: {}",
                                    request.getMethod(), request.getRequestURI(), authException.getMessage());

                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Authentification requise\"}");
                        })
                )
                .headers(headers -> headers.frameOptions(frame -> frame.disable())); // Pour la console H2

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
