package com.signbank.backend.controller;

import com.signbank.backend.dto.response.AuthResponse;
import com.signbank.backend.dto.request.RegisterRequest;
import com.signbank.backend.entity.User;
import com.signbank.backend.repository.UserRepository;
import com.signbank.backend.security.JwtUtil;
import com.signbank.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Authentication flow:
 *
 * 1. POST /api/auth/login?userId=1111
 *    → "FIRST_LOGIN"       if password_hash IS NULL  (no password set yet)
 *    → "PASSWORD_REQUIRED" if password_hash IS SET   (show password screen)
 *
 * 2. POST /api/auth/login?userId=1111&password=G001-G002-G003
 *    → BCrypt-verifies password, returns JWT on success, 401 on failure
 *    → FIX: if password_hash is null and a password was supplied, return 401
 *      (previously returned "FIRST_LOGIN" 200 which confused callers)
 *
 * 3. POST /api/auth/set-password?userId=1111&newPassword=G001-G002-G003
 *    → BCrypt-hashes and persists the gesture sequence
 *    → Returns JWT so the user is auto-logged-in
 *
 * 4. POST /api/auth/verify-credential?userId=1111&credential=G001-G002-G003
 *    → Validates without issuing a new token (used by card block/unblock)
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository  userRepo;
    private final JwtUtil         jwtUtil;
    private final AuthService     authService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            UserRepository  userRepo,
            JwtUtil         jwtUtil,
            AuthService     authService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepo        = userRepo;
        this.jwtUtil         = jwtUtil;
        this.authService     = authService;
        this.passwordEncoder = passwordEncoder;
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
            final String storedHash = user.getPasswordHash();

            // ── FIX: password supplied but no hash stored → 401, not 200 ──
            // Previously returned "FIRST_LOGIN" (HTTP 200) when a password was
            // sent but password_hash was null. That made the frontend think the
            // login succeeded (200 = success in Axios). Now returns 401 so
            // GestureLogin shows "Wrong gesture password — try again".
            if (storedHash == null || storedHash.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "No password set for this user — please set a password first");
            }

            boolean valid;
            if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
                valid = passwordEncoder.matches(password, storedHash);
            } else {
                // Plain-text seed — compare directly and upgrade to BCrypt
                valid = storedHash.equals(password);
                if (valid) {
                    user.setPasswordHash(passwordEncoder.encode(password));
                    userRepo.save(user);
                }
            }

            if (!valid) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong password");
            }

            String token = jwtUtil.generateToken(user.getUserId(), roleName);
            return ResponseEntity.ok(token);
        }

        // Probe-only call (no password supplied)
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

        user.setPasswordHash(passwordEncoder.encode(newPassword));
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

        final String storedHash = user.getPasswordHash();

        if (storedHash == null || storedHash.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "No credential set for this user");
        }

        boolean valid;
        if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
            valid = passwordEncoder.matches(credential, storedHash);
        } else {
            valid = storedHash.equals(credential);
            if (valid) {
                user.setPasswordHash(passwordEncoder.encode(credential));
                userRepo.save(user);
            }
        }

        if (!valid) {
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
