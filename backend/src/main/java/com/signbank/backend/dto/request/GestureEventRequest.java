package com.signbank.backend.dto.request;


public class GestureEventRequest {

    private String gestureCode;
    private double confidence;

    public String getGestureCode() {
        return gestureCode;
    }

    public double getConfidence() {
        return confidence;
    }
}

