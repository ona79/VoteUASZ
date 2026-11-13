package sn.uasz.vote.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * Service de chiffrement des bulletins de vote.
 * <p>
 * Utilise AES-256 en mode GCM (Galois/Counter Mode) avec NoPadding et dérivation de clé PBKDF2WithHmacSHA256 :
 * <ul>
 *   <li>Confidentialité garantie par AES-256</li>
 *   <li>Intégrité et authenticité garanties par le tag GCM 128-bit</li>
 *   <li>IV aléatoire de 12 octets préfixé au chiffré pour l'unicité de chaque bulletin</li>
 *   <li>Validation stricte de la longueur minimale de clé (32 caractères) au démarrage</li>
 * </ul>
 */
@Service
public class CryptoService {

    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int MIN_SECRET_LENGTH = 32;
    private static final int PBKDF2_ITERATIONS = 65_536;
    private static final int AES_KEY_BITS = 256;
    private static final byte[] PBKDF2_SALT = "VoteUASZ-AES256-GCM-Key-Derivation-Salt".getBytes(StandardCharsets.UTF_8);

    @Value("${app.crypto.secret-key}")
    private String secretKey;

    private volatile SecretKey cachedSecretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    @PostConstruct
    public void validateAndInitKey() {
        if (secretKey == null || secretKey.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "CRYPTO_SECRET invalide : la clé de chiffrement doit contenir au moins "
                            + MIN_SECRET_LENGTH + " caractères."
            );
        }
        this.cachedSecretKey = deriveKeyPbkdf2(secretKey);
    }

    /**
     * Chiffre la donnée en AES-256/GCM.
     * Format de sortie Base64 : [IV (12 octets) | ChiffréGCM]
     */
    public String encrypt(String data) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, getSecretKey(), parameterSpec);

            byte[] encryptedBytes = cipher.doFinal(data.getBytes(StandardCharsets.UTF_8));

            // Concaténer IV + chiffré pour le stockage
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encryptedBytes.length);
            buffer.put(iv);
            buffer.put(encryptedBytes);
            return Base64.getEncoder().encodeToString(buffer.array());

        } catch (Exception e) {
            throw new RuntimeException("Erreur de chiffrement AES-GCM du vote", e);
        }
    }

    /**
     * Déchiffre un bulletin chiffré par {@link #encrypt(String)}.
     * Extrait l'IV (12 premiers octets), puis déchiffre le reste.
     */
    public String decrypt(String encryptedData) {
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedData);

            // Extraire IV et chiffré
            byte[] iv = Arrays.copyOfRange(combined, 0, GCM_IV_LENGTH_BYTES);
            byte[] cipherText = Arrays.copyOfRange(combined, GCM_IV_LENGTH_BYTES, combined.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), parameterSpec);

            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);

        } catch (Exception e) {
            throw new RuntimeException("Erreur de déchiffrement AES-GCM du vote", e);
        }
    }

    public String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Erreur de hachage SHA-256", e);
        }
    }

    private SecretKey getSecretKey() {
        if (cachedSecretKey == null) {
            validateAndInitKey();
        }
        return cachedSecretKey;
    }

    private SecretKey deriveKeyPbkdf2(String secret) {
        try {
            PBEKeySpec spec = new PBEKeySpec(secret.toCharArray(), PBKDF2_SALT, PBKDF2_ITERATIONS, AES_KEY_BITS);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] keyBytes = factory.generateSecret(spec).getEncoded();
            return new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Erreur de dérivation PBKDF2 de la clé AES-256", e);
        }
    }
}
