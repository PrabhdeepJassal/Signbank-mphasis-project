package com.signbank.backend.dto.response;

public class LandmarkResponse {

    private String direction;  // "LEFT" | "RIGHT" | "NEUTRAL"
    private double speed;      // 0.0 – 1.0
    private double limit;      // ₹500 – ₹1,00,000
    private double indexTipX;  // normalised 0-1 for UI tracker

    public LandmarkResponse(String direction, double speed, double limit, double indexTipX) {
        this.direction = direction;
        this.speed     = speed;
        this.limit     = limit;
        this.indexTipX = indexTipX;
    }

    public String getDirection() { return direction; }
    public double getSpeed()     { return speed; }
    public double getLimit()     { return limit; }
    public double getIndexTipX() { return indexTipX; }
}