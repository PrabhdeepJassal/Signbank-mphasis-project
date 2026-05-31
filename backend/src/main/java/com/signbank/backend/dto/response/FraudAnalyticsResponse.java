package com.signbank.backend.dto.response;

import java.util.List;
import java.util.Map;

public class FraudAnalyticsResponse {
    private long totalAlerts;
    private long activeAlerts;
    private long resolvedAlerts;
    private Map<String, Long> alertsBySeverity;
    private List<AlertTrendPoint> alertTrend;

    public FraudAnalyticsResponse() {}

    public long getTotalAlerts() { return totalAlerts; }
    public void setTotalAlerts(long totalAlerts) { this.totalAlerts = totalAlerts; }
    public long getActiveAlerts() { return activeAlerts; }
    public void setActiveAlerts(long activeAlerts) { this.activeAlerts = activeAlerts; }
    public long getResolvedAlerts() { return resolvedAlerts; }
    public void setResolvedAlerts(long resolvedAlerts) { this.resolvedAlerts = resolvedAlerts; }
    public Map<String, Long> getAlertsBySeverity() { return alertsBySeverity; }
    public void setAlertsBySeverity(Map<String, Long> alertsBySeverity) { this.alertsBySeverity = alertsBySeverity; }
    public List<AlertTrendPoint> getAlertTrend() { return alertTrend; }
    public void setAlertTrend(List<AlertTrendPoint> alertTrend) { this.alertTrend = alertTrend; }

    public static class AlertTrendPoint {
        private String date;
        private long count;

        public AlertTrendPoint() {}
        public AlertTrendPoint(String date, long count) { this.date = date; this.count = count; }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
}
