package sn.uasz.vote.service;

import org.springframework.stereotype.Service;
import sn.uasz.vote.entity.Election;
import sn.uasz.vote.enums.ElectionStatus;

@Service
public class ElectionStateMachine {

    public boolean canTransition(ElectionStatus current, ElectionStatus next) {
        if (current == null || next == null) return false;
        if (current == next) return true;

        return switch (current) {
            case CONFIGURATION -> next == ElectionStatus.CAMPAGNE;
            case CAMPAGNE -> next == ElectionStatus.VOTE_OUVERT;
            case VOTE_OUVERT -> next == ElectionStatus.DEPOUILLEMENT;
            case DEPOUILLEMENT -> next == ElectionStatus.PUBLICATION;
            case PUBLICATION -> next == ElectionStatus.CLOTURE;
            case CLOTURE -> false; // État terminal
        };
    }

    public void validateTransition(Election election, ElectionStatus nextStatus) {
        if (!canTransition(election.getStatut(), nextStatus)) {
            throw new IllegalStateException(
                    String.format("Transition d'état non autorisée: %s -> %s pour l'élection ID %d",
                            election.getStatut(), nextStatus, election.getId())
            );
        }
    }
}
