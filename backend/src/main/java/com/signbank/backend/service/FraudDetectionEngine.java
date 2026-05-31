package com.signbank.backend.service;

import com.signbank.backend.entity.UserSession;
import com.signbank.backend.repository.UserSessionRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class FraudDetectionEngine {

    private final UserSessionRepository userSessionRepository;
    private final LoginAnomalyRule loginRule;
    private final TransactionAnomalyRule transactionRule;
    private final VelocityRule velocityRule;

    public FraudDetectionEngine(UserSessionRepository userSessionRepository,
                                 LoginAnomalyRule loginRule,
                                 TransactionAnomalyRule transactionRule,
                                 VelocityRule velocityRule) {
        this.userSessionRepository = userSessionRepository;
        this.loginRule = loginRule;
        this.transactionRule = transactionRule;
        this.velocityRule = velocityRule;
    }

    public void evaluateLogin(String userId, String deviceFingerprint, String ipAddress, String userAgent, boolean success) {
        try {
            loginRule.checkNewDevice(userId, deviceFingerprint);
            saveSession(userId, deviceFingerprint, ipAddress, userAgent, success ? "SUCCESS" : "FAILED");
            loginRule.checkBruteForce(userId);
            loginRule.checkOffHours(userId);
            loginRule.checkGestureSpam(userId);
        } catch (Exception e) {
            System.err.println("[FraudEngine] Login evaluation error: " + e.getMessage());
        }
    }

    public void evaluateFailedGesture(String userId, String deviceFingerprint, String ipAddress, String userAgent) {
        try {
            saveSession(userId, deviceFingerprint, ipAddress, userAgent, "FAILED_GESTURE");
            loginRule.checkGestureSpam(userId);
        } catch (Exception e) {
            System.err.println("[FraudEngine] Gesture evaluation error: " + e.getMessage());
        }
    }

    public void evaluateTransaction(String userId, double amount, String type) {
        try {
            transactionRule.evaluate(userId, amount, type);
            velocityRule.evaluateTransaction(userId);
        } catch (Exception e) {
            System.err.println("[FraudEngine] Transaction evaluation error: " + e.getMessage());
        }
    }

    public void saveSession(String userId, String deviceFingerprint, String ipAddress, String userAgent, String status) {
        UserSession session = new UserSession();
        session.setSessionId("SESS-" + System.currentTimeMillis());
        session.setUserId(userId);
        session.setDeviceFingerprint(deviceFingerprint);
        session.setIpAddress(ipAddress);
        session.setUserAgent(userAgent);
        session.setStatus(status);
        session.setLoginAt(LocalDateTime.now());
        userSessionRepository.save(session);
    }
}
