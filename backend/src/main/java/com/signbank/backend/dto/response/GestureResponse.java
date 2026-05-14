package com.signbank.backend.dto.response;

public class GestureResponse {


    private String gestureId;
    private String gestureName;
    private String gestureSymbol;


    public String getGestureId() {
        return gestureId;
    }

    public void setGestureId(String gestureId) {
        this.gestureId = gestureId;
    }

    public String getGestureSymbol() {
        return gestureSymbol;
    }

    public void setGestureSymbol(String gestureSymbol) {
        this.gestureSymbol = gestureSymbol;
    }

    public String getGestureName() {
        return gestureName;
    }

    public void setGestureName(String gestureName) {
        this.gestureName = gestureName;
    }
}