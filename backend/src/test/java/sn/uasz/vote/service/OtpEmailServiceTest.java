package sn.uasz.vote.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("OtpEmailService — Envoi OTP et Reset Password")
class OtpEmailServiceTest {

    @Test
    @DisplayName("Envoi OTP et Reset via JavaMailSender en mode dev et prod")
    void sendEmails_withJavaMailSender_sendsMimeMessages() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
        Environment env = mock(Environment.class);
        when(env.acceptsProfiles(any(Profiles.class))).thenReturn(false).thenReturn(true);

        OtpEmailService service = new OtpEmailService(mailSender, env);
        ReflectionTestUtils.setField(service, "fromAddress", "noreply@voteuasz.sn");
        ReflectionTestUtils.setField(service, "brevoApiKey", "");

        assertDoesNotThrow(() -> service.sendOtpByEmail("elec@uasz.sn", "123456", "Scrutin <L3> & Test"));
        assertDoesNotThrow(() -> service.sendPasswordResetEmail("elec@uasz.sn", "654321"));

        verify(mailSender, times(2)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Sans JavaMailSender ni clé Brevo, aucun appel SMTP et aucune exception")
    void sendEmails_withoutMailSender_doesNotThrow() {
        Environment env = mock(Environment.class);
        when(env.acceptsProfiles(any(Profiles.class))).thenReturn(true);

        OtpEmailService service = new OtpEmailService(null, env);
        ReflectionTestUtils.setField(service, "fromAddress", "");
        ReflectionTestUtils.setField(service, "brevoApiKey", "");

        assertDoesNotThrow(() -> service.sendOtpByEmail("elec@uasz.sn", "123456", null));
        assertDoesNotThrow(() -> service.sendPasswordResetEmail("elec@uasz.sn", "654321"));
    }

    @Test
    @DisplayName("Échec SMTP géré proprement sans bloquer le flux")
    void sendEmails_whenSmtpThrows_doesNotPropagate() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("SMTP down"));
        Environment env = mock(Environment.class);
        when(env.acceptsProfiles(any(Profiles.class))).thenReturn(false);

        OtpEmailService service = new OtpEmailService(mailSender, env);
        ReflectionTestUtils.setField(service, "fromAddress", "noreply@voteuasz.sn");
        ReflectionTestUtils.setField(service, "brevoApiKey", "");

        assertDoesNotThrow(() -> service.sendOtpByEmail("elec@uasz.sn", "123456", "Test"));
    }
}
