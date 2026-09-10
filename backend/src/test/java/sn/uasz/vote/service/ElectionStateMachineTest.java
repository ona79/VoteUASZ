package sn.uasz.vote.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.enums.ElectionStatus;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ElectionStateMachine — Transitions d'État Contrôlées")
class ElectionStateMachineTest {

    private ElectionStateMachine stateMachine;

    @BeforeEach
    void setUp() {
        stateMachine = new ElectionStateMachine();
    }

    @Test
    @DisplayName("CONFIGURATION → CAMPAGNE : transition valide")
    void configToCampagne_isValid() {
        assertTrue(stateMachine.canTransition(ElectionStatus.CONFIGURATION, ElectionStatus.CAMPAGNE));
    }

    @Test
    @DisplayName("CAMPAGNE → VOTE_OUVERT : transition valide")
    void campagneToVoteOuvert_isValid() {
        assertTrue(stateMachine.canTransition(ElectionStatus.CAMPAGNE, ElectionStatus.VOTE_OUVERT));
    }

    @Test
    @DisplayName("VOTE_OUVERT → DEPOUILLEMENT : transition valide")
    void voteOuvertToDepouillement_isValid() {
        assertTrue(stateMachine.canTransition(ElectionStatus.VOTE_OUVERT, ElectionStatus.DEPOUILLEMENT));
    }

    @Test
    @DisplayName("DEPOUILLEMENT → PUBLICATION : transition valide")
    void depouillementToPublication_isValid() {
        assertTrue(stateMachine.canTransition(ElectionStatus.DEPOUILLEMENT, ElectionStatus.PUBLICATION));
    }

    @Test
    @DisplayName("PUBLICATION → CLOTURE : transition valide")
    void publicationToCloture_isValid() {
        assertTrue(stateMachine.canTransition(ElectionStatus.PUBLICATION, ElectionStatus.CLOTURE));
    }

    @Test
    @DisplayName("CLOTURE → anything : toujours invalide (état terminal)")
    void clotureToAny_isInvalid() {
        for (ElectionStatus s : ElectionStatus.values()) {
            if (s != ElectionStatus.CLOTURE) {
                assertFalse(stateMachine.canTransition(ElectionStatus.CLOTURE, s),
                        "CLOTURE ne doit pas permettre la transition vers " + s);
            }
        }
    }

    @Test
    @DisplayName("CONFIGURATION → VOTE_OUVERT : saut de phase interdit")
    void configToVoteOuvert_isInvalid() {
        assertFalse(stateMachine.canTransition(ElectionStatus.CONFIGURATION, ElectionStatus.VOTE_OUVERT));
    }

    @Test
    @DisplayName("VOTE_OUVERT → CONFIGURATION : retour en arrière interdit")
    void voteOuvertToConfiguration_isInvalid() {
        assertFalse(stateMachine.canTransition(ElectionStatus.VOTE_OUVERT, ElectionStatus.CONFIGURATION));
    }

    @Test
    @DisplayName("validateTransition doit lancer une exception pour une transition invalide")
    void validateTransition_invalidThrows() {
        Election election = new Election();
        election.setId(1L);
        election.setStatut(ElectionStatus.CONFIGURATION);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            stateMachine.validateTransition(election, ElectionStatus.VOTE_OUVERT);
        });
        assertTrue(ex.getMessage().contains("CONFIGURATION"));
        assertTrue(ex.getMessage().contains("VOTE_OUVERT"));
    }

    @ParameterizedTest
    @MethodSource("invalidTransitions")
    @DisplayName("Transitions inversées ou sautées doivent être invalides")
    void invalidTransitions_areAllRejected(ElectionStatus from, ElectionStatus to) {
        assertFalse(stateMachine.canTransition(from, to),
                from + " → " + to + " ne devrait pas être autorisé");
    }

    static Stream<Arguments> invalidTransitions() {
        return Stream.of(
                Arguments.of(ElectionStatus.CAMPAGNE, ElectionStatus.CONFIGURATION),
                Arguments.of(ElectionStatus.DEPOUILLEMENT, ElectionStatus.VOTE_OUVERT),
                Arguments.of(ElectionStatus.PUBLICATION, ElectionStatus.DEPOUILLEMENT),
                Arguments.of(ElectionStatus.CONFIGURATION, ElectionStatus.DEPOUILLEMENT),
                Arguments.of(ElectionStatus.CONFIGURATION, ElectionStatus.CLOTURE)
        );
    }
}
