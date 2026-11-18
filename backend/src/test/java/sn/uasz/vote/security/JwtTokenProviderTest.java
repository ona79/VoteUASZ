package sn.uasz.vote.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("JwtTokenProvider — Génération et validation des JWT")
class JwtTokenProviderTest {

    private JwtTokenProvider provider;
    private static final String SECRET = "TestJwtSecretKeyForUnitTestPurposeOnlyMinimum256BitsLong!";

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(provider, "jwtExpirationMs", 3_600_000L);
    }

    @Test
    @DisplayName("Génération et validation d'un JWT depuis Authentication et matricule")
    void generateAndValidate_validToken_succeeds() {
        var auth = new UsernamePasswordAuthenticationToken(
                "20230001", null, List.of(new SimpleGrantedAuthority("ROLE_ELECTEUR")));
        String token = provider.generateToken(auth);
        assertTrue(provider.validateToken(token));
        assertEquals("20230001", provider.getMatriculeFromToken(token));

        String token2 = provider.generateTokenFromMatricule("20230002");
        assertTrue(provider.validateToken(token2));
        assertEquals("20230002", provider.getMatriculeFromToken(token2));
    }

    @Test
    @DisplayName("Rejet des JWT expirés, malformés, vides ou signés avec une autre clé")
    void validateToken_invalidTokens_returnFalse() {
        assertFalse(provider.validateToken("not.a.jwt"));
        assertFalse(provider.validateToken(""));

        String expired = Jwts.builder()
                .setSubject("20230001")
                .setIssuedAt(new Date(System.currentTimeMillis() - 10_000))
                .setExpiration(new Date(System.currentTimeMillis() - 5_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
                .compact();
        assertFalse(provider.validateToken(expired));

        String wrongKey = Jwts.builder()
                .setSubject("20230001")
                .setExpiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor("AnotherSecretKeyWithAtLeast32CharactersLong!".getBytes(StandardCharsets.UTF_8)),
                        SignatureAlgorithm.HS256)
                .compact();
        assertFalse(provider.validateToken(wrongKey));
    }
}
