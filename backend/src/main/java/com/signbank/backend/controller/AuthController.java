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

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository  userRepo;
    private final JwtUtil         jwtUtil;
    private final AuthService     authService;
    private final Map<String, ChallengeData> challenges = new ConcurrentHashMap<>();
    private static final long CHALLENGE_TTL_MS = 300_000;

    private static final String[] ALL_GESTURES = {
        "G001","G002","G003","G004","G005"
    };

    public AuthController(
            UserRepository  userRepo,
            JwtUtil         jwtUtil,
            AuthService     authService
    ) {
        this.userRepo        = userRepo;
        this.jwtUtil         = jwtUtil;
        this.authService     = authService;
    }

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

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/challenge")
    public ResponseEntity<Map<String, Object>> generateChallenge(
            @RequestParam String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String stored = user.getPasswordHash();
        if (stored == null || stored.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No password set");
        }

        String challengeId = UUID.randomUUID().toString();

        List<String> shuffled = new ArrayList<>(Arrays.asList(ALL_GESTURES));
        Collections.shuffle(shuffled);

        Map<String, Object> mapping = new LinkedHashMap<>();
        for (int digit = 1; digit <= 5; digit++) {
            mapping.put(String.valueOf(digit), shuffled.get(digit - 1));
        }

        challenges.put(challengeId, new ChallengeData(userId, mapping, System.currentTimeMillis()));

        List<Map<String, Object>> mappingList = new ArrayList<>();
        for (int digit = 1; digit <= 5; digit++) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("digit", digit);
            entry.put("gestureId", mapping.get(String.valueOf(digit)));
            mappingList.add(entry);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("challengeId", challengeId);
        response.put("mapping", mappingList);
        response.put("passwordLength", stored.split("-").length);
        response.put("expiresIn", CHALLENGE_TTL_MS);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-challenge")
    public ResponseEntity<Map<String, Object>> verifyChallenge(
            @RequestParam String challengeId,
            @RequestParam String userId,
            @RequestBody Map<String, Object> body) {

        @SuppressWarnings("unchecked")
        List<String> gestureSequence = (List<String>) body.get("gestureSequence");

        if (gestureSequence == null || gestureSequence.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "gestureSequence required");
        }

        ChallengeData challenge = challenges.get(challengeId);
        if (challenge == null) {
            throw new ResponseStatusException(HttpStatus.GONE, "Challenge expired or invalid");
        }

        if (System.currentTimeMillis() - challenge.createdAt > CHALLENGE_TTL_MS) {
            challenges.remove(challengeId);
            throw new ResponseStatusException(HttpStatus.GONE, "Challenge expired");
        }

        if (!challenge.userId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User mismatch");
        }

        Map<String, String> gestureToDigit = new HashMap<>();
        for (Map.Entry<String, Object> e : challenge.mapping.entrySet()) {
            gestureToDigit.put((String) e.getValue(), e.getKey());
        }

        StringBuilder enteredDigits = new StringBuilder();
        for (String g : gestureSequence) {
            String digit = gestureToDigit.get(g);
            if (digit == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown gesture: " + g);
            }
            enteredDigits.append(digit);
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String storedPassword = user.getPasswordHash();
        if (storedPassword == null || storedPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No password set");
        }

        String storedDigits = passwordToDigits(storedPassword);

        challenges.remove(challengeId);

        if (!storedDigits.equals(enteredDigits.toString())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong gesture password");
        }

        final String roleName = user.getRole() != null
                ? user.getRole().getRoleName().toUpperCase()
                : "OPERATOR";

        String token = jwtUtil.generateToken(user.getUserId(), roleName);
        return ResponseEntity.ok(Map.of("token", token, "status", "success"));
    }

    private String passwordToDigits(String passwordHash) {
        StringBuilder digits = new StringBuilder();
        for (String part : passwordHash.split("-")) {
            String num = part.replaceAll("\\D", "");
            if (!num.isEmpty()) {
                digits.append(Integer.parseInt(num));
            }
        }
        return digits.toString();
    }

    private record ChallengeData(String userId, Map<String, Object> mapping, long createdAt) {}
}
