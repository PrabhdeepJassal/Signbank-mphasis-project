package com.signbank.backend.service;

import com.signbank.backend.repository.AlertRuleRepository;
import com.signbank.backend.repository.UserSessionRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class LoginAnomalyRule {

    private final AlertRuleRepository alertRuleRepository;
    private final UserSessionRepository userSessionRepository;
    private final AlertManager alertManager;

    public LoginAnomalyRule(AlertRuleRepository alertRuleRepository,
                             UserSessionRepository userSessionRepository,
                             AlertManager alertManager) {
        this.alertRuleRepository = alertRuleRepository;
        this.userSessionRepository = userSessionRepository;
        this.alertManager = alertManager;
    }

    public void checkNewDevice(String userId, String deviceFingerprint) {
        var rule = alertRuleRepository.findById("R03").orElse(null);
        if (rule == null || !rule.getEnabled() || deviceFingerprint == null) return;

        var known = userSessionRepository.findByUserIdAndDeviceFingerprint(userId, deviceFingerprint);
        if (known.isEmpty()) {
            alertManager.createAlert("R03", "MEDIUM", userId,
                "New device login for user " + userId,
                "{\"deviceFingerprint\":\"" + deviceFingerprint + "\"}");
        }
    }

    public void checkBruteForce(String userId) {
        var rule = alertRuleRepository.findById("R01").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(5);
        var recent = userSessionRepository.findByUserIdAndLoginAtAfter(userId, cutoff);
        long failed = recent.stream().filter(s -> "FAILED".equals(s.getStatus())).count();

        if (failed > 3) {
            alertManager.createAlert("R01", "HIGH", userId,
                "Brute force login detected for user " + userId,
                "{\"failedAttempts\":" + failed + ",\"windowMinutes\":5}");
        }
    }

    public void checkOffHours(String userId) {
        var rule = alertRuleRepository.findById("R02").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        int hour = LocalDateTime.now().getHour();
        if (hour >= 23 || hour < 5) {
            alertManager.createAlert("R02", "MEDIUM", userId,
                "Off-hours login for user " + userId,
                "{\"hour\":" + hour + "}");
        }
    }

    public void checkGestureSpam(String userId) {
        var rule = alertRuleRepository.findById("R04").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(2);
        var recent = userSessionRepository.findByUserIdAndLoginAtAfter(userId, cutoff);
        long failed = recent.stream().filter(s -> "FAILED_GESTURE".equals(s.getStatus())).count();

        if (failed > 5) {
            alertManager.createAlert("R04", "HIGH", userId,
                "Gesture spam detected for user " + userId,
                "{\"failedGestures\":" + failed + ",\"windowMinutes\":2}");
        }
    }
}
