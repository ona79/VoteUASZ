package sn.uasz.vote.controller;

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
public class ElectionController {

    private final ElectionService electionService;

    @GetMapping
    public ResponseEntity<List<ElectionDto>> getAllElections() {
        return ResponseEntity.ok(electionService.getAllElections());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ElectionDto> getElectionById(@PathVariable Long id) {
        return ResponseEntity.ok(electionService.getElectionById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ElectionDto> createElection(@RequestBody ElectionDto dto) {
        return ResponseEntity.ok(electionService.createElection(dto));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ElectionDto> changeStatus(@PathVariable Long id, @RequestParam ElectionStatus status) {
        return ResponseEntity.ok(electionService.changeStatus(id, status));
    }
}
