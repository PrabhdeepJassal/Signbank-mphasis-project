package com.signbank.backend.controller;

import com.signbank.backend.dto.response.CardReplacementResponse;
import com.signbank.backend.dto.response.CardResponse;
import com.signbank.backend.entity.User;
import com.signbank.backend.repository.UserRepository;
import com.signbank.backend.service.CardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/operator/cards")
public class CardController {

    private final CardService     cardService;
    private final UserRepository  userRepo;
    private final PasswordEncoder passwordEncoder;

    public CardController(
            CardService     cardService,
            UserRepository  userRepo,
            PasswordEncoder passwordEncoder
    ) {
        this.cardService     = cardService;
        this.userRepo        = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public ResponseEntity<List<CardResponse>> getCards(@RequestParam String username) {
        return ResponseEntity.ok(cardService.getCards(username));
    }

    @PostMapping("/toggle-block")
    public ResponseEntity<CardResponse> toggleBlock(
            @RequestParam String username,
            @RequestParam String cardType,
            @RequestParam(required = false) String credential
    ) {
        validateCredential(username, credential);
        return ResponseEntity.ok(cardService.toggleBlockStatus(username, cardType));
    }

    @PostMapping("/replace")
    public ResponseEntity<CardResponse> replaceCard(
            @RequestParam String username,
            @RequestParam String cardType,
            @RequestParam(required = false) String reason
    ) {
        return ResponseEntity.ok(cardService.requestReplacement(username, cardType, reason));
    }

    @GetMapping("/replacement-history")
    public ResponseEntity<List<CardReplacementResponse>> getReplacementHistory(
            @RequestParam String username,
            @RequestParam(required = false) String cardType
    ) {
        return ResponseEntity.ok(cardService.getReplacementHistory(username, cardType));
    }

    private void validateCredential(String username, String credential) {
        System.out.printf("[CardController] validateCredential called: username=%s credential=%s%n",
                username, credential);

        if (credential == null || credential.isBlank()) {
            System.out.println("[CardController] REJECTED: credential is null/blank");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Credential is required for block/unblock");
        }

        Optional<User> found = userRepo.findByUsername(username);
        if (found.isEmpty()) {
            System.out.println("[CardController] findByUsername missed, trying findById");
            found = userRepo.findById(username);
        }

        User user = found.orElseThrow(() -> {
            System.out.printf("[CardController] REJECTED: user not found for username=%s%n", username);
            return new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "User not found: " + username);
        });

        System.out.printf("[CardController] found user: userId=%s username=%s%n",
                user.getUserId(), user.getUsername());

        final String storedHash = user.getPasswordHash();

        System.out.printf("[CardController] storedHash: isNull=%b isBcrypt=%b%n",
                storedHash == null,
                storedHash != null && (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")));

        if (storedHash == null || storedHash.isBlank()) {
            System.out.println("[CardController] REJECTED: password_hash is NULL in DB - user never set password");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "No gesture password set for this user. Please log out and log in again to set one.");
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
            System.out.printf("[CardController] REJECTED: wrong credential for user=%s%n", username);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Wrong gesture password. Use the same gestures you used to log in.");
        }

        System.out.printf("[CardController] ACCEPTED: credential OK for user=%s%n", username);
    }
}
