package sn.uasz.vote.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@uasz.sn}")
    private String fromAddress;

    /**
     * Envoie le code OTP par e-mail à l'électeur.
     * En cas d'échec d'envoi, l'exception est loggée sans exposer l'OTP.
     *
     * @param toEmail  adresse de l'électeur
     * @param otpCode  le code à 6 chiffres (JAMAIS retourné à l'API)
     */
    public void sendOtpByEmail(String toEmail, String otpCode, String electionTitre) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
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
            log.info("[OTP] Email envoyé à {} pour l'élection '{}'", toEmail, electionTitre);

        } catch (MessagingException e) {
            log.error("[OTP] Échec d'envoi de l'email OTP à {} : {}", toEmail, e.getMessage());
            // On propage une RuntimeException pour informer l'appelant sans exposer l'OTP
            throw new RuntimeException("Impossible d'envoyer le code OTP par e-mail. Vérifiez votre adresse e-mail enregistrée.");
        }
    }
}
