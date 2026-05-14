package com.signbank.backend.dto.response;

public class AnalyticsResponseDTO {

    private long totalOperations;
    private long activeUsers;
    private double successRate;

    public AnalyticsResponseDTO(long totalOperations, long activeUsers, double successRate) {
        this.totalOperations = totalOperations;
        this.activeUsers = activeUsers;
        this.successRate = successRate;
    }

    public long getTotalOperations() {
        return totalOperations;
    }

    public void setTotalOperations(long totalOperations) {
        this.totalOperations = totalOperations;
    }

    public long getActiveUsers() {
        return activeUsers;
    }

    public void setActiveUsers(long activeUsers) {
        this.activeUsers = activeUsers;
    }

    public double getSuccessRate() {
        return successRate;
    }

    public void setSuccessRate(double successRate) {
        this.successRate = successRate;
    }
}