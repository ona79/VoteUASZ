package sn.uasz.vote.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.security.CustomUserDetailsService;
import sn.uasz.vote.security.JwtTokenProvider;

import java.util.List;

@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final String RESULTS_TOPIC_PREFIX = "/topic/results/";

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;
    private final ElectionRepository electionRepository;

    @Value("${app.cors.allowed-origins:http://localhost:4200,http://localhost:8080}")
    private List<String> allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.toArray(String[]::new);
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins)
                .withSockJS();
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) {
                    return message;
                }

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                        String jwt = authHeader.substring(7).trim();
                        if (jwtTokenProvider.validateToken(jwt)) {
                            String matricule = jwtTokenProvider.getMatriculeFromToken(jwt);
                            UserDetails userDetails = userDetailsService.loadUserByUsername(matricule);
                            if (userDetails.isEnabled()) {
                                accessor.setUser(new UsernamePasswordAuthenticationToken(
                                        userDetails, null, userDetails.getAuthorities()));
                            }
                        }
                    }
                } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    String destination = accessor.getDestination();
                    if (destination != null && destination.startsWith(RESULTS_TOPIC_PREFIX)) {
                        assertCanSubscribeToResults(accessor, destination);
                    }
                }
                return message;
            }
        });
    }

    private void assertCanSubscribeToResults(StompHeaderAccessor accessor, String destination) {
        if (!(accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth)) {
            throw new AccessDeniedException("Authentification requise pour suivre les résultats en direct.");
        }

        String idPart = destination.substring(RESULTS_TOPIC_PREFIX.length());
        Long electionId;
        try {
            electionId = Long.parseLong(idPart);
        } catch (NumberFormatException ex) {
            throw new AccessDeniedException("Identifiant d'élection invalide.");
        }

        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new AccessDeniedException("Élection introuvable."));

        ElectionStatus statut = election.getStatut();
        boolean isPublicPhase = statut == ElectionStatus.DEPOUILLEMENT
                || statut == ElectionStatus.PUBLICATION
                || statut == ElectionStatus.CLOTURE;
        if (isPublicPhase) {
            return;
        }

        boolean isSupervisor = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority())
                        || "ROLE_COMMISSION_ELECTORALE".equals(a.getAuthority()));
        if (!isSupervisor) {
            log.warn("[WS 403] Abonnement refusé à {} pour {} (statut={})", destination, auth.getName(), statut);
            throw new AccessDeniedException("Résultats en direct réservés à la supervision pendant le scrutin.");
        }
    }
}
