package com.signbank.backend.controller;

import com.signbank.backend.entity.User;
import com.signbank.backend.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
public class TestController {

    private final UserRepository userRepo;

    public TestController(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @GetMapping("/test")
    public String test() {
        return "App is working";
    }

    /**
     * DEBUG ONLY — remove before production.
     * GET /api/debug/user-auth?username=1111
     * Shows password_hash status for a user so you can confirm
     * whether set-password actually wrote to the DB.
     */
    @GetMapping("/api/debug/user-auth")
    public Map<String, Object> debugUserAuth(@RequestParam String username) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("queried_username", username);

        Optional<User> byUsername = userRepo.findByUsername(username);
        Optional<User> byId       = userRepo.findById(username);

        result.put("foundByUsername", byUsername.isPresent());
        result.put("foundByUserId",   byId.isPresent());

        User user = byUsername.orElse(byId.orElse(null));
        if (user == null) {
            result.put("error", "User not found by username OR userId = " + username);
            return result;
        }

        result.put("userId",       user.getUserId());
        result.put("usernameInDb", user.getUsername());
        result.put("roleId",       user.getRole() != null ? user.getRole().getRoleId() : null);

        String hash = user.getPasswordHash();
        result.put("passwordHashIsNull",   hash == null);
        result.put("passwordHashIsBcrypt",
                hash != null && (hash.startsWith("$2a$") || hash.startsWith("$2b$")));
        result.put("passwordHashPrefix",
                hash != null && hash.length() > 10 ? hash.substring(0, 10) + "..." : hash);

        if (hash == null) {
            result.put("diagnosis", "NULL - set-password was never saved to DB. User needs to go through first-login flow again.");
        } else if (hash.startsWith("$2a$") || hash.startsWith("$2b$")) {
            result.put("diagnosis", "BCrypt hash present - validateCredential should work. Problem is in frontend error handling.");
        } else {
            result.put("diagnosis", "Plain-text stored (legacy).");
        }

        return result;
    }
}
