package com.signbank.backend.controller;

import com.signbank.backend.dto.response.AuthResponse;
import com.signbank.backend.dto.request.RegisterRequest;
import com.signbank.backend.entity.User;
import com.signbank.backend.repository.UserRepository;
import com.signbank.backend.security.JwtUtil;
import com.signbank.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Map;
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository  userRepo;
    private final JwtUtil         jwtUtil;
    private final AuthService     authService;

    public AuthController(
            UserRepository  userRepo,
            JwtUtil         jwtUtil,
            AuthService     authService
    ) {
        this.userRepo        = userRepo;
        this.jwtUtil         = jwtUtil;
        this.authService     = authService;
    }

    // ── POST /api/auth/login ─────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<String> login(
            @RequestParam(name = "userId",   required = true)  String userId,
            @RequestParam(name = "password", required = false) String password
    ) {
        User user = userRepo.findById(userId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        final String roleName = user.getRole() != null
                ? user.getRole().getRoleName().toUpperCase()
                : "OPERATOR";

        if (password != null && !password.isBlank()) {
            final String stored = user.getPasswordHash();

            if (stored == null || stored.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "No password set for this user — please set a password first");
            }

            if (!stored.equals(password)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong password");
            }

            String token = jwtUtil.generateToken(user.getUserId(), roleName);
            return ResponseEntity.ok(token);
        }

        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            return ResponseEntity.ok("FIRST_LOGIN");
        } else {
            return ResponseEntity.ok("PASSWORD_REQUIRED");
        }
    }

    // ── POST /api/auth/set-password ──────────────────────────────────────────
    @PostMapping("/set-password")
    public ResponseEntity<String> setPassword(
            @RequestParam(name = "userId")      String userId,
            @RequestParam(name = "newPassword") String newPassword
    ) {
        User user = userRepo.findById(userId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (newPassword == null || newPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "newPassword must not be blank");
        }

        user.setPasswordHash(newPassword);
        userRepo.save(user);

        final String roleName = user.getRole() != null
                ? user.getRole().getRoleName().toUpperCase()
                : "OPERATOR";

        String token = jwtUtil.generateToken(user.getUserId(), roleName);
        return ResponseEntity.ok(token);
    }

    // ── POST /api/auth/verify-credential ────────────────────────────────────
    @PostMapping("/verify-credential")
    public ResponseEntity<Map<String, Object>> verifyCredential(
            @RequestParam(name = "userId")     String userId,
            @RequestParam(name = "credential") String credential
    ) {
        User user = userRepo.findById(userId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (credential == null || credential.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "credential must not be blank");
        }

        final String stored = user.getPasswordHash();

        if (stored == null || stored.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "No credential set for this user");
        }

        if (!stored.equals(credential)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credential");
        }

        return ResponseEntity.ok(Map.of("valid", true));
    }

    // ── POST /api/auth/register ──────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(authService.register(request));
    }
}
