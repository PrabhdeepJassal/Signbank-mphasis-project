package com.signbank.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

public class SetLimitRequest {

    @NotBlank(message = "userId is required")
    private String userId;

    @DecimalMin(value = "500.0",    message = "Limit must be at least ₹500")
    @DecimalMax(value = "100000.0", message = "Limit must not exceed ₹1,00,000")
    private Double limit;

    public String getUserId() { return userId; }
    public void   setUserId(String userId) { this.userId = userId; }
    public Double getLimit()  { return limit; }
    public void   setLimit(Double limit) { this.limit = limit; }
}