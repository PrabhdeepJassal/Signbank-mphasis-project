package com.signbank.backend.dto.response;

/**
 * Response from the backend rotation analysis endpoint.
 * angleDeg  — wrist roll angle computed by OpenCV (-180 to +180)
 * limit     — mapped transaction limit (₹500 – ₹1,00,000)
 * direction — "CW", "CCW", or "NEUTRAL"
 */
public class RotationResponse {

    private double angleDeg;
    private double limit;
    private String direction;

    public RotationResponse(double angleDeg, double limit, String direction) {
        this.angleDeg  = angleDeg;
        this.limit     = limit;
        this.direction = direction;
    }

    public double getAngleDeg()  { return angleDeg; }
    public double getLimit()     { return limit; }
    public String getDirection() { return direction; }
}