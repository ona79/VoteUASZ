package sn.uasz.vote.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CryptoService — Chiffrement AES-256 & Hachage SHA-256")
class CryptoServiceTest {

    private CryptoService cryptoService;
    private static final String TEST_KEY = "TestSecretKeyForUnitTesting2026!";

    @BeforeEach
    void setUp() {
        cryptoService = new CryptoService();
        ReflectionTestUtils.setField(cryptoService, "secretKey", TEST_KEY);
    }

    @Test
    @DisplayName("Le chiffrement AES-256 doit produire un résultat non-null et différent du texte original")
    void encrypt_producesEncryptedOutput() {
        String plainText = "CHOICE:101:ELECTION:1:NONCE:abc123";
        String encrypted = cryptoService.encrypt(plainText);

        assertNotNull(encrypted);
        assertNotEquals(plainText, encrypted);
    }

    @Test
    @DisplayName("Le déchiffrement doit restituer exactement le texte original")
    void decryptAfterEncrypt_returnsOriginalText() {
        String originalText = "CHOICE:101:ELECTION:1:NONCE:unique-nonce-xyz";
        String encrypted = cryptoService.encrypt(originalText);
        String decrypted = cryptoService.decrypt(encrypted);

        assertEquals(originalText, decrypted);
    }

    @Test
    @DisplayName("Le hachage SHA-256 doit être déterministe (même entrée → même sortie)")
    void hash_isDeterministic() {
        String input = "testInput";
        String hash1 = cryptoService.hash(input);
        String hash2 = cryptoService.hash(input);

        assertEquals(hash1, hash2);
    }

    @Test
    @DisplayName("Le hachage SHA-256 doit produire une empreinte de 64 caractères hexadécimaux")
    void hash_produces64CharHexString() {
        String hash = cryptoService.hash("VoteUASZ data");
        assertEquals(64, hash.length());
    }

    @Test
    @DisplayName("Deux entrées différentes doivent produire des hachages différents")
    void hash_differentInputsDifferentOutputs() {
        String hash1 = cryptoService.hash("vote:candidat:1");
        String hash2 = cryptoService.hash("vote:candidat:2");

        assertNotEquals(hash1, hash2);
    }

    @Test
    @DisplayName("Avec AES-GCM (IV aléatoire), deux chiffrements du même texte produisent des ciphertexts différents mais tous deux déchiffrables")
    void encrypt_sameInput_gcmRandomizedCiphertext() {
        String text = "CHOICE:101:ELECTION:1:NONCE:fixed";
        String encrypted1 = cryptoService.encrypt(text);
        String encrypted2 = cryptoService.encrypt(text);
        assertNotEquals(encrypted1, encrypted2, "AES-GCM doit utiliser un IV aléatoire (ciphertexts distincts)");
        assertEquals(text, cryptoService.decrypt(encrypted1));
        assertEquals(text, cryptoService.decrypt(encrypted2));
    }

    @Test
    @DisplayName("Le ballot ne doit contenir aucune information identifiable de l'électeur")
    void encryptedPayload_containsNoUserInfo() {
        String userMatricule = "20230001";
        String userId = "42";
        // Le payload chiffré ne doit pas contenir le matricule ou l'ID de l'électeur
        String votePayload = "CHOICE:101:ELECTION:1:NONCE:random-abc";
        String encrypted = cryptoService.encrypt(votePayload);

        assertFalse(encrypted.contains(userMatricule),
                "Le payload chiffré ne doit pas contenir le matricule de l'électeur");
        assertFalse(encrypted.contains(userId),
                "Le payload chiffré ne doit pas contenir l'ID de l'électeur");
    }
}
