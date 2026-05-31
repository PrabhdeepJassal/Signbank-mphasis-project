package com.signbank.backend.service;

import com.signbank.backend.repository.AlertRuleRepository;
import com.signbank.backend.repository.TransactionRepository;
import com.signbank.backend.repository.UserSessionRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class VelocityRule {

    private final AlertRuleRepository alertRuleRepository;
    private final TransactionRepository transactionRepository;
    private final UserSessionRepository userSessionRepository;
    private final AlertManager alertManager;

    public VelocityRule(AlertRuleRepository alertRuleRepository,
                        TransactionRepository transactionRepository,
                        UserSessionRepository userSessionRepository,
                        AlertManager alertManager) {
        this.alertRuleRepository = alertRuleRepository;
        this.transactionRepository = transactionRepository;
        this.userSessionRepository = userSessionRepository;
        this.alertManager = alertManager;
    }

    public void evaluateTransaction(String userId) {
        checkTooFast(userId);
        checkMultipleIPs(userId);
    }

    public void evaluateGesture(String userId) {
        checkGestureVelocity(userId);
    }

    private void checkTooFast(String userId) {
        var rule = alertRuleRepository.findById("R09").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(1);
        var recent = transactionRepository.findByUser_UserIdAndTimestampAfter(userId, cutoff);
        if (recent.size() > 3) {
            alertManager.createAlert("R09", "HIGH", userId,
                "High transaction velocity for user " + userId,
                "{\"transactions\":" + recent.size() + ",\"windowMinutes\":1}");
        }
    }

    private void checkMultipleIPs(String userId) {
        var rule = alertRuleRepository.findById("R10").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(1);
        var recent = userSessionRepository.findByUserIdAndLoginAtAfter(userId, cutoff);
        long distinctIPs = recent.stream().map(s -> s.getIpAddress()).filter(ip -> ip != null).distinct().count();
        if (distinctIPs >= 2) {
            alertManager.createAlert("R10", "CRITICAL", userId,
                "User " + userId + " active from " + distinctIPs + " IPs simultaneously",
                "{\"distinctIPs\":" + distinctIPs + ",\"windowMinutes\":1}");
        }
    }

    private void checkGestureVelocity(String userId) {
        var rule = alertRuleRepository.findById("R11").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(1);
        var recent = userSessionRepository.findByUserIdAndLoginAtAfter(userId, cutoff);
        long gestureAttempts = recent.stream().filter(s -> "GESTURE".equals(s.getStatus())).count();
        if (gestureAttempts > 10) {
            alertManager.createAlert("R11", "MEDIUM", userId,
                "Gesture spam detected for user " + userId,
                "{\"gestures\":" + gestureAttempts + ",\"windowMinutes\":1}");
        }
    }
}
