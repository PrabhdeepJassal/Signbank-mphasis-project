package com.signbank.backend.service;

import com.signbank.backend.entity.FraudAlert;
import com.signbank.backend.repository.FraudAlertRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class AlertManager {

    private static final long DUPLICATE_WINDOW_MINUTES = 15;

    private final FraudAlertRepository fraudAlertRepository;

    public AlertManager(FraudAlertRepository fraudAlertRepository) {
        this.fraudAlertRepository = fraudAlertRepository;
    }

    public FraudAlert createAlert(String ruleId, String severity, String userId, String message, String details) {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(DUPLICATE_WINDOW_MINUTES);
        var existing = fraudAlertRepository.findByRuleIdAndUserIdAndCreatedAtAfter(ruleId, userId, cutoff);
        if (!existing.isEmpty()) {
            return null;
        }

        FraudAlert alert = new FraudAlert();
        alert.setAlertId("FA-" + System.currentTimeMillis());
        alert.setRuleId(ruleId);
        alert.setSeverity(severity);
        alert.setStatus("NEW");
        alert.setUserId(userId);
        alert.setMessage(message);
        alert.setDetails(details);
        alert.setCreatedAt(LocalDateTime.now());

        return fraudAlertRepository.save(alert);
    }
}
