package com.signbank.backend.controller;

import com.signbank.backend.dto.request.RuleUpdateRequest;
import com.signbank.backend.dto.response.AlertRuleResponse;
import com.signbank.backend.dto.response.FraudAlertResponse;
import com.signbank.backend.dto.response.FraudAnalyticsResponse;
import com.signbank.backend.entity.AlertRule;
import com.signbank.backend.entity.FraudAlert;
import com.signbank.backend.repository.AlertRuleRepository;
import com.signbank.backend.repository.FraudAlertRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import java.util.Map;

@RestController
@RequestMapping("/api/fraud")
public class FraudController {

    private final FraudAlertRepository fraudAlertRepository;
    private final AlertRuleRepository alertRuleRepository;

    public FraudController(FraudAlertRepository fraudAlertRepository,
                            AlertRuleRepository alertRuleRepository) {
        this.fraudAlertRepository = fraudAlertRepository;
        this.alertRuleRepository = alertRuleRepository;
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<FraudAlertResponse>> getAlerts(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String status) {
        List<FraudAlert> alerts;
        if (severity != null && status != null) {
            alerts = fraudAlertRepository.findBySeverityAndStatusOrderByCreatedAtDesc(severity, status);
        } else if (status != null) {
            alerts = fraudAlertRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            alerts = fraudAlertRepository.findAllByOrderByCreatedAtDesc();
        }
        return ResponseEntity.ok(alerts.stream().map(this::toAlertResponse).collect(Collectors.toList()));
    }

    @GetMapping("/alerts/{id}")
    public ResponseEntity<FraudAlertResponse> getAlert(@PathVariable String id) {
        return fraudAlertRepository.findById(id)
                .map(a -> ResponseEntity.ok(toAlertResponse(a)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable String id) {
        fraudAlertRepository.findById(id).ifPresent(alert -> {
            alert.setStatus("ACKNOWLEDGED");
            fraudAlertRepository.save(alert);
        });
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/alerts")
    public ResponseEntity<Map<String, Object>> clearAllAlerts() {
        long count = fraudAlertRepository.count();
        fraudAlertRepository.deleteAll();
        Map<String, Object> res = new HashMap<>();
        res.put("deleted", count);
        res.put("message", "All " + count + " fraud alerts cleared successfully");
        return ResponseEntity.ok(res);
    }

    @PatchMapping("/alerts/{id}/resolve")
    public ResponseEntity<Void> resolveAlert(@PathVariable String id) {
        fraudAlertRepository.findById(id).ifPresent(alert -> {
            alert.setStatus("RESOLVED");
            alert.setResolvedAt(LocalDateTime.now());
            fraudAlertRepository.save(alert);
        });
        return ResponseEntity.ok().build();
    }

    @GetMapping("/rules")
    public ResponseEntity<List<AlertRuleResponse>> getRules() {
        List<AlertRule> rules = alertRuleRepository.findAll();
        return ResponseEntity.ok(rules.stream().map(this::toRuleResponse).collect(Collectors.toList()));
    }

    @PutMapping("/rules/{id}")
    public ResponseEntity<Void> updateRule(@PathVariable String id, @RequestBody RuleUpdateRequest req) {
        alertRuleRepository.findById(id).ifPresent(rule -> {
            if (req.getEnabled() != null) rule.setEnabled(req.getEnabled());
            if (req.getParams() != null) rule.setParams(req.getParams());
            alertRuleRepository.save(rule);
        });
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/rules/{id}/toggle")
    public ResponseEntity<Void> toggleRule(@PathVariable String id) {
        alertRuleRepository.findById(id).ifPresent(rule -> {
            rule.setEnabled(!rule.getEnabled());
            alertRuleRepository.save(rule);
        });
        return ResponseEntity.ok().build();
    }

    @GetMapping("/analytics")
    public ResponseEntity<FraudAnalyticsResponse> getAnalytics() {
        FraudAnalyticsResponse res = new FraudAnalyticsResponse();

        long total = fraudAlertRepository.count();
        long active = fraudAlertRepository.countByStatus("NEW") + fraudAlertRepository.countByStatus("ACKNOWLEDGED");
        long resolved = fraudAlertRepository.countByStatus("RESOLVED");

        res.setTotalAlerts(total);
        res.setActiveAlerts(active);
        res.setResolvedAlerts(resolved);

        Map<String, Long> bySeverity = new LinkedHashMap<>();
        bySeverity.put("CRITICAL", fraudAlertRepository.countBySeverity("CRITICAL"));
        bySeverity.put("HIGH", fraudAlertRepository.countBySeverity("HIGH"));
        bySeverity.put("MEDIUM", fraudAlertRepository.countBySeverity("MEDIUM"));
        bySeverity.put("LOW", fraudAlertRepository.countBySeverity("LOW"));
        res.setAlertsBySeverity(bySeverity);

        List<FraudAnalyticsResponse.AlertTrendPoint> trend = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 6; i >= 0; i--) {
            LocalDateTime start = now.minusHours(i + 1);
            LocalDateTime end = now.minusHours(i);
            long count = fraudAlertRepository.countByCreatedAtAfter(start)
                       - fraudAlertRepository.countByCreatedAtAfter(end);
            trend.add(new FraudAnalyticsResponse.AlertTrendPoint(start.toLocalDate().toString(), count));
        }
        res.setAlertTrend(trend);

        return ResponseEntity.ok(res);
    }

    private FraudAlertResponse toAlertResponse(FraudAlert a) {
        FraudAlertResponse r = new FraudAlertResponse();
        r.setAlertId(a.getAlertId());
        r.setRuleId(a.getRuleId());
        r.setSeverity(a.getSeverity());
        r.setStatus(a.getStatus());
        r.setUserId(a.getUserId());
        r.setMessage(a.getMessage());
        r.setDetails(a.getDetails());
        r.setCreatedAt(a.getCreatedAt());
        r.setResolvedAt(a.getResolvedAt());
        return r;
    }

    private AlertRuleResponse toRuleResponse(AlertRule r) {
        AlertRuleResponse res = new AlertRuleResponse();
        res.setRuleId(r.getRuleId());
        res.setName(r.getName());
        res.setCategory(r.getCategory());
        res.setDescription(r.getDescription());
        res.setEnabled(r.getEnabled());
        res.setSeverity(r.getSeverity());
        res.setParams(r.getParams());
        return res;
    }
}
