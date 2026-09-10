package sn.uasz.vote.controller;

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
public class AdminUserController {

    private final UserImportService userImportService;
    private final UserRepository userRepository;

    @PostMapping("/import-csv")
    public ResponseEntity<UserImportResultDto> importUsers(@RequestParam("file") MultipartFile file) {
        UserImportResultDto result = userImportService.importUsersFromCsv(file);
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
}
