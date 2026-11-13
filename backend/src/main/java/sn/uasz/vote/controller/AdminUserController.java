package sn.uasz.vote.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import sn.uasz.vote.dto.UserImportResultDto;
import sn.uasz.vote.entity.User;
import sn.uasz.vote.repository.UserRepository;
import sn.uasz.vote.service.UserImportService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Administration Utilisateurs", description = "Import CSV et gestion des comptes (SUPER_ADMIN)")
public class AdminUserController {

    private final UserImportService userImportService;
    private final UserRepository userRepository;

    @PostMapping("/import-csv")
    @Operation(summary = "Importer en masse les électeurs/candidats depuis un fichier CSV")
    public ResponseEntity<UserImportResultDto> importUsers(@RequestParam("file") MultipartFile file) {
        UserImportResultDto result = userImportService.importUsersFromCsv(file);
        return ResponseEntity.ok(result);
    }

    @GetMapping
    @Operation(summary = "Lister tous les utilisateurs")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
}
