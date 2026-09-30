package sn.uasz.vote.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@Slf4j
public class OtpEmailService {

    private final JavaMailSender mailSender;
    private final Environment environment;

    public OtpEmailService(@Autowired(required = false) JavaMailSender mailSender, Environment environment) {
        this.mailSender = mailSender;
        this.environment = environment;
    }

    @Value("${app.mail.from:${spring.mail.username:noreply@voteuasz.sn}}")
    private String fromAddress;

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

            String htmlBody = """
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

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("[OTP] Email envoyé avec succès à {} via SMTP.", toEmail);

        } catch (Exception e) {
            log.warn("[OTP SMTP WARNING] Impossible d'acheminer l'email via SMTP ({}) - Utiliser le code OTP consigné dans la console.", e.getMessage());
        }
    }
}
