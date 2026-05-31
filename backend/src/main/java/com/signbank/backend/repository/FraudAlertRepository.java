package com.signbank.backend.repository;

import com.signbank.backend.entity.FraudAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface FraudAlertRepository extends JpaRepository<FraudAlert, String> {
    List<FraudAlert> findByStatusOrderByCreatedAtDesc(String status);
    List<FraudAlert> findByUserIdOrderByCreatedAtDesc(String userId);
    List<FraudAlert> findByRuleIdAndUserIdAndCreatedAtAfter(String ruleId, String userId, LocalDateTime after);
    List<FraudAlert> findAllByOrderByCreatedAtDesc();
    long countByStatus(String status);
    long countBySeverity(String severity);
    long countByCreatedAtAfter(LocalDateTime after);
    List<FraudAlert> findBySeverityAndStatusOrderByCreatedAtDesc(String severity, String status);
}
