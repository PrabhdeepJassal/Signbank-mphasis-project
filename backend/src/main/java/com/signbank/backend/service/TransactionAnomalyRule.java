package com.signbank.backend.service;

import com.signbank.backend.entity.Card;
import com.signbank.backend.entity.User;
import com.signbank.backend.repository.*;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TransactionAnomalyRule {

    private final AlertRuleRepository alertRuleRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CardRepository cardRepository;
    private final AlertManager alertManager;

    public TransactionAnomalyRule(AlertRuleRepository alertRuleRepository,
                                   TransactionRepository transactionRepository,
                                   UserRepository userRepository,
                                   CardRepository cardRepository,
                                   AlertManager alertManager) {
        this.alertRuleRepository = alertRuleRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.cardRepository = cardRepository;
        this.alertManager = alertManager;
    }

    public void evaluate(String userId, double amount, String type) {
        checkHighValue(userId, amount);
        checkFirstTransaction(userId);
        checkOverLimit(userId, amount);
    }

    private void checkHighValue(String userId, double amount) {
        var rule = alertRuleRepository.findById("R05").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        var all = transactionRepository.findByUser_UserIdOrderByTimestampDesc(userId);

        if (all.size() <= 1 && amount >= 25000) {
            alertManager.createAlert("R05", "HIGH", userId,
                "Large first transaction of " + formatRupee(amount) + " for user " + userId,
                "{\"amount\":" + amount + ",\"note\":\"first transaction, no history\"}");
            return;
        }

        double previousAvg = all.size() > 1
            ? all.stream().skip(1).mapToDouble(t -> t.getAmount()).average().orElse(0)
            : 0;
        if (previousAvg > 0 && amount > previousAvg * 2) {
            alertManager.createAlert("R05", "HIGH", userId,
                "High-value transaction of " + formatRupee(amount) + " for user " + userId + " (avg: " + formatRupee(previousAvg) + ")",
                "{\"amount\":" + amount + ",\"average\":" + previousAvg + ",\"multiplier\":" + (amount / previousAvg) + "}");
        }
    }

    private void checkFirstTransaction(String userId) {
        var rule = alertRuleRepository.findById("R07").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        long count = transactionRepository.countByUser_UserId(userId);
        if (count <= 1) {
            alertManager.createAlert("R07", "LOW", userId,
                "First transaction for user " + userId,
                "{}");
        }
    }

    private void checkOverLimit(String userId, double amount) {
        var rule = alertRuleRepository.findById("R08").orElse(null);
        if (rule == null || !rule.getEnabled()) return;

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        Double userLimit = user.getTransactionLimit();
        if (userLimit != null && amount > userLimit) {
            alertManager.createAlert("R08", "CRITICAL", userId,
                "Transaction exceeds user limit of " + formatRupee(userLimit) + " for user " + userId,
                "{\"amount\":" + amount + ",\"limit\":" + userLimit + "}");
            return;
        }

        List<Card> cards = cardRepository.findByUser_UserId(userId);
        for (Card card : cards) {
            Double cardLimit = card.getTransactionLimit();
            if (cardLimit != null && amount > cardLimit) {
                alertManager.createAlert("R08", "CRITICAL", userId,
                    "Transaction exceeds " + card.getCardType() + " card limit",
                    "{\"amount\":" + amount + ",\"limit\":" + cardLimit + ",\"cardType\":\"" + card.getCardType() + "\"}");
            }
        }
    }

    private String formatRupee(double amount) {
        return "\u20B9" + String.format("%,.0f", amount);
    }
}
