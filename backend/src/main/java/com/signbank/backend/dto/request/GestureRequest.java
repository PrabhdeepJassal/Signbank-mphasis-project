package com.signbank.backend.dto.request;

public class GestureRequest {

    private String gestureName;
    private String gestureSymbol;

    public String getGestureName() {
        return gestureName;
    }

    public void setGestureName(String gestureName) {
        this.gestureName = gestureName;
    }

    public String getGestureSymbol() {
        return gestureSymbol;
    }

    public void setGestureSymbol(String gestureSymbol) {
        this.gestureSymbol = gestureSymbol;
    }
}