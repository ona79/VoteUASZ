package sn.uasz.vote.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.repository.ElectionRepository;
import sn.uasz.vote.security.CustomUserDetails;
import sn.uasz.vote.security.CustomUserDetailsService;
import sn.uasz.vote.security.JwtTokenProvider;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("WebSocketConfig — Intercepteur STOMP & RBAC")
class WebSocketConfigTest {

    private JwtTokenProvider jwtTokenProvider;
    private CustomUserDetailsService userDetailsService;
    private ElectionRepository electionRepository;
    private ChannelInterceptor interceptor;
    private MessageChannel channel;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = mock(JwtTokenProvider.class);
        userDetailsService = mock(CustomUserDetailsService.class);
        electionRepository = mock(ElectionRepository.class);
        channel = mock(MessageChannel.class);

        WebSocketConfig config = new WebSocketConfig(jwtTokenProvider, userDetailsService, electionRepository);
        ReflectionTestUtils.setField(config, "allowedOrigins", List.of("http://localhost:4200"));

        ChannelRegistration registration = new ChannelRegistration();
        config.configureClientInboundChannel(registration);
        @SuppressWarnings("unchecked")
        List<ChannelInterceptor> interceptors = (List<ChannelInterceptor>) ReflectionTestUtils.getField(registration, "interceptors");
        assertNotNull(interceptors);
        assertFalse(interceptors.isEmpty());
        interceptor = interceptors.get(0);
    }

    private Message<byte[]> buildStompMessage(StompCommand cmd, String authHeader, String destination, UsernamePasswordAuthenticationToken user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(cmd);
        accessor.setLeaveMutable(true);
        if (authHeader != null) {
            accessor.setNativeHeader("Authorization", authHeader);
        }
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (user != null) {
            accessor.setUser(user);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    @DisplayName("CONNECT avec JWT valide authentifie l'utilisateur")
    void connect_validJwt_setsUser() {
        CustomUserDetails details = new CustomUserDetails(
                "E01", "pwd", true, true, false, List.of(new SimpleGrantedAuthority("ROLE_ELECTEUR")));
        when(jwtTokenProvider.validateToken("valid-jwt")).thenReturn(true);
        when(jwtTokenProvider.getMatriculeFromToken("valid-jwt")).thenReturn("E01");
        when(userDetailsService.loadUserByUsername("E01")).thenReturn(details);

        Message<?> msg = buildStompMessage(StompCommand.CONNECT, "Bearer valid-jwt", null, null);
        Message<?> result = interceptor.preSend(msg, channel);

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertNotNull(accessor.getUser());
        assertEquals("E01", accessor.getUser().getName());
    }

    @Test
    @DisplayName("CONNECT et SUBSCRIBE bloqués si mustChangePassword=true")
    void connectAndSubscribe_mustChangePasswordTrue_throwsAccessDenied() {
        CustomUserDetails mustChangeUser = new CustomUserDetails(
                "E02", "pwd", true, true, true, List.of(new SimpleGrantedAuthority("ROLE_ELECTEUR")));
        when(jwtTokenProvider.validateToken("jwt-mcp")).thenReturn(true);
        when(jwtTokenProvider.getMatriculeFromToken("jwt-mcp")).thenReturn("E02");
        when(userDetailsService.loadUserByUsername("E02")).thenReturn(mustChangeUser);

        Message<?> connectMsg = buildStompMessage(StompCommand.CONNECT, "Bearer jwt-mcp", null, null);
        AccessDeniedException connectEx = assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(connectMsg, channel));
        assertTrue(connectEx.getMessage().contains("PASSWORD_CHANGE_REQUIRED"));

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                mustChangeUser, null, mustChangeUser.getAuthorities());
        Message<?> subMsg = buildStompMessage(StompCommand.SUBSCRIBE, null, "/topic/results/1", auth);
        AccessDeniedException subEx = assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(subMsg, channel));
        assertTrue(subEx.getMessage().contains("PASSWORD_CHANGE_REQUIRED"));
    }

    @Test
    @DisplayName("SUBSCRIBE sur /topic/results/{id} : anonyme refusé, électeur refusé en VOTE_OUVERT, superviseur autorisé, électeur autorisé en DEPOUILLEMENT")
    void subscribe_resultsTopic_enforcesPhaseAndRole() {
        Message<?> anonMsg = buildStompMessage(StompCommand.SUBSCRIBE, null, "/topic/results/1", null);
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(anonMsg, channel));

        CustomUserDetails elector = new CustomUserDetails(
                "E01", "pwd", true, true, false, List.of(new SimpleGrantedAuthority("ROLE_ELECTEUR")));
        UsernamePasswordAuthenticationToken electorAuth = new UsernamePasswordAuthenticationToken(
                elector, null, elector.getAuthorities());

        when(electionRepository.findById(1L))
                .thenReturn(Optional.of(Election.builder().id(1L).statut(ElectionStatus.VOTE_OUVERT).build()));
        Message<?> electorOpenMsg = buildStompMessage(StompCommand.SUBSCRIBE, null, "/topic/results/1", electorAuth);
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(electorOpenMsg, channel));

        CustomUserDetails admin = new CustomUserDetails(
                "ADM01", "pwd", true, true, false, List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));
        UsernamePasswordAuthenticationToken adminAuth = new UsernamePasswordAuthenticationToken(
                admin, null, admin.getAuthorities());
        Message<?> adminOpenMsg = buildStompMessage(StompCommand.SUBSCRIBE, null, "/topic/results/1", adminAuth);
        assertDoesNotThrow(() -> interceptor.preSend(adminOpenMsg, channel));

        when(electionRepository.findById(2L))
                .thenReturn(Optional.of(Election.builder().id(2L).statut(ElectionStatus.DEPOUILLEMENT).build()));
        Message<?> electorDepMsg = buildStompMessage(StompCommand.SUBSCRIBE, null, "/topic/results/2", electorAuth);
        assertDoesNotThrow(() -> interceptor.preSend(electorDepMsg, channel));
    }
}
