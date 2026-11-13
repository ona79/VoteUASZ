package sn.uasz.vote.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sn.uasz.vote.dto.ElectionDto;
import sn.uasz.vote.enums.ElectionStatus;
import sn.uasz.vote.service.ElectionService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/elections")
@RequiredArgsConstructor
@Tag(name = "Élections", description = "Configuration, cycle de vie et consultation des scrutins")
public class ElectionController {

    private final ElectionService electionService;

    @GetMapping
    @Operation(summary = "Lister toutes les élections")
    public ResponseEntity<List<ElectionDto>> getAllElections() {
        return ResponseEntity.ok(electionService.getAllElections());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une élection par son ID")
    public ResponseEntity<ElectionDto> getElectionById(@PathVariable Long id) {
        return ResponseEntity.ok(electionService.getElectionById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Créer une nouvelle élection en phase CONFIGURATION")
    public ResponseEntity<ElectionDto> createElection(@Valid @RequestBody ElectionDto dto) {
        return ResponseEntity.ok(electionService.createElection(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Modifier une élection (uniquement en phase CONFIGURATION)")
    public ResponseEntity<ElectionDto> updateElection(@PathVariable Long id, @Valid @RequestBody ElectionDto dto) {
        return ResponseEntity.ok(electionService.updateElection(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Supprimer une élection (uniquement en phase CONFIGURATION)")
    public ResponseEntity<Void> deleteElection(@PathVariable Long id) {
        electionService.deleteElection(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Faire évoluer le statut d'une élection selon la machine à états")
    public ResponseEntity<ElectionDto> changeStatus(@PathVariable Long id, @RequestParam ElectionStatus status) {
        return ResponseEntity.ok(electionService.changeStatus(id, status));
    }
}
