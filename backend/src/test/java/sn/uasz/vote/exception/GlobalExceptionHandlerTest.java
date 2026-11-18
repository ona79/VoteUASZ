package sn.uasz.vote.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("GlobalExceptionHandler — Mapping des exceptions vers codes HTTP")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("401 Unauthorized pour BadCredentials, Disabled, Locked, UsernameNotFound et AuthenticationException")
    void authExceptions_return401() {
        assertEquals(HttpStatus.UNAUTHORIZED, handler.handleBadCredentials(new BadCredentialsException("bad")).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, handler.handleDisabledException(new DisabledException("off")).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, handler.handleLockedException(new LockedException("locked")).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, handler.handleUsernameNotFound(new UsernameNotFoundException("missing")).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, handler.handleAuthenticationException(new AuthenticationServiceException("auth")).getStatusCode());
    }

    @Test
    @DisplayName("403 Forbidden pour AccessDeniedException")
    void accessDenied_returns403() {
        ResponseEntity<Map<String, Object>> res = handler.handleAccessDeniedException(new AccessDeniedException("denied"));
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertEquals("Forbidden", res.getBody().get("error"));
    }

    @Test
    @DisplayName("400 Bad Request pour DataIntegrity, HttpMessageNotReadable et IllegalArgument")
    void badRequestExceptions_return400() {
        assertEquals(HttpStatus.BAD_REQUEST, handler.handleDataIntegrityViolation(new DataIntegrityViolationException("dup")).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, handler.handleHttpMessageNotReadable(new HttpMessageNotReadableException("bad json", null, null)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, handler.handleIllegalArgumentException(new IllegalArgumentException("invalid")).getStatusCode());
    }

    @Test
    @DisplayName("409 Conflict pour IllegalStateException et 500 pour Exception générique")
    void conflictAndInternalError_return409And500() {
        assertEquals(HttpStatus.CONFLICT, handler.handleIllegalStateException(new IllegalStateException("conflict")).getStatusCode());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, handler.handleGeneralException(new RuntimeException("boom")).getStatusCode());
    }
}
