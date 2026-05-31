package com.signbank.backend.controller;

import com.signbank.backend.dto.response.AuthResponse;
import com.signbank.backend.dto.request.RegisterRequest;
import com.signbank.backend.entity.User;
import com.signbank.backend.repository.UserRepository;
import com.signbank.backend.security.JwtUtil;
import com.signbank.backend.service.AuthService;
import com.signbank.backend.service.FraudDetectionEngine;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository  userRepo;
    private final JwtUtil         jwtUtil;
    private final AuthService     authService;
    private final FraudDetectionEngine fraudEngine;
    private final Map<String, ChallengeData> challenges = new ConcurrentHashMap<>();
    private static final long CHALLENGE_TTL_MS = 300_000;

    private static final String[] FINGER_EMOJIS = {
        "☝️","✌️","🤌","🤘","🖐️","🖐️☝️","🖐️✌️","🖐️🤌","🖐️🤘","🖐️🖐️"
    };

    public AuthController(
            UserRepository  userRepo,
            JwtUtil         jwtUtil,
            AuthService     authService,
            FraudDetectionEngine fraudEngine
    ) {
        this.userRepo        = userRepo;
        this.jwtUtil         = jwtUtil;
        this.authService     = authService;
        this.fraudEngine     = fraudEngine;
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(
            @RequestParam(name = "userId",   required = true)  String userId,
            @RequestParam(name = "password", required = false) String password,
            HttpServletRequest request
    ) {
        String fingerprint = getDeviceFingerprint(request);

        User user = userRepo.findById(userId)
                .orElseThrow(() -> {
                    fraudEngine.evaluateLogin(userId, fingerprint,
                        request.getRemoteAddr(), request.getHeader("User-Agent"), false);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
                });

        final String roleName = user.getRole() != null
                ? user.getRole().getRoleName().toUpperCase()
                : "OPERATOR";

        if (password != null && !password.isBlank()) {
            final String stored = user.getPasswordHash();

            if (stored == null || stored.isBlank()) {
                fraudEngine.evaluateLogin(userId, fingerprint,
                    request.getRemoteAddr(), request.getHeader("User-Agent"), false);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "No password set for this user — please set a password first");
            }

            if (!stored.equals(password)) {
                fraudEngine.evaluateLogin(userId, fingerprint,
                    request.getRemoteAddr(), request.getHeader("User-Agent"), false);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong password");
            }

            fraudEngine.evaluateLogin(userId, fingerprint,
                request.getRemoteAddr(), request.getHeader("User-Agent"), true);
            String token = jwtUtil.generateToken(user.getUserId(), roleName);
            return ResponseEntity.ok(token);
        }

        fraudEngine.evaluateLogin(userId, fingerprint,
            request.getRemoteAddr(), request.getHeader("User-Agent"), true);
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
            @RequestParam(name = "credential") String credential,
            HttpServletRequest request
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
            fraudEngine.evaluateFailedGesture(userId, getDeviceFingerprint(request),
                request.getRemoteAddr(), request.getHeader("User-Agent"));
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

        List<Integer> shuffled = new ArrayList<>();
        for (int i = 1; i <= 10; i++) shuffled.add(i);
        Collections.shuffle(shuffled);

        Map<String, Object> mapping = new LinkedHashMap<>();
        List<Map<String, Object>> mappingList = new ArrayList<>();
        for (int digit = 1; digit <= 10; digit++) {
            int show = shuffled.get(digit - 1);
            mapping.put(String.valueOf(digit), show);
            Map<String, Object> entry = new HashMap<>();
            entry.put("digit", digit);
            entry.put("show", show);
            entry.put("emoji", FINGER_EMOJIS[show - 1]);
            mappingList.add(entry);
        }

        challenges.put(challengeId, new ChallengeData(userId, mapping, System.currentTimeMillis()));

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
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {

        String fingerprint = getDeviceFingerprint(request);

        @SuppressWarnings("unchecked")
        List<Integer> fingerSequence = (List<Integer>) body.get("fingerSequence");

        if (fingerSequence == null || fingerSequence.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fingerSequence required");
        }

        ChallengeData challenge = challenges.get(challengeId);
        if (challenge == null) {
            fraudEngine.evaluateFailedGesture(userId, fingerprint,
                request.getRemoteAddr(), request.getHeader("User-Agent"));
            throw new ResponseStatusException(HttpStatus.GONE, "Challenge expired or invalid");
        }

        if (System.currentTimeMillis() - challenge.createdAt > CHALLENGE_TTL_MS) {
            challenges.remove(challengeId);
            fraudEngine.evaluateFailedGesture(userId, fingerprint,
                request.getRemoteAddr(), request.getHeader("User-Agent"));
            throw new ResponseStatusException(HttpStatus.GONE, "Challenge expired");
        }

        if (!challenge.userId.equals(userId)) {
            fraudEngine.evaluateFailedGesture(userId, fingerprint,
                request.getRemoteAddr(), request.getHeader("User-Agent"));
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User mismatch");
        }

        Map<Integer, Integer> showToDigit = new HashMap<>();
        for (Map.Entry<String, Object> e : challenge.mapping.entrySet()) {
            showToDigit.put((Integer) e.getValue(), Integer.parseInt(e.getKey()));
        }

        StringBuilder enteredDigits = new StringBuilder();
        for (int shownFingers : fingerSequence) {
            Integer digit = showToDigit.get(shownFingers);
            if (digit == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid finger count: " + shownFingers);
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

        if (!storedDigits.equals(enteredDigits.toString())) {
            fraudEngine.evaluateFailedGesture(userId, fingerprint,
                request.getRemoteAddr(), request.getHeader("User-Agent"));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong gesture password");
        }

        challenges.remove(challengeId);

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

    private String getDeviceFingerprint(HttpServletRequest request) {
        try {
            String ip = request.getRemoteAddr();
            String ua = request.getHeader("User-Agent");
            if (ua == null) ua = "";
            String raw = ip + "|" + ua;
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            return request.getRemoteAddr();
        }
    }

    private record ChallengeData(String userId, Map<String, Object> mapping, long createdAt) {}
}
