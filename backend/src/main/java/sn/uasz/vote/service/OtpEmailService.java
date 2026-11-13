package sn.uasz.vote.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OtpEmailService {

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    private final JavaMailSender mailSender;
    private final Environment environment;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public OtpEmailService(@Autowired(required = false) JavaMailSender mailSender, Environment environment) {
        this.mailSender = mailSender;
        this.environment = environment;
    }

    @Value("${app.mail.from:${spring.mail.username:noreply@voteuasz.sn}}")
    private String fromAddress;

    @Value("${app.mail.brevo-api-key:}")
    private String brevoApiKey;

    /**
     * Envoie le code OTP par e-mail à l'électeur et le consigne dans les logs.
     * En production, le code est strictement masqué ([MASQUÉ EN PROD]) pour la sécurité.
     * En profils de développement ou test, le code reste affiché pour faciliter le débogage.
     *
     * @param toEmail       adresse de l'électeur
     * @param otpCode       le code à 6 chiffres
     * @param electionTitre titre de l'élection
     */
    public void sendOtpByEmail(String toEmail, String otpCode, String electionTitre) {
        boolean isProd = environment.acceptsProfiles(Profiles.of("prod"));
        if (isProd) {
            log.info("🔑 [OTP VOTEUASZ] Code OTP généré et acheminé par email pour {} : [MASQUÉ EN PROD]", toEmail);
        } else {
            log.info("=================================================");
            log.info("🔑 [OTP VOTEUASZ] Code OTP généré pour {} : {}", toEmail, otpCode);
            log.info("=================================================");
        }

        String sender = (fromAddress != null && !fromAddress.trim().isEmpty())
                ? fromAddress.trim()
                : "noreply@voteuasz.sn";

        String htmlBody = buildHtmlBody(electionTitre, otpCode);

        // Priorité à l'API HTTPS Brevo si BREVO_API_KEY est configurée (contourne le blocage SMTP de Render Free)
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
            sendViaBrevoHttpApi(sender, toEmail, htmlBody);
            return;
        }

        if (mailSender == null) {
            log.info("[OTP] MailSender non disponible (environnement test/hors-ligne). Email non expédié par SMTP.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(sender);
            helper.setTo(toEmail);
            helper.setSubject("VoteUASZ — Code de vote sécurisé");
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("[OTP] Email envoyé avec succès à {} via SMTP.", toEmail);

        } catch (Exception e) {
            log.warn("[OTP SMTP WARNING] Impossible d'acheminer l'email via SMTP ({}) - Utiliser le code OTP consigné dans la console.", e.getMessage());
        }
    }

    private void sendViaBrevoHttpApi(String sender, String toEmail, String htmlBody) {
        try {
            Map<String, Object> payload = Map.of(
                    "sender", Map.of("name", "VoteUASZ", "email", sender),
                    "to", List.of(Map.of("email", toEmail)),
                    "subject", "VoteUASZ — Code de vote sécurisé",
                    "htmlContent", htmlBody
            );
            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BREVO_API_URL))
                    .timeout(Duration.ofSeconds(10))
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .header("api-key", brevoApiKey.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[OTP] Email envoyé avec succès à {} via API HTTPS Brevo (HTTP {}).", toEmail, response.statusCode());
            } else {
                log.warn("[OTP BREVO API WARNING] Échec envoi Brevo HTTP {} : {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("[OTP BREVO API WARNING] Erreur appel API Brevo ({})", e.getMessage());
        }
    }

    private String buildHtmlBody(String electionTitre, String otpCode) {
        return """
                    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <div style="background: linear-gradient(135deg, #047857, #065f46); padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">
                          🗳️ VoteUASZ — Code de vote
                        </h1>
                      </div>
                      <div style="padding: 28px 24px;">
                        <p style="color: #334155; font-size: 14px; margin-bottom: 8px;">
                          Vous participez à l'élection : <strong>%s</strong>
                        </p>
                        <p style="color: #64748b; font-size: 13px; margin-bottom: 20px;">
                          Votre code de vote à usage unique, valable <strong>5 minutes</strong> :
                        </p>
                        <div style="background: #f8fafc; border: 2px solid #047857; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                          <span style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #047857; font-family: monospace;">%s</span>
                        </div>
                        <p style="color: #94a3b8; font-size: 11px; text-align: center;">
                          Ne partagez jamais ce code. L'équipe VoteUASZ ne vous le demandera pas.
                        </p>
                      </div>
                      <div style="background: #f8fafc; padding: 12px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                          Université Assane Seck de Ziguinchor (UASZ) — Plateforme VoteUASZ
                        </p>
                      </div>
                    </div>
                    """.formatted(electionTitre, otpCode);
    }
}
